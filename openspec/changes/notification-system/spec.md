# notifications Specification

## Purpose

Global imperative toast surface callable from any module (React or non-React).
Provides transient feedback for background/service-layer events that fall
outside existing form or page-level error surfaces.

---

## Requirements

### Requirement: notify() API Contract

The system MUST expose `notify(message: string, options?: { type?: ToastType; duration?: number }): string`.  
The return value MUST be the generated toast `id`.  
`type` defaults to `"info"` when omitted.  
`duration` defaults per type: `success` 3000 ms, `info` 4000 ms, `warning` 5000 ms, `error` 6000 ms.  
The system MUST expose convenience aliases: `notify.success`, `notify.error`, `notify.info`, `notify.warning`, each accepting `(message: string, duration?: number): string`.

#### Scenario: Call with message only

- GIVEN the notification store is initialized
- WHEN `notify("Saved")` is called
- THEN a `ToastItem` with `type="info"` and `duration=4000` is added to the store
- AND the returned value is the new toast's `id` string

#### Scenario: Call with explicit type and duration

- GIVEN the notification store is initialized
- WHEN `notify("Oops", { type: "error", duration: 8000 })` is called
- THEN a `ToastItem` with `type="error"` and `duration=8000` is added to the store

#### Scenario: Convenience alias

- GIVEN the notification store is initialized
- WHEN `notify.success("Done")` is called
- THEN a `ToastItem` with `type="success"` and `duration=3000` is added to the store

#### Scenario: Return value is a string id

- GIVEN the notification store is initialized
- WHEN `notify("x")` is called
- THEN the return value is a non-empty string

---

### Requirement: ToastItem Shape

The system MUST produce `ToastItem` objects conforming to:

| Field      | Type                                              | Notes                         |
|------------|---------------------------------------------------|-------------------------------|
| `id`       | `string`                                          | Unique per toast              |
| `message`  | `string`                                          | Display text                  |
| `type`     | `"success" \| "error" \| "info" \| "warning"`    | Determines style and defaults |
| `duration` | `number`                                          | Milliseconds until dismissal  |
| `state`    | `"entering" \| "visible" \| "exiting"`            | Animation lifecycle phase     |

No additional fields are required; extra fields are NOT permitted on `ToastItem`.

#### Scenario: Shape completeness

- GIVEN `notify("Hello", { type: "warning" })` is called
- WHEN the resulting item is read from the store
- THEN it has exactly the fields: `id`, `message`, `type`, `duration`, `state`

---

### Requirement: Stacking Behavior

The store MUST hold at most 3 `ToastItem` entries simultaneously.  
When a 4th `notify()` call arrives and 3 items are visible, the oldest item MUST be immediately transitioned to `state="exiting"` before the new item is added.  
Items are ordered newest-first (index 0 = most recent).

#### Scenario: Add up to max

- GIVEN the store is empty
- WHEN 3 toasts are added sequentially
- THEN the store contains exactly 3 items

#### Scenario: FIFO eviction on 4th toast

- GIVEN the store holds 3 items with ids `[A, B, C]` (A oldest)
- WHEN `notify("new")` is called
- THEN item A transitions to `state="exiting"`
- AND the new item is appended, making the store hold `[new, B, C]` (newest-first)

#### Scenario: Eviction does not exceed 3 visible items

- GIVEN 5 calls are made in rapid succession
- WHEN the store is read after all calls
- THEN exactly 3 items remain (some may be in `state="exiting"` pending removal)

---

### Requirement: Auto-Dismiss Lifecycle

Each `ToastItem` MUST transition through: `entering → visible → exiting → removed`.  
The auto-dismiss timer MUST start when the item first enters `state="visible"`.  
After `duration` ms in `visible`, the item MUST transition to `state="exiting"`.  
The item MUST be removed from the store after the exit animation completes.  
No manual dismiss (close button) exists in v1.

#### Scenario: State progression

- GIVEN a toast is added to the store
- WHEN it is first inserted
- THEN its initial `state` is `"entering"`
- AND after the enter animation it transitions to `"visible"`
- AND after `duration` ms it transitions to `"exiting"`  `[interaction-test: deferred]`
- AND after the exit animation it is removed from the store  `[interaction-test: deferred]`

#### Scenario: Timer start point (store unit test)

- GIVEN a toast item exists with `state="entering"`
- WHEN `state` transitions to `"visible"`
- THEN the dismiss timer is scheduled for `duration` ms from that transition

#### Scenario: Removal from store

- GIVEN a toast item exists with `state="exiting"`
- WHEN the exit animation ends
- THEN the item is no longer present in the store  `[interaction-test: deferred]`

---

### Requirement: Animation Contract

The system MUST apply CSS class `toast-enter` when `state="entering"` and `toast-exit` when `state="exiting"`.  
Enter animation MUST be approximately 200 ms, `ease-out`.  
Exit animation MUST be approximately 200 ms, `ease-in`.  
DOM removal MUST be deferred until the exit animation ends (`onAnimationEnd` or equivalent).  
When `prefers-reduced-motion: reduce` is active, the system MUST suppress keyframe animations (0 ms or instant transitions).

#### Scenario: Enter class applied

- GIVEN a new toast is inserted
- WHEN the component renders
- THEN the element has class `toast-enter`  `[interaction-test: deferred]`

