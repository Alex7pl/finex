# Component Composition

Use React composition to make required structural variation explicit. This is a
forward convention for new components and components undergoing substantial
change, not a mandate to rewrite existing UI.

## Start with state ownership

Before choosing an API, identify the owner of each kind of state:

- Routes and feature modules keep business state, submission, validation, and
  navigation or fetcher lifecycle.
- A component may own narrow presentation state, such as whether its password
  input is visible.
- Named parts must not move feature state into a shared component context.

## Choose the smallest useful API

Keep a component as a focused prop-based leaf when callers use one stable
structure. A button or alert does not become a compound component merely for API
symmetry.

Use named parts when callers have a demonstrated need to arrange meaningful
sub-elements differently while preserving their relationship. Prefer a small,
feature-local API:

```tsx
<AuthField.Root error={error} description={hint}>
  <AuthField.Label>Email</AuthField.Label>
  <AuthField.Control name="email" type="email" />
  <AuthField.Description />
  <AuthField.Error />
</AuthField.Root>
```

Named parts should render semantic HTML directly. Preserve native forms, labels,
inputs, buttons, and their normal submission and keyboard behavior rather than
hiding them behind generic slots or polymorphic wrappers.

## Keep context local

Prefer explicit props and `children`. React context is justified only for a
tight relationship inside one component root, such as sharing a control ID,
description ID, error ID, and invalid state between field parts.

Local component context must not become an application store, coordinate forms
or routes, or own submission and validation state.

## Explicit exclusions

This convention does not authorize:

- Radix or another component or primitives library;
- recreated Radix behavior or generic slot/`asChild` APIs;
- new dialog, tab, focus-management, focus-trap, portal, or browser
  infrastructure;
- new accessibility or DOM testing infrastructure;
- an application-wide component migration or design-system layer.

If a requested composition needs those capabilities, treat it as separate
product and architecture work instead of expanding a local component.

## Review checklist

- [ ] State owners are named and existing feature ownership remains intact.
- [ ] Named parts solve demonstrated structural variation.
- [ ] Simple leaves remain simple prop-based components.
- [ ] Native semantic elements and behavior are preserved.
- [ ] Context, if present, is private and limited to one local relationship.
- [ ] No component library or recreated primitive behavior was introduced.
- [ ] No dialog, tab, focus, portal, browser, accessibility, or DOM tooling
      infrastructure was added.
- [ ] Tests cover the native markup and relationships that composition could
      accidentally change.
