# Frontend Component Composition Specification

## Purpose

Define narrow, pure-React composition while preserving the current authentication and home-page experience.

## Requirements

### Requirement: Structural Composition Decision

New or substantially changed frontend components MUST identify their state owner. They MUST use named React parts only when callers need structural control; simple leaves MUST remain simple. Components MAY use semantic HTML, JSX, props, `children`, and hooks. `HomePage` MUST remain the public composition shell and use only a few meaningful, colocated, pure-React named presentation parts.

#### Scenario: Structural control is needed

- GIVEN callers need to arrange field or form sub-elements differently
- WHEN the component is new or substantially changed
- THEN it MAY expose focused named parts
- AND its state owner is explicit

#### Scenario: Structural control is not needed

- GIVEN a leaf has a single stable structure
- WHEN it is new or substantially changed
- THEN it MUST remain a simple component

#### Scenario: Home presentation composition

- GIVEN `HomePage` is structurally refactored
- WHEN its presentation regions are extracted
- THEN the parts MUST stay colocated and limited to meaningful regions
- AND arbitrary fragmentation MUST NOT be introduced

### Requirement: State and Context Boundaries

Business state, submission, validation, and route coordination MUST remain with their existing owners. A named part MAY own only narrow presentation state. React context MUST be limited to a justified local relationship, such as field ID and error wiring, and MUST NOT become application-wide infrastructure.

#### Scenario: Form composition

- GIVEN authentication form parts are composed
- WHEN a user submits or validation runs
- THEN route-owned state and lifecycle remain unchanged

#### Scenario: Local context is unnecessary

- GIVEN explicit props express a part relationship clearly
- WHEN the component is composed
- THEN it MUST NOT introduce React context

### Requirement: Authentication Behavior and Scrolling Preservation

Auth field and form composition MUST preserve native submission, validation, labels, error associations, first-invalid-field focus, user-facing copy, password visibility, authentication flow, and API behavior. `AuthPanel` MUST suppress only its visible scrollbar while retaining `overflow-y-auto` behavior and functional login and registration scrolling.

#### Scenario: Invalid submission

- GIVEN an auth form receives validation errors
- WHEN feedback is rendered
- THEN existing error associations and first-invalid-field focus are preserved

#### Scenario: Password field interaction

- GIVEN a user changes password visibility
- WHEN the field rerenders
- THEN the existing visibility behavior and copy are preserved

#### Scenario: Constrained-height panel

- GIVEN login or registration exceeds the available panel height
- WHEN the user scrolls by supported input
- THEN content MUST remain scrollable without a visible panel scrollbar
- AND auth controls and behavior remain available

### Requirement: Home Route and Visual Contract Preservation

`HomePage` MUST preserve its public route ownership and contract, including auth-slot placement. It MUST preserve DOM and layer order, classes, assets, Spanish copy, appearance, and responsive behavior exactly; the route MUST retain all auth state transitions and callbacks.

#### Scenario: Public home route

- GIVEN either home auth trigger opens the panel
- WHEN the page renders its composed parts
- THEN the auth slot MUST appear in its existing position
- AND route-owned callbacks and state remain unchanged

#### Scenario: Responsive rendering

- GIVEN the home page is rendered at supported responsive widths
- WHEN its presentation is inspected
- THEN its layers, copy, assets, classes, and appearance MUST match the baseline

### Requirement: Scope and Dependency Limits

The adoption MUST use React and existing dependencies only. It MUST NOT add dependencies, Radix behavior, infrastructure, a redesign, route or API changes, or dialog, tabs, focus-trap, portal, browser, accessibility, or DOM/a11y tooling. AuthPanel parts MAY be added only for a local, non-behavioral structural benefit.

#### Scenario: Component review

- GIVEN a new or substantially changed component is reviewed
- WHEN named parts are proposed
- THEN they MUST demonstrate structural need and remain within this scope

#### Scenario: Out-of-scope interaction request

- GIVEN composition would require a dialog, tabs, portal, or focus-management primitive
- WHEN the implementation is considered
- THEN the request MUST NOT add that infrastructure

### Requirement: Manual Verification Baseline

The user-confirmed prior manual auth checklist MUST be the baseline for unchanged triggers, close, submission, notifications, copy, appearance, and responsiveness. The amendment MUST be manually verified at constrained heights and responsive widths.

#### Scenario: Baseline regression check

- GIVEN the prior checklist passed before this amendment
- WHEN the amendment is verified
- THEN all baseline auth outcomes MUST remain unchanged

#### Scenario: Amendment verification

- GIVEN constrained-height login and registration views and responsive widths
- WHEN scrolling and home rendering are manually verified
- THEN scrolling, layout, and visual contracts MUST be preserved
