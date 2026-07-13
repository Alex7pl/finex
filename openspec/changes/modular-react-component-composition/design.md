# Design: Pure React Modular Component Composition

## Technical Approach

Retain the approved auth field/form composition and add two presentation-only amendments. `AuthPanel` keeps its existing `overflow-y-auto`; a feature-scoped class hides only Firefox/WebKit scrollbar chrome. `HomePage` remains the sole route-facing export and becomes a thin composition root over a few file-private named parts in the same file. Rendered order, elements, class strings, layers, auth slot, assets, Spanish copy, breakpoints, and appearance remain unchanged.

Use React and existing dependencies only. Do not add Radix behavior, generic primitives, infrastructure, route/API changes, or extra component files.

## Architecture Decisions

| Option | Tradeoff | Decision and rationale |
|---|---|---|
| Remove overflow or hide chrome | `overflow-y-hidden` removes the bar but clips short viewports | Keep `overflow-y-auto`; add `.auth-panel-scrollbar-hidden { scrollbar-width: none; }` and its `::-webkit-scrollbar { display: none; }` rule near existing auth CSS. This changes decoration, not scrolling. |
| Inline page or compound public API | Inline JSX stays dense; `HomePage.Header` expands the public API | Keep only `HomePage` exported. Add file-private `HomeHeader`, `Hero`, `HeroContent`, and `NewsCard` functions in `HomePage.tsx`, matching the four existing visual regions without fragmentation. |
| Move route state into parts | Fewer props but couples presentation to auth lifecycle | Preserve `HomePageProps` exactly. `home.tsx` continues to own mode, fetcher, feedback, triggers, notifications, and panel construction. Parts receive only focused presentation props. |
| Manual-only or static regression | Manual checks cover layout but not repeatable markup drift | Add one SSR/static `node:test` test because this refactor promises identical output and the existing `tsx`/`renderToStaticMarkup` harness is sufficient without new tooling. |

## Data Flow and Contracts

```text
home.tsx state/callbacks/authPanel
        -> HomePage (unchanged props)
             -> HomeHeader (existing trigger callbacks)
             -> Hero (authOpen + unchanged authPanel slot)
                  -> HeroContent -> NewsCard
```

`HomePageProps` and route ownership do not change. Private parts are implementation details, use ordinary JSX/props, and introduce no context or behavior. The auth slot remains after the video/overlay layers and before hero content. `AuthPanel` close timing, Escape/backdrop handling, forms, and dialog markup remain untouched except for the added CSS class.

## File Changes

| File | Action | Purpose |
|---|---|---|
| `apps/web/app/modules/auth/components/{AuthUi,AuthForms}.tsx` | Retain | Existing approved field/form composition; no amendment expansion. |
| `apps/web/app/modules/auth/components/AuthUi.test.tsx` | Retain | Existing static auth semantics coverage. |
| `apps/web/COMPONENT_COMPOSITION.md` | Retain | Existing forward convention. |
| `apps/web/app/app.css` | Modify | Add only the feature-scoped Firefox/WebKit scrollbar rules beside auth styles. |
| `apps/web/app/modules/auth/components/AuthPanel.tsx` | Modify | Add the local class while retaining `overflow-y-auto`. |
| `apps/web/app/modules/home/components/HomePage.tsx` | Modify | Extract the four colocated private presentation parts. |
| `apps/web/app/modules/home/components/HomePage.test.tsx` | Create | Lock static landmarks, labels, assets, Spanish copy, auth-slot/content order, and `authOpen` visual-state class. |
| `apps/web/app/routes/home.tsx` | Guard only | No edits; verify public props and auth ownership remain unchanged. |

## Testing Strategy

| Layer | Verification |
|---|---|
| Static | With `node:test`, `tsx`, and `renderToStaticMarkup`, assert preserved Home output and slot order. Do not attempt browser scrolling or responsive assertions in SSR. |
| Regression | Run `pnpm --filter @finex/web test`. |
| Quality | Run `pnpm --filter @finex/web typecheck` and `pnpm --filter @finex/web build`. |
| Manual | At constrained heights, verify login and registration have no scrollbar chrome but still scroll by wheel, touch, and keyboard. At mobile, `sm`, and `lg` widths, compare header, hero layers, copy, card, assets, auth slot, and open-state appearance. Recheck both triggers, mode switch, close paths, submissions, feedback, and success notifications. |

## Baseline, Delivery, and Rollback

Baseline evidence: before this amendment, the user confirmed the auth manual checklist passed for triggers, close, submission, notification, copy, appearance, and responsiveness. Capture viewport/height and browser observations when repeating it.

Deliver one PR under the approved 800-line cap. Recorded baseline: 352 authored lines; amendment: 80–170; combined forecast: **432–522 authored lines**. This exceeds the default 400-line review threshold but requires no chain under the active approval.

Rollback removes the panel class and two CSS rules, restores `HomePage` inline JSX, and removes its focused test. No dependency, data, route, API, or migration cleanup is required.

## Risks

| Risk | Mitigation |
|---|---|
| Hidden chrome reduces scroll discoverability | Preserve overflow and manually prove constrained-height input methods. |
| Extraction moves a layer, class, breakpoint, or slot | Keep exact JSX order/classes and enforce high-value SSR order assertions plus responsive comparison. |
| Static tests imply browser coverage | State their limit; scrollbar and layout acceptance remains manual. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary changes.

## Open Questions

None.
