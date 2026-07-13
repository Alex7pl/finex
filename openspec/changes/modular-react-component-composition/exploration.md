# Exploration: Pure React Modular Component Composition

## Recommendation

Adopt a small **pure-React composition convention** for new and substantially changed frontend components: expose meaningful named parts where callers need to arrange structure, keep feature state in the feature or route, and use ordinary semantic HTML, props, children, hooks, and context only when they make that composition clearer. Do not add Radix packages, another component/primitives library, or a parallel behavioral foundation. Start by applying the convention to the next substantial auth UI change—especially its field/form structures—and keep the current auth panel’s behavior intact unless a product change independently requires it.

## Current State

The web app uses React 19, React Router SSR, TypeScript, Tailwind, Lucide, and no UI primitive library. Its shared UI surface currently contains a toast presentation pair; auth is a feature-owned collection of fixed-prop components; and the home route owns auth mode, submission, feedback, and open/close coordination.

`AuthField` already centralizes label, generated ID, input, hint, and error wiring, while `PasswordField` layers visibility state on top of it. The API is useful but structurally fixed: consumers cannot compose field parts when their layout needs to differ. `AuthPanel` is likewise a feature-specific, fixed-prop component that currently owns its closing animation and Escape listener; it renders an ordinary semantic dialog container and buttons, but does not provide a general dialog abstraction. The clarification does not make reproducing or extending those behaviors a goal.

The notification store is a separate, SSR-aware state boundary with timer/state-transition tests. `Toast` and `ToastContainer` are presentation consumers of that store. They are a possible later composition candidate, not a reason to rewrite notification behavior.

## Evidence

| Evidence | Observation | Implication |
|---|---|---|
| `apps/web/package.json` | React 19, React Router, Tailwind, Lucide, `node:test`, and `tsx` are present; Radix and other component/primitives packages are absent. | The convention must be implemented with React and existing dependencies only. |
| `apps/web/app/modules/auth/components/AuthUi.tsx` | `AuthField` owns label/input/hint/error markup; `PasswordField` adds local visibility state; `SubmitButton` is a fixed submit API. | Field/form composition is the clearest first migration candidate: provide named parts only where callers need structural control. |
| `apps/web/app/modules/auth/components/AuthForms.tsx` | Forms own native `<form>` submission, field-error focus, password requirements, and auth-specific copy. | Preserve native form semantics and feature behavior; shared composition must not hide them behind generic abstractions. |
| `apps/web/app/modules/auth/components/AuthPanel.tsx` | The panel owns close timing, Escape handling, backdrop click, and its login/register selector; the implementation is feature-specific. | It can be reorganized into named presentational parts when substantially changed, but this change must not recreate dialog, tab, focus, portal, or browser-infrastructure behavior. |
| `apps/web/app/routes/home.tsx` and `modules/home/components/HomePage.tsx` | The route and page coordinate auth opening, rendered-panel placement, and trigger references. | Retain route ownership of business state and existing coordination; composition is not a mandate to redesign this flow. |
| `apps/web/app/components/ui/Toast*.tsx` and `libs/notifications.ts` | Toast rendering is separate from an SSR-safe external store with tested timers and transitions. | Keep the store contract intact; defer toast restructuring until a genuine presentation need exists. |
| `apps/web/package.json` and `apps/web/app/**/*.test.*` | The web package has a working `node:test`/`tsx` script, with store and SSR-render tests, but no DOM interaction test library. | Existing test capability is useful for logic and SSR output; UI interaction coverage remains a separate, optional future need. |

## Practical Convention

1. **Compose for structure, not ceremony.** A component with meaningful caller-controlled regions SHOULD export named parts (for example, `Field.Root`, `Field.Label`, `Field.Control`, `Field.Message`) or colocated named exports. A simple leaf component SHOULD remain a simple component.
2. **Keep ownership local.** Routes and features retain business state, fetcher submission, validation, copy, and navigation. A composed component may own only its narrow presentation state, such as password visibility.
3. **Use normal React and HTML.** Parts render ordinary semantic elements and accept focused props and `children`. Use context only to share a narrow relationship such as a field ID or error state; do not introduce polymorphic `asChild`/slot APIs by default.
4. **Preserve semantics explicitly.** Components keep native form controls, labels, error associations, buttons, and existing reduced-motion styling where applicable. This is preservation of current markup quality, not a new accessibility-infrastructure project.
5. **Place reusable parts deliberately.** Put stable domain-agnostic parts under `apps/web/app/components/ui/`; keep auth-specific composition in `modules/auth` until reuse is demonstrated. Do not create a broad design-system inventory in advance.