#### Scenario: Exit class applied

- GIVEN a toast transitions to `state="exiting"`
- WHEN the component renders
- THEN the element has class `toast-exit`  `[interaction-test: deferred]`

#### Scenario: Reduced motion

- GIVEN `prefers-reduced-motion: reduce` is active
- WHEN a toast enters or exits
- THEN no CSS keyframe animation plays; the element appears/disappears instantly  `[interaction-test: deferred]`

---

### Requirement: Accessibility Contract

The toast container MUST have `aria-live="polite"` and `aria-atomic="false"`.  
Each toast item of type `success`, `info`, or `warning` MUST have `role="status"` and no explicit `aria-live`.  
Each toast item of type `error` MUST have `role="alert"` and `aria-live="assertive"`.

#### Scenario: Non-error toast a11y

- GIVEN a toast with `type="success"` is rendered
- WHEN the DOM is inspected
- THEN the element has `role="status"`  `[interaction-test: deferred]`
- AND no `aria-live` attribute is set on the element itself

#### Scenario: Error toast a11y

- GIVEN a toast with `type="error"` is rendered
- WHEN the DOM is inspected
- THEN the element has `role="alert"` and `aria-live="assertive"`  `[interaction-test: deferred]`

#### Scenario: Container a11y

- GIVEN the `ToastContainer` is mounted
- WHEN the DOM is inspected
- THEN the container has `aria-live="polite"` and `aria-atomic="false"`  `[interaction-test: deferred]`

---

### Requirement: http.ts Integration

`http.ts` MUST call `notify()` for `ApiError` responses that are NOT handled by the call site AND whose HTTP status is not `401`.  
`http.ts` MUST NOT call `notify()` for `401` responses (those are handled by the token-refresh layer).  
`http.ts` MUST NOT call `notify()` for errors that the call site owns (form errors, route-level error states).

#### Scenario: Unhandled non-401 ApiError triggers toast

- GIVEN a background request receives a 500 `ApiError` with no local handler
- WHEN the error propagates through `http.ts`
- THEN `notify()` is called once with `type="error"` and the error message

#### Scenario: 401 ApiError does not trigger toast

- GIVEN a request receives a 401 `ApiError`
- WHEN the error propagates through `http.ts`
- THEN `notify()` is NOT called

#### Scenario: Handled form error does not trigger toast

- GIVEN a form submission call site catches and displays the error inline
- WHEN the call completes with an error
- THEN `notify()` is NOT called by `http.ts`

---

### Requirement: SSR Contract

The notification store MUST return `[]` (empty array) as its server snapshot.  
`notify()` MUST NOT be called during server-side rendering.  
`useSyncExternalStore` MUST use an empty-array server snapshot so hydration produces no toast markup.

#### Scenario: Server snapshot is empty

- GIVEN SSR is executing
- WHEN `getServerSnapshot()` is called
- THEN it returns `[]`

#### Scenario: No notify calls during SSR

- GIVEN a server render pass
- WHEN all route modules and loaders execute
- THEN the notification store is never mutated

---

### Requirement: Store Unit Test Requirements

The store MUST be covered by `node:test` tests for the following behaviors:

| # | Behavior | Verifiable without JSDOM |
|---|----------|--------------------------|
| 1 | `notify()` adds an item to the store | Yes |
| 2 | Returned `id` is a non-empty string | Yes |
| 3 | Default type is `"info"` | Yes |
| 4 | Default duration matches per-type table | Yes |
| 5 | Convenience aliases set correct type/duration | Yes |
| 6 | Max-3 cap: 4th call evicts the oldest item | Yes |
| 7 | Evicted item transitions to `state="exiting"` | Yes |
| 8 | Items are ordered newest-first | Yes |
| 9 | `state` on insert is `"entering"` | Yes |
| 10 | `getServerSnapshot()` returns `[]` | Yes |
| 11 | Timer is scheduled after `visible` transition | Yes (fake timers) |
| 12 | Item is removed from store after dismiss | Yes (fake timers) |

Each of the 12 behaviors listed above MUST have at least one passing `node:test` test before the change is merged.

#### Scenario: FIFO eviction unit test

- GIVEN a store with items `[A, B, C]` (A oldest)
- WHEN `notify("D")` is called
- THEN item A has `state="exiting"` and item D is present with `state="entering"`

#### Scenario: Default duration unit test

- GIVEN `notify.error("x")` is called
- WHEN the resulting item is read
- THEN `item.duration === 6000`

#### Scenario: Server snapshot unit test

- GIVEN no prior calls
- WHEN `getServerSnapshot()` is called
- THEN the return value deep-equals `[]`

---

## Non-Goals

The following behaviors are explicitly excluded from this change:

| Excluded Behavior | Reason |
|---|---|
| Manual dismiss (close button) | v1 ships auto-dismiss only |
| Toast queue beyond 3 slots | Overflow uses immediate FIFO eviction |
| Persistent/sticky toasts | Out of scope |
| Action buttons inside toasts | Out of scope |
| Progress bar per toast | Out of scope |
| Toast history center / notification inbox | Out of scope |
| Undo action | Out of scope |
| Replacing `FormAlert` or `ErrorBoundary` | Those surfaces remain untouched |
| Component interaction tests | Blocked by no-JSDOM runner; deferred |
