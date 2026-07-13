# Proposal: Pure React Modular Component Composition

## Intent

Apply the existing pure-React composition convention without changing behavior or creating a UI platform. This amendment hides only the incidental login-panel scrollbar while retaining scrolling.

## Scope

### In Scope
- Apply the forward convention and selectively evolve auth fields/forms, preserving native semantics, validation, error focus, Spanish copy, and password visibility.
- Hide only the visible `AuthPanel` scrollbar with local CSS; retain `overflow-y-auto` and auth behavior.
- Finish `HomePage` as the public route-facing shell with a few colocated, pure-React named presentation parts.

### Out of Scope (Non-Goals)
- Radix/component libraries or behavior; new browser, focus, portal, dialog, or tab infrastructure; or a broad design system.
- Redesign, route/API/auth-flow changes, or changes to assets, classes, Spanish copy, appearance, responsiveness, notifications, or toasts.

## Capabilities

### New Capabilities
- `frontend-component-composition`: Pure-React named-parts convention and narrow auth field/form adoption that preserves existing feature behavior.

### Modified Capabilities
None; `openspec/specs/` has no existing capabilities.

## Approach

Use semantic HTML, JSX, focused props, and `children`. Retain route-owned auth state, callbacks, and auth-slot placement. Keep `HomePage` thin and preserve DOM/layer order, classes, assets, copy, and breakpoints. Add only `scrollbar-width: none` and a local WebKit rule to the existing scroll container.

## Manual Evidence Before Amendment

User-confirmed: the prior auth manual checklist passed before this amendment. It is the baseline for unchanged triggers, close, submission, notification, copy, appearance, and responsiveness.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/web/app/modules/auth/components/{AuthUi,AuthForms}.tsx` | Modified | Selective field/form composition. |
| `apps/web/app/modules/auth/components/AuthPanel.tsx` | Modified | Decorative scrollbar suppression only. |
| `apps/web/app/modules/home/components/HomePage.tsx` | Modified | Colocated structural parts; public shell retained. |
| `apps/web/app/routes/home.tsx` | Guard | State, callbacks, props, and auth-slot contract unchanged. |
| Composition convention document | New | Forward composition and review guidance. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Hidden scrollbar obscures scrollability | Medium | Manually verify constrained-height login and registration scrolling. |
| JSX extraction changes layers or auth placement | Medium | Preserve DOM order/classes and verify the route contract. |
| Combined review exceeds default 400 lines | Medium | Keep one narrow user-approved PR below its 800-line cap. |

## Rollback Plan

Revert the localized amendment: remove scrollbar rules and restore `HomePage` inline composition. No dependency, data, route, or behavior migration needs cleanup.

## Dependencies

- None; React and existing dependencies only.

## Success Criteria

- [ ] No visible login-panel scrollbar; wheel, touch, keyboard, and constrained-height scrolling work.
- [ ] `HomePage` uses a few meaningful colocated parts; its public shell, route contract, DOM/layer order, classes, assets, Spanish copy, appearance, and responsiveness are unchanged.
- [ ] Auth triggers, close, submission, feedback, and notifications match the user-confirmed baseline.
- [ ] No dependency, Radix behavior, infrastructure, design-system, redesign, route, or API scope is added.

## Review Workload Forecast

- Baseline: 352 authored lines. Amendment: 80–170. Expected combined total: 432–522 lines.
- Delivery: one PR, within the approved 800-line budget; 400-line default-budget risk: Medium.
- Decision needed before apply: No; chained PRs recommended: No.
