# Design: Global Notification/Toast System

## Technical Approach

Approach A from exploration: a module-level mutable store in `notifications.ts` (leaf, zero app imports) exposing an imperative `notify()` plus a `useNotifications()` hook built on `useSyncExternalStore`. `ToastContainer` mounts once inside `App` (`root.tsx`), subscribes to the store, and renders the newest 3 items via `Toast`, which mirrors the `AuthPanel` CSS class-swap enter/exit pattern. `http.ts` calls `notify()` only for unhandled non-401 `ApiError`. No new deps; `lucide-react` (already installed) supplies icons.

> Correction: project alias is `@/*` → `./app/*` with `.js` extensions (see `apps/web/tsconfig.json`). Import path is `@/libs/notifications.js`, not `~/libs/notifications`.

## Architecture Decisions

### Decision: External store over Context
**Choice**: Module singleton + `useSyncExternalStore`.
**Alternatives**: Context+useReducer; third-party (sonner).
**Rationale**: `notify()` must fire from `http.ts` (out of tree). Context can't. Matches the no-lib project convention; SSR-safe via `getServerSnapshot → []`.

### Decision: FIFO eviction, no queue
**Choice**: 4th toast transitions oldest to `exiting` immediately, then removes it.
**Rationale**: Confirmed product decision; simpler state, no backlog.

### Decision: Exit via `onAnimationEnd`, not timer
**Choice**: Removal driven by `Toast`'s `onAnimationEnd` when `state === 'exiting'`.
**Alternatives**: `AuthPanel`'s `setTimeout(260ms)` timer.
**Rationale**: Self-synchronizing with CSS duration; no magic-number drift. `prefers-reduced-motion` shortens the keyframe to ~1ms so the event still fires promptly.

### Decision: Narrow `http.ts` scope
**Choice**: `notify()` only on unhandled non-401 `ApiError` at the final throw site. 401 refresh and call-site form/route errors stay silent here.

## Data Flow

    notify() ─┬─> store.items (mutate) ──> emit()
              └─> setTimeout(duration) ──> beginExit(id)
    emit() ──> useSyncExternalStore ──> ToastContainer re-render
    ToastContainer ──(newest 3)──> Toast ──onAnimationEnd──> store.remove(id)
    http.ts (unhandled ApiError) ──> notify.error(...)

Store is the single source of truth; `notify` is callable from React and non-React code alike.

## Interfaces / Contracts

```ts
export type ToastType = "success" | "error" | "info" | "warning";
export interface ToastItem {
  id: string; message: string; type: ToastType;
  duration: number; state: "entering" | "visible" | "exiting";
}
interface NotificationStore {
  items: ToastItem[];
  subscribers: Set<() => void>;
  timers: Map<string, ReturnType<typeof setTimeout>>;
}
export function notify(message: string, options?: { type?: ToastType; duration?: number }): string;
// notify.success/error/info/warning(message, duration?)
export function useNotifications(): ToastItem[];
```

Defaults (ms): success 3000, info 4000, warning 5000, error 6000. `MAX_VISIBLE = 3`.

**Store internals**:
- `subscribe(cb)`: adds to `subscribers`, returns unsubscribe.
- `getSnapshot()`: returns `items` (stable reference; only replaced on mutation). `getServerSnapshot()`: returns a frozen empty array constant.
- `notify()`: `id = crypto.randomUUID()`; if `items.length >= 3`, `beginExit(oldestVisibleId)` first; push `{state:'entering'}`; schedule `timers.set(id, setTimeout(() => beginExit(id), duration))`; `emit()`.
- `beginExit(id)`: clear its timer (`timers.delete`), set `state:'exiting'`, `emit()`.
- `remove(id)`: clear any timer, drop from `items`, `emit()`.
- Timer cleanup on eviction prevents a stale dismissal timer firing `beginExit` on a reused/removed id.

## Component Design