## Migration Candidates

| Candidate | Suggested treatment | Boundary |
|---|---|---|
| Auth field and form structures | First substantial migration candidate. Evolve `AuthField` toward a small composed field contract if the auth layouts need independently arranged label, control, hint, and message regions. | Keep `LoginForm`/`RegisterForm` native submission, validation, error focus, copy, and password-check behavior. |
| Auth panel | Apply named presentational parts only during a substantial change that benefits from caller-controlled header, selector, body, or footer composition. | Preserve its current route contract and close behavior; do not build a reusable Dialog/Tabs primitive or new focus/portal system. |
| Button | Extract a shared base only after more than one feature demonstrably needs the same structure and semantics. | Avoid a large variant API or polymorphic abstraction for a single auth submit button. |
| Toast presentation | Consider named visual parts only if a future requirement needs alternate toast layouts. | Do not alter `notifications.ts`, timers, SSR snapshot, or delivery behavior as part of this convention. |

## Approaches

| Approach | Benefits | Costs and limits | Effort |
|---|---|---|---|
| Keep fixed-prop feature components | Lowest immediate change; clear for simple leaves. | Repeats layout decisions and grows prop surfaces when structure varies. | Low |
| **Recommended: selective pure-React named parts** | Gives callers structural flexibility, retains ownership near the feature, adds no dependency, and supports incremental adoption. | Requires API judgment; overuse can make simple components harder to read. | Medium |
| Build a full local primitive/design system | Maximum uniformity. | Expands scope into behavior and styling infrastructure without present evidence of need. | High |
| Adopt or emulate Radix primitives | Provides a familiar external abstraction. | Directly conflicts with the clarified pure-React, no-library/no-behavior-recreation boundary. | Out of scope |

## Enforcement

Use a lightweight frontend convention document and code-review checklist rather than a new framework or mandatory lint rule:

- New or substantially changed components must identify their state owner and whether their structure requires named parts.
- Prefer existing composed parts before creating another fixed wrapper; create shared UI parts only after demonstrated cross-feature reuse.
- Keep parts small, semantic, and explicit about required children/props; avoid boolean-prop growth when callers need to arrange content.
- Reviewers verify that the change preserves the feature’s existing behavior and does not introduce component-library dependencies or behavioral infrastructure.
- Existing, unchanged components are not migration debt. Refactor them only when a product change makes the composition improvement local and reviewable.

## Scope Boundaries

**In scope for a follow-up change:** the documented pure-React convention; a narrow, evidence-led field/form composition slice; optional auth-panel organization only when it has a local structural benefit; and review enforcement for future/substantially changed frontend components.

**Out of scope:** Radix packages or any other component/primitives library; recreating Radix internals; focus management, portals, browser API abstractions, modal/tab infrastructure, or other new behavioral systems; a design-system rewrite; migration of every component; redesigning auth flows; changing auth API/client-action behavior; replacing Tailwind; and altering the notification store.

## Risks

- Compound APIs can make small components opaque. Apply named parts only when callers genuinely need control over layout or ownership.
- A field migration can regress IDs, labels, `aria-describedby`, error focus, password visibility, or native submission if those existing responsibilities are moved carelessly.
- Auth-panel refactoring can unintentionally alter close timing, reduced-motion behavior, `useFetcher` submission, route-owned state, or trigger restoration; retain those contracts unless independently changed.
- The web package has no DOM interaction test environment, so component-interaction changes require focused manual verification until testing support is separately justified.
- Combining convention documentation, shared extraction, and a full auth rewrite could exceed the current-session 800-line review budget; the default delivery strategy is a single PR, so keep the first delivery slice narrow and ask before planning an oversized change.

## Ready for Proposal

**Yes.** Tell the user that the proposal will establish a selective, pure-React named-parts convention and a small auth field/form migration slice. It will explicitly exclude Radix dependencies, Radix-behavior recreation, a system-wide rewrite, and unrelated accessibility infrastructure.

---

## Amendment Exploration: Login Panel Scrollbar and Home Composition Completion

### Decision

Amend the active change with two small, presentation-only slices: hide the incidental visible scrollbar while retaining the auth panel's scroll behavior, and decompose `HomePage` into a few meaningful, colocated named presentation parts. Keep route-owned auth state and all current visual/content contracts unchanged.

### Evidence and Current Ownership

