# Apply Progress: Pure React Modular Component Composition

## Status

- Mode: Standard (`strict_tdd: false`)
- Delivery: Single PR, no chain
- Progress: 15/16 tasks complete
- AuthPanel: Composition remains unchanged; the amendment adds only the local scrollbar class.
- Auth behavior: Submission callbacks, refs, `FormData`, validation, first-error focus, password/check state, route ownership, copy, and layout remain with their existing owners.

## Completed Tasks

- [x] 1.1 Added the forward component-composition convention.
- [x] 1.2 Confirmed exclusions and passed web typecheck.
- [x] 2.1 Added static React regressions, including a failing pre-implementation RED run.
- [x] 2.2 Added auth-local `AuthField` named parts with deterministic local wiring.
- [x] 3.1 Composed login fields without moving form behavior.
- [x] 3.2 Composed registration fields without moving form behavior.
- [x] 3.3 Left AuthPanel unchanged after scope review.
- [x] 2.3 Accepted the user-confirmed pre-amendment real-browser auth checklist as baseline evidence.
- [x] 3.4 Accepted the user-confirmed pre-amendment auth behavior and visual checklist as baseline evidence.
- [x] 3.5 Confirmed the authored diff does not change dependencies or out-of-scope areas.
- [x] 4.1 Hid Firefox/WebKit scrollbar chrome locally while retaining `overflow-y-auto`.
- [x] 4.2 Extracted the design-approved private `HomeHeader`, `Hero`, `HeroContent`, and `NewsCard` parts.
- [x] 4.3 Added focused static HomePage regressions with the existing `node:test`/`tsx` pattern.
- [x] 4.4 Ran the focused test, full web tests, typecheck, and build; only the known unrelated HTTP test failed.
- [x] 4.6 Confirmed the amendment adds no dependency, infrastructure, route/API, Radix behavior, or redesign scope.

## Pre-Amendment Browser Tasks (Subsequently User-Confirmed)

- [x] 2.3 Interactive browser confirmation of password visibility and field semantics. The user confirmed the pre-amendment checklist passed; no automated browser run is claimed.
- [x] 3.4 Interactive browser exercise of both submissions, invalid focus, pending state, password toggle, mode switch, success close/notification, copy, and visuals. The user confirmed the pre-amendment checklist passed; it is baseline evidence only.

## Current Remaining Task

- [ ] 4.5 Manually verify the new scrollbar and responsive amendment. No existing browser harness can prove constrained-height wheel/touch/keyboard scrolling or responsive visual equivalence.

## Files Changed

| File | Action | Purpose |
|---|---|---|
| `apps/web/COMPONENT_COMPOSITION.md` | Created | Documents state ownership, named-parts decisions, exclusions, and review checks. |
| `apps/web/app/modules/auth/components/AuthUi.test.tsx` | Created | Covers native markup, field wiring, input attributes, submit behavior, and initial password state. |
| `apps/web/app/modules/auth/components/AuthUi.tsx` | Modified | Adds pure-React auth field parts and keeps simple leaves and password visibility local. |
| `apps/web/app/modules/auth/components/AuthForms.tsx` | Modified | Composes login and registration fields while retaining existing form ownership. |
| `apps/web/app/app.css` | Modified | Adds feature-local Firefox/WebKit scrollbar-chrome suppression. |
| `apps/web/app/modules/auth/components/AuthPanel.tsx` | Modified | Applies the local scrollbar class while retaining `overflow-y-auto`. |
| `apps/web/app/modules/home/components/HomePage.tsx` | Modified | Composes the unchanged page output from four private colocated presentation parts. |
| `apps/web/app/modules/home/components/HomePage.test.tsx` | Created | Locks landmarks, labels, assets, copy, slot order, and auth-open visual class. |
| `openspec/changes/modular-react-component-composition/tasks.md` | Modified | Marks only verified tasks complete. |
| `openspec/changes/modular-react-component-composition/apply-progress.md` | Created | Records cumulative implementation and evidence. |

## Work Unit Evidence

| Work unit | Focused test command and exact result | Runtime harness command/scenario and exact result | Rollback boundary |
|---|---|---|---|
| 1. Convention | `pnpm --filter @finex/web typecheck` — exit 0 (`react-router typegen && tsc`) | N/A: documentation has no runtime boundary. | Revert `apps/web/COMPONENT_COMPOSITION.md`. |
| 2. Auth field parts | RED: `pnpm --filter @finex/web exec tsx --test app/modules/auth/components/AuthUi.test.tsx` — exit 1, 2 passed/2 failed because named parts were absent. GREEN: same command — exit 0, 4 passed/0 failed. | `pnpm --filter @finex/web dev --host 127.0.0.1 --port 4174` plus `GET /` — HTTP 200. Interactive password toggle remains unverified because no browser harness is available. | Revert `AuthUi.tsx` and remove `AuthUi.test.tsx`. |
| 3. Auth form integration | `pnpm --filter @finex/web test` — exit 1, 40 passed/1 failed; the sole failure is the reported pre-existing `app/libs/http.test.ts:258`. `pnpm --filter @finex/web typecheck` — exit 0. `pnpm --filter @finex/web build` — exit 0. | Development server `GET /` — HTTP 200. Browser-only auth interaction checklist remains unverified. | Revert `AuthForms.tsx`; `AuthPanel.tsx` was not changed. |

