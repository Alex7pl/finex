# Tasks: Pure React Modular Component Composition

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 432–522 (352 + amendment 80–170) |
| Review budget | 800 lines |
| 800-line budget risk | Low |
| Chained PRs recommended | No |
| Delivery | One PR; four work units; no chain |
| Chain strategy | none |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: none
800-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Convention | PR 1 | Typecheck | N/A: docs only | `COMPONENT_COMPOSITION.md` |
| 2 | Auth field parts | PR 1 | Focused `AuthUi.test.tsx` | Dev server: field/password checks | `AuthUi.tsx`, test |
| 3 | Auth form adoption | PR 1 | Web test/typecheck/build | Dev server: auth checklist | `AuthForms.tsx` |
| 4 | Presentation amendment | PR 1 | `HomePage.test.tsx` | Dev server: constrained-height/responsive checklist | `app.css`, `AuthPanel.tsx`, `HomePage.tsx`, test |

## Phase 1: Convention Work Unit

- [x] 1.1 Create `apps/web/COMPONENT_COMPOSITION.md` covering ownership, named parts, simple leaves, native HTML, local context, exclusions, and review checks.
- [x] 1.2 Confirm it forbids component libraries, Radix behavior, and new interaction/browser infrastructure; run web typecheck.

## Phase 2: Auth Field Work Unit

- [x] 2.1 Add RED `AuthUi.test.tsx` regressions for native semantics, field wiring, input attributes, submit state/copy, and initial password type.
- [x] 2.2 Add deterministic `AuthField` named parts in `AuthUi.tsx`; keep simple leaves and password behavior.
- [x] 2.3 Run web tests and verify semantics/password visibility. Evidence: user-confirmed prior real-browser checklist passed before this amendment; no automated browser run is claimed.

## Phase 3: Auth Form Integration Work Unit

- [x] 3.1 Compose login fields in `AuthForms.tsx`; preserve native submission, refs, `FormData`, validation/focus, layout, copy, and callbacks; run focused tests.
- [x] 3.2 Compose registration fields; preserve password/check state, validation, associations, visibility, layout, copy, and callbacks; run focused tests.
- [x] 3.3 Leave `AuthPanel.tsx` unchanged because no beneficial behavior-neutral named parts were justified.
- [x] 3.4 Run web tests/typecheck/build and manually exercise auth behavior/visuals. Evidence: commands are in `apply-progress.md`; user-confirmed prior real-browser checklist passed before this amendment.
- [x] 3.5 Confirm no dependency, lockfile, route, API, CSS, shared-package, or global-infrastructure changes.

## Phase 4: Presentation Amendment Work Unit

- [x] 4.1 In `app.css`/`AuthPanel.tsx`, hide Firefox/WebKit scrollbar chrome while retaining `overflow-y-auto` and real scrolling.
- [x] 4.2 Extract design-approved private named parts in `HomePage.tsx`; preserve its API, route state/callbacks, auth slot, DOM/layers, classes, assets, Spanish copy, visuals, and responsiveness.
- [x] 4.3 Add `HomePage.test.tsx` with the justified existing `node:test` static-render pattern; assert landmarks, labels, assets, copy, slot/content order, and `authOpen` class without implying browser coverage.
- [x] 4.4 Run the focused HomePage test, full web tests, typecheck, and build; separate regressions from known `app/libs/http.test.ts:258` baseline failure.
- [ ] 4.5 Verify constrained-height login/registration wheel, touch, and keyboard scrolling without chrome; compare mobile, `sm`, and `lg`, then recheck baseline auth flows.
- [x] 4.6 Confirm no dependencies, Radix behavior, infrastructure, route/API changes, or redesign.
