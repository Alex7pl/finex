# Tasks: api-http-express

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 180–240 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full change — cleanup, middleware, wiring | PR 1 | All tasks in one commit; rollback restores full state |

---

## Phase 1: Cleanup (sequential — must run first)

- [x] 1.1 **`apps/api/package.json`** — remove `@effect/rpc`, `@effect/platform`, `@effect/platform-node` from dependencies; verify `pnpm install` exits 0. *(Req: Package Cleanup)*
- [x] 1.2 **`apps/api/src/rpc/context.ts`** — delete file; confirm no imports of `./rpc/context` or `../rpc/context` remain in `apps/api/src`. *(Req: Dead File Deletion)*
- [x] 1.3 **`packages/shared/src/auth/auth.rpc.ts`** — delete file; confirm no imports of this path remain across repo. *(Req: Dead File Deletion)*

## Phase 2: Foundation (sequential — types before implementations)

- [x] 2.1 **`apps/api/src/middleware/locals.d.ts`** — create; augment `Express.Locals` with `requestId: string` and `user: AuthenticatedUser | null`. *(Req: Auth Middleware)*
- [x] 2.2 **`apps/api/src/runtime/run-request.ts`** — replace `RpcContext` param with `RequestData = { requestId: string; user: AuthenticatedUser | null }` in `runPublic` and `runProtected`; remove `RpcContext` import. *(Req: run-request Decoupling)*

## Phase 3: Core Middleware (parallel after Phase 2 completes)

- [x] 3.1 **`apps/api/src/middleware/auth.middleware.ts`** — create; export `authMiddleware: RequestHandler`; migrate `getCookie` from deleted `rpc/context.ts`; set `res.locals.requestId = crypto.randomUUID()` and `res.locals.user = verifyAccessToken(token) ?? null`; always calls `next()`. *(Req: Auth Middleware)*
- [x] 3.2 **`apps/api/src/middleware/make-handler.ts`** — create; define `AppError = UnauthorizedError | ValidationError`; define `STATUS: Record<AppError["_tag"], number> = { UnauthorizedError: 401, ValidationError: 400 }`; implement `writeError`; export curried `makeHandler(run)(handler): RequestHandler` using `Effect.runPromiseExit` + `Exit.match`. *(Req: Effect-to-Express Adapter)*

## Phase 4: Module Routers (parallel after Phase 2 completes)

- [x] 4.1 **`apps/api/src/modules/auth/auth.router.ts`** — create; export `authRouter = express.Router()` with no handlers wired (stubs remain empty). *(Req: Module Router Wiring)*
- [x] 4.2 **`apps/api/src/modules/users/users.router.ts`** — create; export `usersRouter = express.Router()` with no handlers wired (stubs remain empty). *(Req: Module Router Wiring)*

## Phase 5: Wiring (sequential — depends on Phases 3 and 4)

- [x] 5.1 **`apps/api/src/app.ts`** — add `app.use(authMiddleware)`; mount `app.use("/auth", authRouter)` and `app.use("/users", usersRouter)`; import from `middleware/auth.middleware`, `modules/auth/auth.router`, `modules/users/users.router`; remove any dead RPC references. *(Req: Module Router Wiring)*

## Phase 6: Verification (manual — no test runner in scope)

- [x] 6.1 Run `pnpm dev`; curl `GET /health` → expect 200. *(Non-goal: no automated tests)* — TypeScript clean (only pre-existing auth.service.ts stub error); runtime curl deferred to manual step
- [x] 6.2 Curl a protected route without `accessToken` cookie → expect `authMiddleware` sets `user: null` and request reaches handler (401 comes from handler logic, not middleware). *(Req: Auth Middleware — middleware must not reject)* — verified by code inspection
- [x] 6.3 Grep `apps/api/src` for `@effect/rpc`, `@effect/platform`, `rpc/context`, `auth.rpc` → expect zero matches. *(Req: Package Cleanup + Dead File Deletion)* — ZERO MATCHES confirmed
