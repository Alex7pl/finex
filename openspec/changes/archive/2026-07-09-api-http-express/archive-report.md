# Archive Report — api-http-express

**Change**: api-http-express  
**Date**: 2026-07-09  
**Status**: ARCHIVED  
**Verdict**: Completed and verified PASS WITH WARNINGS (non-blocking)

---

## Summary

Successfully replaced Effect RPC with HTTP Express transport. The `@effect/rpc`, `@effect/platform`, and `@effect/platform-node` packages were removed. The request lifecycle now couples Express (socket layer) with Effect (program layer). Auth middleware parses JWT from cookies and writes `requestId` + `user | null` to `res.locals`. An Effect→Express adapter (`makeHandler`) maps typed errors to HTTP status codes. Module routers (`auth.router`, `users.router`) are wired into the main app under `/auth` and `/users` prefixes. All 13 tasks completed; TypeScript clean (0 new errors); build verified.

---

## What Was Built

### New Files Created
- `apps/api/src/middleware/auth.middleware.ts` — Express auth middleware that parses `accessToken` cookie, verifies JWT, sets `res.locals.requestId` and `res.locals.user`
- `apps/api/src/middleware/make-handler.ts` — Effect→Express adapter; curried `makeHandler(runPublic|runProtected)` factory that uses `Effect.runPromiseExit` + error mapping
- `apps/api/src/middleware/locals.d.ts` — TypeScript augmentation for `Express.Locals`
- `apps/api/src/modules/auth/auth.router.ts` — Auth module router (empty handlers; stubs remain untouched)
- `apps/api/src/modules/users/users.router.ts` — Users module router (empty handlers; stubs remain untouched)

### Files Modified
- `apps/api/src/runtime/run-request.ts` — Decoupled `runPublic` and `runProtected`; now accept `{ requestId: string; user: AuthenticatedUser | null }` instead of `RpcContext`
- `apps/api/src/app.ts` — Mounted auth middleware and module routers; removed dead RPC references

### Files Deleted
- `apps/api/src/rpc/context.ts` — RPC context removed (parse logic migrated to middleware)
- `packages/shared/src/auth/auth.rpc.ts` — Empty file deleted
- Removed from `apps/api/package.json`: `@effect/rpc`, `@effect/platform`, `@effect/platform-node`

---

## Key Decisions

### 1. Express owns socket, Effect owns program
- Auth and middleware concerns are plain async Express handlers
- Effect runtime enters only where domain logic needs the layer stack
- No Effect wrapper around pure JWT verification

### 2. Error mapping via `_tag` lookup
- `STATUS: Record<AppError["_tag"], number>` statically maps tagged errors
- `UnauthorizedError` → 401, `ValidationError` → 400, other/defect → 500
- Keeps `packages/shared` transport-agnostic

### 3. `makeHandler` uses `Effect.runPromiseExit`
- Distinguishes typed failures from defects via `Exit` and `Cause`
- Typed failures respond with mapped status; defects call `next(err)` for Express default handling

---

## Verification Evidence

### Task Completion
All 13 tasks marked complete:
- Phase 1 (Cleanup): 3/3
- Phase 2 (Foundation): 2/2
- Phase 3 (Core Middleware): 2/2
- Phase 4 (Module Routers): 2/2
- Phase 5 (Wiring): 1/1
- Phase 6 (Verification): 3/3 (manual/inspection)

### TypeScript Build
- `pnpm typecheck` in `apps/api`: 0 new errors
- 2 pre-existing stub errors in `auth.service.ts` (out of scope, unchanged)

### Spec Compliance
All 5 requirements met:
- ✓ Package Cleanup: `@effect/rpc`, `@effect/platform`, `@effect/platform-node` absent; zero import matches
- ✓ Dead File Deletion: `rpc/context.ts` and `auth.rpc.ts` deleted; zero import matches
- ✓ run-request Decoupling: `RequestData` type accepted; zero `RpcContext` references
- ✓ Auth Middleware: `authMiddleware` sets `res.locals` without rejecting unauthenticated requests
- ✓ Effect-to-Express Adapter: `makeHandler` factory with error mapping verified
- ✓ Module Router Wiring: Auth and users routers mounted; stubs unchanged

---

## Non-Blocking Issues

### Warning W1: Filename deviation (advisory)
- Spec called for `middleware/handler.ts`; implementation uses `middleware/make-handler.ts`
- Tasks explicitly specified `make-handler.ts`; design confirmed this
- No functional impact; export name `makeHandler` is correct
- **Action**: Spec can be updated if desired

### Warning W2: Type name in spec vs implementation
- Spec used `User | null`; implementation uses `AuthenticatedUser | null` from `runtime/request-context.ts`
- Design explicitly resolved this; not a functional issue
- **Action**: Spec can be updated for precision

### Suggestion S1: Empty `rpc/` directory
- `apps/api/src/rpc/` directory exists but is empty after deletion of `context.ts`
- No functional impact; can be removed in follow-up commit

### Suggestion S2: `@ts-expect-error` in make-handler.ts
- The `run(ctx, program)` call uses `@ts-expect-error` due to TypeScript R generic inference limits across the `runPublic|runProtected` union
- Expected and documented in apply-progress
- Runtime is correct; could be resolved with overload or explicit cast if desired

---

## Traceability

Engram observation IDs for full artifact history:
- Proposal: obs-id-366 (sdd/api-http-express/proposal)
- Spec: obs-id-367 (sdd/api-http-express/spec)
- Design: obs-id-368 (sdd/api-http-express/design)
- Tasks: obs-id-369 (sdd/api-http-express/tasks)
- Verify Report: obs-id-371 (sdd/api-http-express/verify-report)
- Archive Report: obs-id-{this-report} (sdd/api-http-express/archive-report)

---

## Residual Notes

1. **Pre-existing errors unchanged**: `auth.service.ts` stub errors (TS2391, TS7010) remain as-is per spec non-goals. These were present before the change.

2. **`@ts-expect-error` note**: The `makeHandler` implementation requires one `@ts-expect-error` suppression on the `run(ctx, program)` call due to TypeScript's treatment of the `R` generic parameter in the `runPublic|runProtected` union. This is expected and documented.

3. **Empty routers**: The auth and users routers are created but mount no handlers because all handlers are one-line stubs. This is intentional per spec ("stubs remain empty — routers wire only what already exists").

4. **`pnpm install` clean**: Removing the three `@effect/*` packages completed successfully; lockfile updated; no residual references.

---

## Rollback

Single-commit change. To revert:
- Restore `apps/api/src/rpc/context.ts`
- Restore `RpcContext` signatures in `run-request.ts`
- Restore three `@effect/*` deps in `package.json`
- Restore `/health`-only `app.ts`
- Delete new middleware and router files

No data or schema migration involved.

---

## SDD Cycle Complete

The change has been fully planned (proposal), specified (spec), designed (design), tasked (tasks), implemented and verified (apply + verify phases), and is now archived. Ready for the next change.
