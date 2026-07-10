# Proposal: Replace Effect RPC with HTTP Express transport

## Intent

The API ships three `@effect/rpc`/`@effect/platform*` packages and an `src/rpc/`
folder that are installed but never wired. `run-request.ts` couples the
`runPublic`/`runProtected` Effect runners to an `RpcContext` type that serves no
transport purpose, and `app.ts` exposes only `/health` with no way to reach
domain modules. The transport layer is unwired dead weight. We remove RPC and
wire the request lifecycle through standard Express while keeping Effect as deep
as possible: Express owns the socket, Effect owns the request program.

## Scope

### In Scope
- Delete `src/rpc/` (context.ts) and remove `@effect/rpc`, `@effect/platform`,
  `@effect/platform-node` from `package.json`.
- Decouple `run-request.ts`: `runPublic`/`runProtected` accept plain
  per-request data (`requestId`, `user`) instead of `RpcContext`.
- Move JWT/cookie parsing (`createRpcContext` logic) into an Express auth
  middleware that attaches `requestId` + `user` to `res.locals`.
- Add an Effect→Express adapter that maps the Effect error channel
  (`UnauthorizedError`, `ValidationError`) to HTTP status codes.
- Mount module routers (each module exports its own `express.Router()`) in
  `app.ts` under a prefix.

### Out of Scope (NON-GOALS)
- Implementing business logic in empty service/handler/repository stubs — they
  stay as-is (one-line stubs untouched).
- Adding a test runner (Vitest) or CI build/path-alias config.
- Fixing the `JWT_SECRET` hardcoded `"secret"` fallback in `auth.tokens.ts`.
- Resolving the Zod (`env.ts`) vs Effect Schema dual-validation concern.

## Capabilities

### New Capabilities
- `api-http-transport`: Express-based HTTP transport that adapts Effect programs
  into `RequestHandler`s, maps tagged errors to HTTP status, and mounts module
  routers.

### Modified Capabilities
- None.

## Approach

Express is the transport; Effect is the request lifecycle. An auth middleware
parses the `accessToken` cookie and verifies the JWT (logic lifted from
`createRpcContext`), writing `requestId` and `user | null` to `res.locals`. A
thin adapter (`makeHandler`) reads `res.locals`, calls `runPublic`/`runProtected`
with that data, runs the Effect against `AppLayer` + the request layer, and
translates the outcome: success → JSON body; typed failure → status via an
error→status map (`UnauthorizedError` → 401, `ValidationError` → 400, default →
500). The Effect layer stack (`AppLayer`, request layers, Context tags,
`auth.tokens`, `auth.cookies`) is preserved untouched. No stub is implemented;
routers wire only what already exists.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/rpc/context.ts` | Removed | RPC context deleted; parse logic migrates to middleware |
| `apps/api/src/runtime/run-request.ts` | Modified | Runners take `{requestId, user}` instead of `RpcContext` |
| `apps/api/src/app.ts` | Modified | Mount module routers under a prefix |
| `apps/api/package.json` | Modified | Remove 3 unused `@effect/*` packages |
| `packages/shared/src/auth/auth.rpc.ts` | Removed | Empty file deleted |
| `apps/api/src/middleware/*` (new) | New | Express auth middleware + Effect adapter |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `run-request.ts` signature change breaks callers | Low | Only `rpc/context.ts` (deleted) uses `RpcContext`; update the two references atomically |
| No tests to catch regressions | Med | Out of scope; keep the diff small and mechanical, verify `/health` + one wired route manually |
| `tsc` build needs path aliasing (`@/*`) | Low | Dev-time `tsx` unaffected; no CI build configured, defer |

## Rollback Plan

Single-commit change. Revert restores `src/rpc/context.ts`, the `RpcContext`
signatures in `run-request.ts`, the three `@effect/*` deps in `package.json`,
and the `/health`-only `app.ts`. No data or schema migration involved.

## Dependencies

- `express@^5.2.1` and `effect@3.21.2` (already installed).

## Success Criteria

- [ ] `src/rpc/` and the three `@effect/*` packages are gone; `pnpm install` clean.
- [ ] `run-request.ts` has no reference to `RpcContext`.
- [ ] Auth middleware sets `res.locals.requestId` and `res.locals.user`.
- [ ] Effect error channel maps to HTTP status via the adapter.
- [ ] `app.ts` mounts module routers; no stub logic was added.