## Pre-Amendment Verification Notes

- Focused auth UI regressions pass 4/4.
- The full web suite adds the four passing auth UI tests and retains the known unrelated HTTP notification failure at `apps/web/app/libs/http.test.ts:258` (`40/41` now versus the reported `36/37` baseline).
- Typecheck and production SSR/client build pass.
- Authored implementation/documentation changes total 352 lines (328 additions and 24 deletions), below the approved 800-line boundary. OpenSpec progress/task bookkeeping is excluded from that implementation count.
- No package, lockfile, route, API, CSS, shared-package, external component dependency, or application-wide infrastructure change was authored. Existing unrelated worktree changes in `apps/api/src/modules/auth/auth.handlers.ts` and `apps/web/app/modules/auth/auth.api.ts` were preserved.

## Corrective Rerun Evidence (2026-07-13)

This single corrective rerun merged the prior evidence above and rechecked the two incomplete browser-only tasks without changing production code.

| Check | Exact result |
|---|---|
| Focused auth regressions | `pnpm --filter @finex/web exec tsx --test app/modules/auth/components/AuthUi.test.tsx` — exit 0; 4 passed, 0 failed. |
| Web typecheck | `pnpm --filter @finex/web typecheck` — exit 0 (`react-router typegen && tsc`). |
| Production build | `pnpm --filter @finex/web build` — exit 0; client build transformed 2366 modules and SSR build transformed 21 modules. |
| Full web suite | `pnpm --filter @finex/web test` — exit 1; 40 passed, 1 failed. The only failure remains the known unrelated baseline at `apps/web/app/libs/http.test.ts:258` (`calls notify.error for non-401 API errors`, expected 1 call, received 0). All 4 auth UI regressions passed. |
| Runtime reachability | `pnpm --filter @finex/web dev --host 127.0.0.1 --port 4174` plus `GET /` — HTTP 200. This proves server reachability only, not browser interaction. |

### Browser Harness Capability Check

- The workspace root and `apps/web/package.json` expose build/dev/test/typecheck/start scripts only; neither defines an E2E or browser-interaction script.
- `apps/web/package.json` contains no Playwright, Cypress, Puppeteer, Selenium/WebDriver, jsdom, happy-dom, Testing Library, or Vitest browser dependency.
- Workspace searches found no Playwright/Cypress/browser/E2E configuration or harness files, and no corresponding executable under the root or web package `node_modules/.bin`.
- The only browser-related lockfile entries are Browserslist metadata used by the build toolchain; they are not an interaction harness.

Therefore tasks 2.3 and 3.4 remain unchecked. Password visibility, live login/registration submission, first-invalid-field focus, pending state, mode switch, success close/notification, and visual equivalence cannot be truthfully proved in this executor without adding prohibited browser/DOM infrastructure. Static regressions preserve field semantics, initial password state, native submit state/copy, and the source diff preserves existing auth copy/classes, but those checks do not replace the required live browser exercise.

Minimal completion action: with the existing API/database and web app running, a user must open the auth panel in a real browser and execute the task 2.3/3.4 checklist once, confirming both modes and a successful submission. Record that manual result here, then mark only tasks 2.3 and 3.4 complete.

## Pre-Amendment Deviations and Risks

- No design deviation in the implementation. AuthPanel was optional and remains unchanged as preferred.
- Dynamic browser behavior is not covered by the repository's node/static React test capability and was not manually exercised in this environment.
- The unrelated baseline HTTP test failure prevents a green full-suite exit despite no introduced regression in the focused auth tests.
- The corrective rerun found no already available workspace browser/runtime interaction harness. No dependency or test infrastructure was added, as required.

## Presentation Amendment Progress (2026-07-13)

This amendment preserves all prior evidence above and adds the presentation work-unit implementation and verification. The user-confirmed auth checklist is authoritative only for the pre-amendment baseline; it does not prove the new scrollbar or responsive behavior.

### Work Unit Evidence

| Work unit | Focused test command and exact result | Runtime harness command/scenario and exact result | Rollback boundary |
|---|---|---|---|
| 4. Presentation amendment | `pnpm --filter @finex/web exec tsx --test app/modules/home/components/HomePage.test.tsx` — exit 0; 2 passed, 0 failed. `pnpm --filter @finex/web test` — exit 1; 42 passed, 1 failed, solely the known unrelated `apps/web/app/libs/http.test.ts:258`. `pnpm --filter @finex/web typecheck` — exit 0. `pnpm --filter @finex/web build` — exit 0; client transformed 2366 modules and SSR transformed 21 modules. | `pnpm --filter @finex/web dev --host 127.0.0.1 --port 4174` plus `GET /` — HTTP 200. This proves runtime reachability only. Task 4.5 remains manual because the workspace has no browser-interaction harness. | Revert `apps/web/app/app.css`, `apps/web/app/modules/auth/components/AuthPanel.tsx`, and `apps/web/app/modules/home/components/HomePage.tsx`; remove `apps/web/app/modules/home/components/HomePage.test.tsx`. This removes only the presentation amendment. |

