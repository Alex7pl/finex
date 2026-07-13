# Proposal: Global Notification/Toast System

## Intent

The web app has no global feedback surface. Errors show only inline (`FormAlert`) or full-page (`ErrorBoundary`), and non-form actions (background refresh, Effect handlers, out-of-tree services) have no way to tell users what happened. This adds a lightweight, zero-dependency toast system with an imperative `notify()` callable from anywhere — inside or outside React.

## Scope

### In Scope
- `notifications.ts`: module-level store, `notify()` API, `useNotifications()` hook (leaf module, no app imports)
- `ToastContainer.tsx`: fixed top-right portal, `useSyncExternalStore`, mounts in `App` (`root.tsx`)
- `Toast.tsx`: single item, CSS class-swap enter/exit (mirrors `AuthPanel`)
- 4 types (`success`/`error`/`info`/`warning`) with per-type default timeouts
- Max-3 stack, immediate FIFO eviction on overflow
- `app.css` toast keyframes; `role="status"` + `aria-live` a11y
- `http.ts` integration: `notify()` on unhandled non-401 `ApiError` only

### Out of Scope
- Persistent/sticky toasts, action buttons, progress bars, manual dismiss UI
- Toast history/center, queueing beyond the 3 visible slots, undo
- Replacing `FormAlert` or `ErrorBoundary`
- Component interaction tests (blocked by no-JSDOM runner gap)

## Capabilities

### New Capabilities
- `notifications`: global toast surface — imperative `notify()` API, module store, container/item rendering, type defaults, stacking, animations, and a11y contract.

### Modified Capabilities
- None (no existing specs; `http.ts` change is implementation-level, no spec behavior alters).

## Approach

Approach A from exploration — module-level mutable store + `useSyncExternalStore` (SSR snapshot `[]`).

- **API**: `notify(message: string, options?: { type?: ToastType; duration?: number }): string` returns the toast id. Convenience: `notify.success/error/info/warning(message, duration?)`.
- **Defaults** (ms): success 3000, info 4000, warning 5000, error 6000.
- **`ToastItem`**: `{ id: string; message: string; type: ToastType; duration: number; state: 'entering' | 'visible' | 'exiting' }`.
- **Stacking**: 3 visible max; a 4th evicts the oldest immediately (transition oldest to `exiting`, then remove).
- **Animation**: `toast-enter` / `toast-exit` keyframes, ~200ms, `ease-out` in / `ease-in` out; DOM removal delayed via `onAnimationEnd`; honors `prefers-reduced-motion`.
- **A11y**: container `aria-live="polite"`, each toast `role="status"` (`role="alert"`+`aria-live="assertive"` for `error`).
- **`http.ts`**: calls `notify()` only for unhandled non-401 `ApiError`; call sites keep owning form/route errors.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/app/libs/notifications.ts` | New | Store, `notify()`, hook |
| `apps/web/app/components/ui/ToastContainer.tsx` | New | Portal container |
| `apps/web/app/components/ui/Toast.tsx` | New | Toast item + animations |
| `apps/web/app/root.tsx` | Modified | Mount container in `App` |
| `apps/web/app/app.css` | Modified | Toast keyframes |
| `apps/web/app/libs/http.ts` | Modified | `notify()` on unhandled errors |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| SSR hydration mismatch | Low | `getServerSnapshot` returns `[]` |
| Circular import via `http.ts` | Med | `notifications.ts` stays a leaf; no app imports |
| Exit animation removal race | Med | `onAnimationEnd`/`setTimeout` matches CSS duration |
| z-index below auth panel (`z-30`) | Low | Container uses `z-50`+ |
| Interaction/timer tests unverifiable | High | Store unit-tested; interaction deferred (runner gap) |

## Rollback Plan

Remove the 3 new files, revert `root.tsx`, `app.css`, `http.ts`. Store is isolated; no data model, migration, or shared-package change — clean revert.

## Dependencies

- None (zero new packages).

## Success Criteria

- [ ] `notify()` importable and callable from React and non-React modules
- [ ] 4 types render top-right, stack max 3, oldest evicts on overflow
- [ ] Auto-dismiss uses per-type defaults; enter/exit animate cleanly
- [ ] `http.ts` surfaces unhandled non-401 errors via toast
- [ ] a11y roles/`aria-live` present; `prefers-reduced-motion` respected
- [ ] Store logic covered by `node:test` unit tests

## Review Workload Forecast

Estimated ~250–350 changed lines (3 small new files + 3 small edits). **400-line budget risk: Low.** Single PR expected; no chaining needed. Per `chained_pr_strategy: ask-always`, confirm only if apply-phase forecast crosses budget.

## Proposal Question Round

Delegated run — no live user channel. Product inputs were fully specified; these assumptions are resolved and flagged for user correction before spec:

1. **Overflow = immediate eviction**, not queue-and-wait (a 4th toast drops the oldest at once).
2. **`http.ts` scope is narrow**: only unhandled non-401 `ApiError`; 401 refresh and form/route errors stay silent at that layer.
3. **No manual dismiss** in v1 (auto-dismiss only), per requirements — flagged since users often expect a close affordance.
4. **`error` uses assertive live region**; other types polite.