**`ToastContainer.tsx`** — `useNotifications()` for items; renders newest-first via `[...items].reverse().slice(0, 3)`. No `createPortal` needed: it mounts in `App` alongside `<Outlet />`, so it's already at the document root and SSR-renders the empty snapshot cleanly (portal would add an SSR/hydration hazard for no benefit). Container: `fixed top-4 right-4 z-50 flex flex-col gap-2` with `aria-live="polite"` region wrapper.

**`Toast.tsx`** — props `{ toast: ToastItem }`. Class swap: `toast.state === 'exiting' ? 'toast-exit' : 'toast-enter'` (mirrors AuthPanel's `closing ? exit : enter`). `onAnimationEnd={() => { if (toast.state === 'exiting') remove(toast.id) }}`. Per-toast a11y: `error` → `role="alert" aria-live="assertive"`; others → `role="status" aria-live="polite"`. Icons via `lucide-react`: `CheckCircle2` (success), `AlertCircle`/`XCircle` (error), `Info` (info), `AlertTriangle` (warning).

Type → Tailwind color map:
| Type | Classes |
|------|---------|
| success | `border-green-200 bg-green-50 text-green-800` |
| error | `border-red-200 bg-red-50 text-red-800` |
| info | `border-blue-200 bg-blue-50 text-blue-800` |
| warning | `border-amber-200 bg-amber-50 text-amber-800` |

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/web/app/libs/notifications.ts` | Create | Store, `notify()`, `useNotifications()` — leaf module |
| `apps/web/app/components/ui/ToastContainer.tsx` | Create | Fixed top-right container, subscribes via hook |
| `apps/web/app/components/ui/Toast.tsx` | Create | Single item, class-swap animation, icon + color |
| `apps/web/app/root.tsx` | Modify | Render `<ToastContainer />` after `<Outlet />` in `App` |
| `apps/web/app/app.css` | Modify | `toast-enter-kf`/`toast-exit-kf` keyframes + reduced-motion |
| `apps/web/app/libs/http.ts` | Modify | `notify.error()` at final unhandled non-401 throw |

**`app.css`** additions:
```css
@keyframes toast-enter-kf { from { opacity:0; transform:translateX(16px) scale(.98);} to { opacity:1; transform:translateX(0) scale(1);} }
@keyframes toast-exit-kf  { from { opacity:1; transform:translateX(0);} to { opacity:0; transform:translateX(16px);} }
.toast-enter { animation: toast-enter-kf 200ms cubic-bezier(0.22,1,0.36,1) both; }
.toast-exit  { animation: toast-exit-kf 180ms cubic-bezier(0.4,0,1,1) both; pointer-events:none; }
@media (prefers-reduced-motion: reduce) {
  .toast-enter, .toast-exit { animation-duration: 1ms; }
}
```

**`root.tsx`**: import `{ ToastContainer } from "@/components/ui/ToastContainer.js"`; render `<><Outlet /><ToastContainer /></>` inside `App`.

**`http.ts`**: at the final `if (!response.ok)` block (line ~129), after building `ApiError`, call `notify.error(...)` for non-401 before throwing — via top-of-file `import { notify } from "@/libs/notifications.js"`.

## Circular Import Analysis

Import graph is acyclic — `notifications.ts` imports only `react`:

    react ──> notifications.ts <── http.ts
                    ^     ^
                    │     └── ToastContainer.tsx ──> Toast.tsx
                    └── (no imports from http.ts / app modules)

`notifications.ts` MUST NOT import `http.ts`, route handlers, or any app module. `http.ts → notifications.ts` is one-directional; no cycle.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Store: notify/eviction/timer cleanup/snapshot stability | `node:test` + `node:assert`, fake timers |
| Render | Container/Toast static markup, a11y roles | `renderToStaticMarkup` |
| Interaction | Timers/animation/user events | Deferred — no JSDOM runner (project-wide gap) |

## Migration / Rollout

No migration. Remove 3 files, revert `root.tsx`/`app.css`/`http.ts` for clean rollback.

## Open Questions

- [ ] Confirm `error` icon: `AlertCircle` vs `XCircle` (cosmetic).