### Implementation and Scope

- `AuthPanel` retains `overflow-y-auto`; `.auth-panel-scrollbar-hidden` adds only `scrollbar-width: none` and a local `::-webkit-scrollbar { display: none; }` rule.
- `HomePage` remains the sole exported route-facing shell. `HomeHeader`, `Hero`, `HeroContent`, and `NewsCard` are file-private and preserve the existing element/layer order, class strings, assets, Spanish copy, callbacks, and auth-slot position.
- `apps/web/app/routes/home.tsx`, package manifests, lockfiles, APIs, shared packages, and application infrastructure were not changed by the amendment.
- The complete authored application/documentation diff is 532 lines (453 additions and 79 deletions): prior baseline 352 plus amendment 180. OpenSpec bookkeeping and unrelated pre-existing worktree changes are excluded. This remains below the approved 800-line cap.
- `git diff --check` passed. Existing unrelated changes in `apps/api/src/modules/auth/auth.handlers.ts` and `apps/web/app/modules/auth/auth.api.ts` remain untouched.

### Manual Checklist Required for Task 4.5

With the existing API/database and web app running:

1. In Firefox and a WebKit/Blink browser, constrain the viewport height until login and registration content overflow. Confirm no panel scrollbar chrome is visible.
2. In both login and registration modes, confirm the panel still scrolls to every control by mouse wheel/trackpad, touch, and keyboard (`Tab` plus arrow/Page Down as supported).
3. Compare the home page below `sm`, at `sm`, and at `lg`: header, hero media/overlays, Spanish copy, news card, assets, auth-slot position, and auth-open blur/scale state must match the baseline.
4. Recheck both auth triggers, mode switching, Escape/backdrop/close-button paths, invalid first-field focus, password visibility, pending state, both submissions, success close, and success notification.

Record browser names, viewport widths/heights, and the result here, then mark only task 4.5 complete. Until then, apply status is partial and must not imply browser coverage.

## Single Corrective Amendment Rerun (2026-07-13)

The prior cumulative evidence remains unchanged. This corrective rerun rechecked only whether an already available browser/runtime mechanism could honestly complete task 4.5. No production, test, dependency, lockfile, or infrastructure file was changed, and task 4.5 remains unchecked.

### Browser/Runtime Capability Evidence

| Check | Exact result |
|---|---|
| Workspace browser harness | Root scripts expose only build/dev/typecheck; web scripts expose build/dev/test/start/typecheck. No Playwright, Cypress, Puppeteer, Selenium/WebDriver, browser-test script, browser/E2E configuration, matching dependency, or matching executable exists in the workspace. |
| Installed requested browsers | `/Applications/Safari.app` is present. `/Applications/Firefox.app`, `/Applications/Google Chrome.app`, `/Applications/Chromium.app`, and `/Applications/Microsoft Edge.app` are absent. `/Applications/Zen.app` is present and identifies itself as Zen (`app.zen-browser.zen`, `GeckoNSApplication`); substituting it for the task's explicit Firefox requirement would alter the acceptance evidence. |
| Installed browser drivers | `safaridriver` resolves to `/System/Cryptexes/App/usr/bin/safaridriver`; `geckodriver` and `chromedriver` are absent. `safaridriver --diagnose` produced no output and timed out after 30 seconds, so no usable Safari automation session was established. Even a Safari-only session would not satisfy Firefox coverage or honestly prove touch input. |
| Automated regression rerun | Not repeated: this corrective rerun changed no application/test code, and static tests cannot complete task 4.5. The latest focused/full-suite/typecheck/build results remain recorded in the Presentation Amendment Work Unit evidence above. |

### Exact Blocker

There is no already available mechanism that can exercise and observe the amendment in the required Firefox plus WebKit/Blink coverage while also proving constrained-height wheel, touch, and keyboard scrolling, hidden scrollbar chrome, responsive visual equivalence below `sm`/at `sm`/at `lg`, and the baseline auth flow. Task 4.5 therefore cannot be truthfully completed by this executor without installing or adding prohibited tooling, fabricating evidence, or changing the task's meaning.

### Minimal Manual Evidence Needed

The user must provide one concise manual record containing:

- Firefox browser name/version and a WebKit or Blink browser name/version.
- Tested viewport width/height for below `sm`, at `sm`, at `lg`, and a constrained-height overflowing login/registration panel.
- Pass confirmation in both auth modes for hidden scrollbar chrome and complete wheel/trackpad, touch, and keyboard scrolling to every control.
- Pass confirmation that header, hero media/layers, Spanish copy, news card, assets, auth-slot position, and auth-open blur/scale match the baseline at all three responsive widths.
- Pass confirmation for both auth triggers, mode switch, Escape/backdrop/close button, invalid first-field focus, password visibility, pending state, login and registration submission, success close, and success notification.

Once that record is supplied, append it here and mark only task 4.5 complete.
