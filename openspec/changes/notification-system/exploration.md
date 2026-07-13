## Exploration: Global Notification/Toast System

### Current State

The web app (`apps/web`) is a React Router 7 SSR application using React 19, Tailwind CSS 4, and Effect. There is no existing toast, notification, alert, or modal system beyond per-component inline feedback. Error feedback is handled inline at two surfaces:

1. **Route-level errors** (`error-boundary.tsx`): full-page `ErrorBoundary` catching `isRouteErrorResponse` failures surfaced by `routeHandler`. Not dismissible or toast-like.
2. **Form-level feedback** (`AuthForms.tsx`, `AuthUi.tsx`): `FormAlert` renders inline `role="alert"` divs inside forms showing field/form errors from `clientAction`. Errors are co-located in the UI, not global.

The HTTP layer (`libs/http.ts`) uses a custom `createHttp` factory. On 401 it auto-refreshes silently; on other errors it throws `ApiError`. The `routeHandler` wrapper converts `ApiError` to React Router `data()` objects or redirects. Neither layer calls any global notification surface.

**No state management library** (zustand, redux, jotai, etc.) is present. State is entirely local React (`useState`/`useEffect`/`useRef`) or React Router's fetcher/action pattern.

**No animation library** (framer-motion, react-spring, etc.) is installed. All existing animations are CSS `@keyframes` in `app.css`, toggled via class swaps (`auth-panel-enter`/`auth-panel-exit` pattern). `prefers-reduced-motion` is respected.

**Testing**: Node.js built-in `node:test` + `node:assert/strict`. Tests are co-located. No RTL, no jsdom — components are tested with `renderToStaticMarkup`.

**App entry point**: `apps/web/app/root.tsx` exports a `Layout` function wrapping `{children}` in `<html>/<body>` and an `App` component rendering `<Outlet />`. This is the canonical place for a global notification container.

### Affected Areas

- `apps/web/app/root.tsx` — global App/Layout; notification container renders here
- `apps/web/app/app.css` — CSS keyframe animations; toast enter/exit keyframes added here
- `apps/web/app/libs/http.ts` — imperative `http` singleton; `notify()` called here for unhandled errors
- `apps/web/app/libs/route-handler.ts` — may optionally call `notify()` for non-fatal API errors
- New files:
  - `apps/web/app/libs/notifications.ts` — store + `notify()` imperative API + `useNotifications()` hook
  - `apps/web/app/components/ui/ToastContainer.tsx` — React rendering layer, mounts in root
  - `apps/web/app/components/ui/Toast.tsx` — individual toast item with class-swap animations

### Approaches

| Approach | Pros | Cons | Effort |
|----------|------|------|--------|
| **A. Module-level store + `useSyncExternalStore`** | Zero deps; idiomatic React 18/19 external store API; callable from any non-React context; SSR-safe; matches existing pattern | Manual subscriber management | Low |
| **B. React Context + useReducer** | Idiomatic React; testable | Out-of-tree calls require module-level ref (defeating the context); provider-mount race | Low-Medium |
| **C. Third-party library (sonner, react-hot-toast)** | Battle-tested; accessible | New dependency; SSR hydration audit required; style mismatch with existing CSS pattern | Low-install, Medium-integration |

### Recommendation

**Approach A — Module-level mutable store with `useSyncExternalStore`.**

The existing codebase establishes a no-third-party-library pattern for UI concerns and uses CSS keyframes for all animations. Approach A fits this pattern exactly. `useSyncExternalStore` is the React-official primitive for subscribing React to an external store. It is SSR-safe (server snapshot returns `[]`). The `notify()` API is a pure module import callable from `http.ts`, Effect error handlers, or any service without React context.

**Implementation layout**:
```
apps/web/app/
├── libs/
│   └── notifications.ts        ← store + notify() + useNotifications()
└── components/
    └── ui/
        ├── ToastContainer.tsx   ← mounts in App (root.tsx), reads store via useSyncExternalStore
        └── Toast.tsx            ← single toast item with CSS-class-swap animations
```

`notify(message, options)` pushes to the store with a UUID, schedules auto-dismiss via `setTimeout`. `ToastContainer` renders a fixed `top-right` portal, stacks max 3. Each `Toast` applies an enter class on mount and an exit class before removal — mirroring the `AuthPanel` pattern exactly.

### Risks

- **SSR hydration mismatch**: `notify()` called during SSR produces a 0-toast server render vs. a potential 1-toast client. Mitigated by `useSyncExternalStore` `getServerSnapshot` returning `[]`.
- **No component interaction tests**: the project test runner (Node.js `node:test` + `renderToStaticMarkup`) cannot test timers or user events without JSDOM. This is a known project-wide gap per `openspec/config.yaml`. Unit tests cover store logic; interaction/animation tests are deferred.
- **Exit animation timing**: CSS-class-swap exit requires delaying DOM removal via `onAnimationEnd` or `setTimeout` matching CSS duration — same proven pattern as `AuthPanel`.
- **z-index**: auth panel uses `z-30`. Toast container MUST use `z-50` or higher.
- **Circular import**: notifications module must be a leaf (no imports from `http.ts` or app modules) to avoid circular dependencies when `http.ts` imports `notify()`.

### Ready for Proposal

Yes. Approach is clear, zero-dependency, and consistent with all existing patterns. The proposal phase should define the exact `notify()` API shape, the 4 toast types and their default timeouts, the max-3-stack constraint, CSS animation spec, and whether `http.ts` calls `notify()` for unhandled errors or leaves that to call sites.