| Area | Current owner / evidence | Amendment implication |
|---|---|---|
| Auth panel scrolling | `AuthPanel.tsx` renders the dialog in a fixed `inset-y-2`/`sm:inset-y-3` viewport box with `overflow-y-auto`. Its login content includes fixed vertical padding, selector, copy, form spacing, and an `mt-auto pt-7` footer. The user observed a small scrollbar after manual browser verification. | The fixed-height panel plus scroll container is the source of the visible overflow affordance. Do not remove scrolling: registration and short viewports can require it. |
| Auth behavior | `routes/home.tsx` owns mode, feedback, fetcher submission, trigger restoration, and notifications; `AuthPanel.tsx` owns close timing, Escape/backdrop close, and panel presentation. | The CSS-only scrollbar fix must not move state, alter the close flow, or change form behavior. |
| Home structure | `HomePage.tsx` is a 76-line single presentational component containing the header/navigation, hero background layers, hero copy, explanatory copy, and news card. The route passes only auth state, two trigger callbacks, and the auth-panel slot. | The remaining refactor is structural: split those independent visual regions without exporting a generic primitive or moving route concerns. |
| Existing composition precedent | `AuthField.Root`, `.Label`, `.Control`, `.Description`, and `.Error` are the approved auth-local named-parts pattern. `COMPONENT_COMPOSITION.md` requires named parts only for meaningful structure and keeps simple leaves simple. | Use a small home-local named-parts surface, not a broad design-system API or arbitrary file fragmentation. |

### Recommended Amendment

1. **Preserve panel scrolling; suppress only its decorative scrollbar.** Keep `overflow-y-auto` on the dialog and add local cross-browser scrollbar-hiding utilities (Firefox `scrollbar-width: none` plus the WebKit scrollbar rule). This removes the small visible bar while retaining mouse wheel, touch, keyboard, and short-viewport scrolling. Do **not** change it to `overflow-y-hidden`, because that would clip legitimate register/short-viewport content.

2. **Make `HomePage` a small composed presentation shell.** Keep `HomePage` as the public route-facing component and compose a limited set of colocated named parts inside `modules/home/components/HomePage.tsx` (or a single adjacent home-presentational module):
   - `HomePage.Header` — brand and login/register trigger controls; accepts only the existing callbacks.
   - `HomePage.Hero` — surface, video, overlay layers, auth-panel slot, and the visual state class derived from `authOpen`.
   - `HomePage.HeroContent` — heading plus the lower explanatory/news region.
   - `HomePage.NewsCard` — the self-contained article/image presentation.

   `HomePage` remains the thin composition root. Constants, Spanish copy, assets, Tailwind classes, element order, breakpoints, and the `authPanel` position remain unchanged. The home route continues to own every auth-related state transition and callback.

### Affected Files and Verification

- `apps/web/app/modules/auth/components/AuthPanel.tsx` — one local CSS-class amendment; no state or markup-flow redesign.
- `apps/web/app/modules/home/components/HomePage.tsx` — structural extraction/composition only; no route change is required.
- `apps/web/app/routes/home.tsx` — inspect only; its props and ownership should remain unchanged.
- `apps/web/app/modules/auth/components/AuthUi.test.tsx` — existing static field coverage is unaffected; it does not cover the panel or home page.
- `apps/web/app/modules/home/components/HomePage.test.tsx` — add a small static SSR regression only if the implementation benefits from locking the preserved landmarks, trigger labels, hero media, auth slot, and news-card copy. There is currently no HomePage test.

Run web typecheck and build. Re-run the already successful manual browser checklist with emphasis on: no visible login-panel scrollbar at the verified viewport; login/register panels remain scrollable on constrained heights; auth opens from both triggers; close, submission, notification, copy, responsive layout, and home appearance remain unchanged. The repository still has no DOM/browser harness, so the scrollbar and responsive behavior require that manual evidence.

### Scope and Budget

This remains within the active change intent: it applies the approved pure-React structural-composition rule to the unfinished home presentation and corrects a local auth-panel presentation regression without adding behavior, dependencies, infrastructure, or visual redesign. Estimated amendment size is 80–170 authored lines including a focused static home test if added. Combined with the recorded 352 authored implementation lines, the expected total is 432–522 lines, below the approved 800-line session budget. It exceeds the project configuration's default 400-line review threshold, so retain the active change's documented 800-line approval and keep the amendment as one coherent, narrowly reviewed work unit.

### Risks and Ambiguity

- Hidden scrollbars reduce visual discoverability, although scrolling remains functional; verify constrained-height registration manually rather than removing overflow.
- Extracting JSX can accidentally move an absolute layer, breakpoint class, or auth slot. Preserve DOM order and class strings unless a local component boundary requires a mechanical relocation.
- No user decision is required. The request is sufficiently constrained; stop if “finish Home” is later intended to include new interactions, copy, visual redesign, or a broader design-system extraction.
