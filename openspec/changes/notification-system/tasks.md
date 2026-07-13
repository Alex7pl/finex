# Tasks: Global Notification/Toast System

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 280–360 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR (3 new files + 3 modified files) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

> Rationale: 3 new files (~180 lines) + test file (~130 lines) + edits to `root.tsx`, `app.css`, `http.ts` (~50 lines). Estimated total ~280–360 lines. Medium risk — at the ceiling but likely under 400. Monitor diff before opening PR; promote to chained PRs if tests push it over.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Store + tests + CSS + components + wiring | PR 1 | All files; include tests with implementation; monitor line count |

---

## Phase 1: Foundation — Store Module (TDD: RED first)

- [ ] 1.1 Create `apps/web/app/libs/notifications.ts` — declare types `ToastType`, `ToastItem`, `NotificationStore`; export empty stubs for `notify`, `useNotifications`, `getServerSnapshot`.
- [ ] 1.2 Create `apps/web/app/libs/notifications.test.ts` — write all 12 `node:test` failing RED tests using fake timers (`node:test` `mock.timers`):
  - test 1: `notify()` adds an item to the store
  - test 2: returned `id` is a non-empty string
  - test 3: default type is `"info"` when omitted
  - test 4: default duration matches per-type table (`success=3000`, `info=4000`, `warning=5000`, `error=6000`)
  - test 5: convenience aliases `.success/.error/.info/.warning` set correct type and duration
  - test 6: 4th `notify()` call evicts the oldest item (store stays at max 3)
  - test 7: evicted item transitions to `state="exiting"`
  - test 8: items are ordered newest-first (index 0 = most recent)
  - test 9: initial `state` on insert is `"entering"`
  - test 10: `getServerSnapshot()` returns `[]`
  - test 11: dismiss timer is scheduled only after `state` transitions to `"visible"`
  - test 12: item is removed from the store after dismiss timer fires

## Phase 2: Core Implementation — Store GREEN pass

- [ ] 2.1 Implement `NotificationStore` internals in `notifications.ts`: `items`, `subscribers`, `timers`, `subscribe()`, `getSnapshot()`, `getServerSnapshot()` (frozen `[]`).
- [ ] 2.2 Implement `beginExit(id)`: clear timer via `timers.delete`, set `state:'exiting'`, call `emit()`.
- [ ] 2.3 Implement `remove(id)`: clear any timer, drop from `items`, call `emit()`.
- [ ] 2.4 Implement `notify(message, options?)`: `crypto.randomUUID()` for id; evict oldest if `items.length >= 3` via `beginExit`; push `{id, message, type, duration, state:'entering'}`; schedule `timers.set(id, setTimeout(() => beginExit(id), duration))`; `emit()`. Return `id`.
- [ ] 2.5 Attach convenience aliases: `notify.success`, `notify.error`, `notify.info`, `notify.warning` — each calls `notify(message, { type, duration })`.
- [ ] 2.6 Implement `useNotifications()` using `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`.
- [ ] 2.7 Run `notifications.test.ts` — all 12 tests must be GREEN before proceeding.

## Phase 3: CSS Animations

- [ ] 3.1 Add `@keyframes toast-enter-kf` to `apps/web/app/app.css`: `from { opacity:0; transform:translateX(16px) scale(.98); } to { opacity:1; transform:none; }`.
- [ ] 3.2 Add `@keyframes toast-exit-kf`: `from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(16px); }`.
- [ ] 3.3 Add `.toast-enter` rule: `animation: toast-enter-kf 200ms cubic-bezier(0.22,1,0.36,1) both`.
- [ ] 3.4 Add `.toast-exit` rule: `animation: toast-exit-kf 180ms cubic-bezier(0.4,0,1,1) both; pointer-events:none`.
- [ ] 3.5 Add `@media (prefers-reduced-motion: reduce)` block: `.toast-enter, .toast-exit { animation-duration: 1ms; }`.

## Phase 4: Components

- [ ] 4.1 Create `apps/web/app/components/ui/` directory (does not exist yet — create with first file).
- [ ] 4.2 Create `apps/web/app/components/ui/Toast.tsx`: props `{ toast: ToastItem }`; class swap `toast.state === 'exiting' ? 'toast-exit' : 'toast-enter'`; `onAnimationEnd` calls `remove(toast.id)` only when `toast.state === 'exiting'`; per-type a11y: `error` → `role="alert" aria-live="assertive"`, others → `role="status"`; lucide-react icons `CheckCircle2` (success), `XCircle` (error), `Info` (info), `AlertTriangle` (warning); Tailwind color classes per type.
- [ ] 4.3 Create `apps/web/app/components/ui/ToastContainer.tsx`: calls `useNotifications()`; renders `[...items].reverse().slice(0, 3)`; container `div` with `fixed top-4 right-4 z-50 flex flex-col gap-2 aria-live="polite" aria-atomic="false"`; renders `<Toast>` per item; import path `@/libs/notifications.js`.

## Phase 5: Integration Wiring

- [ ] 5.1 Modify `apps/web/app/root.tsx`: add `import { ToastContainer } from "@/components/ui/ToastContainer.js"`; in `App` component render `<><Outlet /><ToastContainer /></>`.
- [ ] 5.2 Modify `apps/web/app/libs/http.ts`: add `import { notify } from "@/libs/notifications.js"` at top; at the final `!response.ok` throw site, call `notify.error(apiError.message)` before throwing when `response.status !== 401`.

## Phase 6: Verification

- [ ] 6.1 Run TypeScript check: `tsc --noEmit` from `apps/web/` — zero errors expected.
- [ ] 6.2 Run store unit tests: `node --test apps/web/app/libs/notifications.test.ts` — all 12 pass.
- [ ] 6.3 Manual smoke: start dev server, trigger a non-401 API error, verify toast appears top-right with correct color/icon and auto-dismisses.
- [ ] 6.4 Manual smoke: trigger 4 rapid errors, verify max 3 toasts visible, oldest evicted.
- [ ] 6.5 Verify SSR: check that no toast markup appears in the server-rendered HTML (`getServerSnapshot` returns `[]`).
