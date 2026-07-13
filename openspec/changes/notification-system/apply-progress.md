# Apply Progress: Global Notification/Toast System

**Status**: done  
**Completed**: 2026-07-12  
**Executor**: sdd-apply (claude-sonnet-4-6)

---

## Tasks Completed

### Phase 1: Foundation — Store Module (TDD: RED first)

- [x] 1.1 Create `apps/web/app/libs/notifications.ts` — types `ToastType`, `ToastItem`; stubs for `notify`, `useNotifications`, `getServerSnapshot`, `markVisible`, `remove`, `beginExit`.
- [x] 1.2 Create `apps/web/app/libs/notifications.test.ts` — 12 `node:test` tests covering all required store behaviors.

### Phase 2: Core Implementation — Store GREEN pass

- [x] 2.1 Implement `NotificationStore` internals: `items`, `subscribers`, `timers`, `subscribe()`, `getSnapshot()`, `getServerSnapshot()`.
- [x] 2.2 Implement `beginExit(id)`: clear timer, set `state:'exiting'`, emit.
- [x] 2.3 Implement `remove(id)`: clear timer, drop from `items`, emit.
- [x] 2.4 Implement `markVisible(id)`: transition `entering → visible`, schedule dismiss timer (`setTimeout → beginExit`).
- [x] 2.5 Implement `notify(message, options?)`: `crypto.randomUUID()` for id; evict oldest if `items.length >= 3` via `beginExit`; prepend `{state:'entering'}`; emit. Return `id`.
- [x] 2.6 Attach convenience aliases: `notify.success`, `notify.error`, `notify.info`, `notify.warning`.
- [x] 2.7 Implement `useNotifications()` using `useSyncExternalStore`.
- [x] 2.7 Run — all 12 tests GREEN (confirmed: 33/33 total suite pass).

### Phase 3: CSS Animations

- [x] 3.1 Add `@keyframes toast-enter-kf` to `apps/web/app/app.css`.
- [x] 3.2 Add `@keyframes toast-exit-kf`.
- [x] 3.3 Add `.toast-enter` rule.
- [x] 3.4 Add `.toast-exit` rule.
- [x] 3.5 Add `@media (prefers-reduced-motion: reduce)` block.

### Phase 4: Components

- [x] 4.1 Created `apps/web/app/components/ui/` directory.
- [x] 4.2 Created `apps/web/app/components/ui/Toast.tsx` — class-swap animation, `onAnimationEnd` calls `markVisible`/`remove`, per-type a11y, lucide-react icons, Tailwind color classes.
- [x] 4.3 Created `apps/web/app/components/ui/ToastContainer.tsx` — `useNotifications()`, renders newest 3 items, `fixed top-4 right-4 z-50`, `aria-live="polite" aria-atomic="false"`.

### Phase 5: Integration Wiring

- [x] 5.1 Modified `apps/web/app/root.tsx` — imported `ToastContainer`; rendered `<><Outlet /><ToastContainer /></>`.
- [x] 5.2 Modified `apps/web/app/libs/http.ts` — added `import { notify } from "@/libs/notifications.js"`; calls `notify.error(error.message)` for non-401, non-SSR responses before throwing.

### Phase 6: Verification

- [x] 6.1 TypeScript check: `pnpm --filter @finex/web typecheck` — zero errors.
- [x] 6.2 Store unit tests: all 12 pass (33/33 total suite).
- [ ] 6.3 Manual smoke: dev server not started (requires manual verification).
- [ ] 6.4 Manual smoke: 4-toast eviction (requires manual verification).
- [ ] 6.5 SSR verification (requires manual verification).

### Fix Batch (2026-07-12) — Confirmed Bugs

- [x] FIX 1 — BLOCKER: Evicted toasts no longer leak in store. In `notifications.ts` eviction path, after `beginExit(evictedId)`, added `setTimeout(() => remove(evictedId), 210)` so cleanup runs regardless of whether the toast component is mounted/rendered.
- [x] FIX 2 — BLOCKER: `onAnimationEnd` in `Toast.tsx` now has explicit early-return guard. Handler checks `entering` → `markVisible`, `exiting` → `remove`, any other state (e.g. `visible`) → no-op. Order changed to check `entering` first (safe re-ordering; logic equivalent).
- [x] FIX 3 — CRITICAL: Added `toast-visible` CSS class. `STATE_CLASS` record in `Toast.tsx` maps all three states to distinct classes: `entering → toast-enter`, `visible → toast-visible`, `exiting → toast-exit`. Added `.toast-visible { opacity: 1; }` rule to `app.css` — no animation, just a stable settled state.
- [x] FIX 4 — CRITICAL: Added two `notify.error` contract tests to `http.test.ts`. Tests spy on `notify.error` by property mutation on the shared module object (ESM module cache ensures same reference). "calls notify.error for non-401 API errors" and "does not call notify.error for 401 API errors" — both pass.
- [x] FIX 5 — CRITICAL: Renamed test 12 in `notifications.test.ts` from "item is removed from store after dismiss timer fires" to "dismiss timer transitions item to exiting state; remove() clears it from store" — accurate description of the two-step lifecycle.

---

## Key Design Deviations

1. **`markVisible(id)` added**: the spec test 11 requires the dismiss timer to start only after `state` transitions to `"visible"`, not at `notify()` time. The design text described scheduling in `notify()`, but the spec takes precedence. `Toast.tsx` calls `markVisible(id)` from `onAnimationEnd` when `state === "entering"`.

2. **`_getItems()` test helper exposed**: added alongside `_resetStore()` to allow store inspection in unit tests without going through `useSyncExternalStore`.

3. **Fix 4 uses property mutation spy (not `mock.module`)**: Node v26 + tsx 4.x `t.mock.module` is not available in the test runner context. ESM module caching guarantees that `http.ts` and the test file share the same `notify` object, so mutating `notify.error` as a property spy is valid and confirmed working.

---

## Files Changed

| File | Action |
|------|--------|
| `apps/web/app/libs/notifications.ts` | Created + Fix 1 |
| `apps/web/app/libs/notifications.test.ts` | Created + Fix 5 |
| `apps/web/app/components/ui/Toast.tsx` | Created + Fix 2 + Fix 3 |
| `apps/web/app/components/ui/ToastContainer.tsx` | Created |
| `apps/web/app/root.tsx` | Modified |
| `apps/web/app/app.css` | Modified + Fix 3 (`.toast-visible`) |
| `apps/web/app/libs/http.ts` | Modified |
| `apps/web/app/libs/http.test.ts` | Modified + Fix 4 |

---

## Test Results (final)

- Tests: 35 / 35 pass (was 33 before fix batch — +2 new http notify tests)
- TypeScript: zero errors
