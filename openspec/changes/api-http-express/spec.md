# api-http-transport Specification

## Purpose

Express-based HTTP transport for the `apps/api` server. Express owns the socket;
Effect owns the request lifecycle. This spec covers the removals, structural
changes, and new middleware/adapter that wire Effect programs into Express
`RequestHandler`s.

---

## Requirements

### Requirement: Package Cleanup

The `apps/api/package.json` MUST NOT contain `@effect/rpc`, `@effect/platform`,
or `@effect/platform-node` as direct dependencies. Running `pnpm install` MUST
succeed after removal. No import of those packages MUST exist anywhere in the
`apps/api` source tree.

#### Scenario: Packages removed and install succeeds

- GIVEN `@effect/rpc`, `@effect/platform`, and `@effect/platform-node` are listed in `apps/api/package.json`
- WHEN those three entries are deleted and `pnpm install` is executed
- THEN `pnpm install` exits with code 0
- AND no lockfile reference to those packages remains for `apps/api`

#### Scenario: No import reference survives

- GIVEN the package entries are removed from `package.json`
- WHEN the `apps/api/src` tree is searched for imports of those packages
- THEN zero matches are found

---

### Requirement: Dead File Deletion

`apps/api/src/rpc/context.ts` and `packages/shared/src/auth/auth.rpc.ts` MUST
be deleted. No file in the repository MUST import from either deleted path after
deletion.

#### Scenario: RPC context file deleted with no remaining consumers

- GIVEN `apps/api/src/rpc/context.ts` exists and exports `RpcContext`
- WHEN the file is deleted
- THEN no file in `apps/api/src` imports from `./rpc/context` or `../rpc/context`

#### Scenario: Shared auth RPC file deleted with no remaining consumers

- GIVEN `packages/shared/src/auth/auth.rpc.ts` exists
- WHEN the file is deleted
- THEN no file in `packages/shared` or `apps/api` imports from that path

---

### Requirement: run-request Decoupling

`runPublic` and `runProtected` in `apps/api/src/runtime/run-request.ts` MUST
accept a plain per-request object `{ requestId: string; user: User | null }`
instead of `RpcContext`. No import of `RpcContext` MUST remain in that file.

#### Scenario: runPublic called with plain context

- GIVEN `runPublic` accepts `{ requestId: string; user: null }`
- WHEN an Effect program is passed alongside that context object
- THEN the function compiles without reference to `RpcContext`
- AND the Effect program receives `requestId` and `user` through the request layer

#### Scenario: runProtected called with authenticated context

- GIVEN `runProtected` accepts `{ requestId: string; user: User }`
- WHEN an Effect program is passed alongside a context object with a non-null `user`
- THEN the function compiles without reference to `RpcContext`

---

### Requirement: Auth Middleware

`apps/api/src/middleware/auth.middleware.ts` MUST export an Express
`RequestHandler` that reads the `accessToken` cookie, attempts JWT verification,
and writes `res.locals.requestId` (a UUID string) and `res.locals.user`
(`User | null`) before calling `next()`. The middleware MUST NOT reject
unauthenticated requests — missing or invalid tokens result in `user: null`,
not an error response.

#### Scenario: Valid access token

- GIVEN a request arrives with a valid `accessToken` cookie
- WHEN the auth middleware executes
- THEN `res.locals.user` is set to the decoded `User` object
- AND `res.locals.requestId` is set to a non-empty UUID string
- AND `next()` is called

#### Scenario: Missing or invalid access token

- GIVEN a request arrives with no `accessToken` cookie, or with a malformed/expired token
- WHEN the auth middleware executes
- THEN `res.locals.user` is `null`
- AND `res.locals.requestId` is set to a non-empty UUID string
- AND `next()` is called without sending an error response

#### Scenario: Middleware does not reject unauthenticated requests

- GIVEN a request with no `accessToken` cookie
- WHEN the auth middleware executes
- THEN the response status is NOT set by the middleware
- AND control is passed to the next handler

---

### Requirement: Effect-to-Express Adapter

`apps/api/src/middleware/handler.ts` MUST export a `makeHandler` function that
wraps an Effect program as an Express `RequestHandler`. It MUST read
`res.locals.requestId` and `res.locals.user`, delegate execution to
`runPublic` or `runProtected`, and translate the Effect outcome:
success → `res.json(value)` with 200; `UnauthorizedError` → 401;
`ValidationError` → 400; any other defect or tagged error → 500.

#### Scenario: Effect program succeeds

- GIVEN a handler wrapping an Effect program that resolves to a value
- WHEN the handler is invoked with a valid request
- THEN the response status is 200
- AND the body is the JSON-serialised success value

#### Scenario: Effect program fails with UnauthorizedError

- GIVEN a handler wrapping an Effect program that fails with `UnauthorizedError`
- WHEN the handler is invoked
- THEN the response status is 401

#### Scenario: Effect program fails with ValidationError

- GIVEN a handler wrapping an Effect program that fails with `ValidationError`
- WHEN the handler is invoked
- THEN the response status is 400

#### Scenario: Effect program fails with an unrecognised error

- GIVEN a handler wrapping an Effect program that fails with a defect or unrecognised tagged error
- WHEN the handler is invoked
- THEN the response status is 500

---

### Requirement: Module Router Wiring

Each module under `apps/api/src` (`auth`, `users`) MUST export a named
`router` of type `express.Router`. `apps/api/src/app.ts` MUST mount those
routers at `/auth` and `/users` prefixes respectively. No route handler business
logic MUST be implemented beyond what already exists in the stubs.

#### Scenario: Auth router mounted

- GIVEN `apps/api/src/auth/auth.router.ts` exports `router: express.Router`
- WHEN `app.ts` is loaded
- THEN `app.use('/auth', authRouter)` is in effect

#### Scenario: Users router mounted

- GIVEN `apps/api/src/users/users.router.ts` exports `router: express.Router`
- WHEN `app.ts` is loaded
- THEN `app.use('/users', usersRouter)` is in effect

#### Scenario: Stubs remain empty

- GIVEN any handler or service file that was a one-line stub before this change
- WHEN the router is mounted
- THEN the stub file is unchanged — no business logic is added

---

## Non-Goals (Explicit Exclusions)

- Business logic inside any service, handler, or repository stub.
- Test runner setup (Vitest or any other).
- Fixing the `JWT_SECRET` hardcoded fallback in `auth.tokens.ts`.
- Resolving the `env.ts` Zod vs Effect Schema dual-validation concern.
