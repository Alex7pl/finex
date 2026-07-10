# Design: Replace Effect RPC with HTTP Express transport

## Technical Approach

Express owns the socket; Effect owns the request program. Two new files in
`src/middleware/`: an `authMiddleware` (plain async — no Effect) that parses the
`accessToken` cookie, verifies the JWT, and writes `requestId` + `user | null`
to `res.locals`; and a `makeHandler` adapter that lifts an Effect program into an
Express `RequestHandler`, runs it against `AppLayer` + the request layer via
`runPublic`/`runProtected`, and translates the outcome to HTTP. `run-request.ts`
drops `RpcContext` for a plain `{ requestId, user }` param. Module routers export
`express.Router()`; `app.ts` mounts them. Stubs stay empty — routers wire only
existing symbols.

## Architecture Decisions

### Decision: `makeHandler` runs the Effect via `Effect.runPromiseExit`

**Choice**: `makeHandler` is a curried factory. It takes a `run` selector
(`runPublic | runProtected`) and returns a function taking the Effect-producing
handler. It reads `res.locals`, builds the program, and executes with
`Effect.runPromiseExit`, branching on `Exit`.

```ts
type HandlerCtx = { requestId: string; user: AuthenticatedUser | null };
type EffectHandler<A> = (req, ctx: HandlerCtx) => Effect.Effect<A, AppError, RequestContext | CurrentUser | Database>;

const makeHandler = (run) => <A>(handler: EffectHandler<A>): RequestHandler =>
  async (req, res, next) => {
    const ctx = { requestId: res.locals.requestId, user: res.locals.user };
    const exit = await Effect.runPromiseExit(run(ctx, handler(req, ctx)));
    Exit.match(exit, { onSuccess: (a) => res.json(a), onFailure: (cause) => writeError(res, next, cause) });
  };
```

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `runPromiseExit` + `Exit`/`Cause` | Distinguishes typed failure from defect | Chosen — clean map for expected errors, `next(err)` for defects |
| `runPromise` + try/catch | Loses typed/defect distinction; all become throws | Rejected |
| `runFork`/manual interrupt | No cancellation requirement yet | Rejected — YAGNI |

**Rationale**: `Exit` preserves the Effect error channel so `Cause.failureOption`
yields the tagged error for status mapping; defects fall through to Express
`next(err)`.

### Decision: Error mapping via `_tag` lookup with a status record

**Choice**: A `Record<AppError["_tag"], number>` maps tagged errors to status.
`writeError` extracts the failure from the `Cause`; if present and known, respond
with that status + a serialized body; unknown failure or defect → `next(cause)`
(Express default 500).

```ts
const STATUS: Record<AppError["_tag"], number> = {
  UnauthorizedError: 401,
  ValidationError: 400,
};
```

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `_tag` → status record | O(1), exhaustive via union type, additive | Chosen |
| `Match.tag` expression | More ceremony for a flat map | Rejected |
| per-error `.toResponse()` | Couples shared errors to HTTP | Rejected — errors stay transport-agnostic |

**Rationale**: `Schema.TaggedError` already carries `_tag`; a typed record forces
compile-time coverage and keeps `packages/shared` free of HTTP concerns.
`AppError = UnauthorizedError | ValidationError` is defined once in the adapter.

### Decision: `authMiddleware` is plain async, not Effect

**Choice**: `authMiddleware: RequestHandler` uses `crypto.randomUUID()` and the
existing synchronous `verifyAccessToken` (from `auth.tokens.ts`). No Effect
runtime is entered here.

**Rationale**: `verifyAccessToken` is a pure sync function returning
`AccessTokenPayload | null`; wrapping middleware in an Effect runtime adds a
runtime boundary with zero benefit. Effect starts at `makeHandler`, where the
domain program actually needs the layer stack. The `getCookie` helper migrates
verbatim from the deleted `rpc/context.ts`.

## Data Flow

    HTTP request
        │
        ▼
    express.json / cors
        │
        ▼
    authMiddleware ──► res.locals.requestId = uuid
        │              res.locals.user = verify(cookie) | null
        ▼
    router → makeHandler(runPublic|runProtected)(effectHandler)
        │
        ▼
    runPublic/runProtected  ── provide ──► AppLayer + requestLayer
        │
        ▼
    Effect.runPromiseExit
        ├── Success ──────────────► res.json(value)
        └── Failure(Cause)
              ├── tagged AppError ► res.status(STATUS[_tag]).json(body)
              └── defect ─────────► next(cause)  (Express 500)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/middleware/auth.middleware.ts` | Create | `authMiddleware` + migrated `getCookie`; sets `res.locals` |
| `apps/api/src/middleware/make-handler.ts` | Create | Effect→Express adapter, `AppError` union, `STATUS` map, `writeError` |
| `apps/api/src/middleware/locals.d.ts` | Create | Augments `Express.Locals` with `requestId: string; user: AuthenticatedUser \| null` |
| `apps/api/src/runtime/run-request.ts` | Modify | `runPublic`/`runProtected` take `{ requestId, user }`; drop `RpcContext` import |
| `apps/api/src/app.ts` | Modify | `app.use(authMiddleware)`; mount module routers under a prefix |
| `apps/api/src/rpc/context.ts` | Delete | Parse logic migrated to `auth.middleware.ts` |
| `packages/shared/src/auth/auth.rpc.ts` | Delete | Empty file |
| `apps/api/package.json` | Modify | Remove `@effect/rpc`, `@effect/platform`, `@effect/platform-node` |

Module routers (`*.router.ts`) are created ONLY if a module has a non-stub
handler to wire. Given all handlers are empty one-line stubs, `app.ts` mounts a
router only where a real symbol exists; the mount plumbing (prefix + import) is
proven with `/health` and any already-implemented handler. No stub is filled.

## Interfaces / Contracts

```ts
// run-request.ts — new signatures (RpcContext removed)
type RequestData = { requestId: string; user: AuthenticatedUser | null };
function runPublic<A, E, R>(data: RequestData, program: Effect.Effect<A, E, R>): Effect.Effect<A, E, Exclude<R, RequestContext | Database>>;
function runProtected<A, E, R>(data: RequestData, program: Effect.Effect<A, E, R>): Effect.Effect<A, E | UnauthorizedError, ...>;

// Module router shape (each module that wires anything)
// e.g. apps/api/src/modules/users/users.router.ts
export const usersRouter: express.Router = express.Router();
// usersRouter.get("/", makeHandler(runProtected)(usersHandler));  // only if handler exists

// app.ts mount
app.use(authMiddleware);
app.use("/api/users", usersRouter);
```

`AuthenticatedUser` is imported from `runtime/request-context.ts` (NOT shared).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | none automated | No test runner in scope |
| Integration | none automated | Out of scope |
| Manual | `/health` 200; one wired route returns JSON; missing/invalid cookie on a protected route → 401 | curl after `pnpm dev` |

## Migration / Rollout

No migration required. Single-commit change; revert restores `rpc/context.ts`,
`RpcContext` signatures, the three `@effect/*` deps, and `/health`-only `app.ts`.

## Open Questions

- [ ] Router mount prefix (`/api` vs `/`) — pick `/api` unless the orchestrator
      specifies otherwise. Non-blocking.
