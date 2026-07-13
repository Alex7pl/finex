import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthField, PasswordField, SubmitButton } from "./AuthUi.js";

test("AuthField named parts preserve native field semantics and attributes", () => {
  const html = renderToStaticMarkup(
    <AuthField.Root
      id="email"
      description="We will only use this address to sign you in."
      error="Enter a valid email."
      data-field="email"
    >
      <AuthField.Label>Email</AuthField.Label>
      <AuthField.Control
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        required
      />
      <AuthField.Description />
      <AuthField.Error />
    </AuthField.Root>,
  );

  assert.match(html, /^<div data-field="email">/);
  assert.match(html, /<label for="email"[^>]*>Email<\/label>/);
  assert.match(html, /<input[^>]*name="email"/);
  assert.match(html, /<input[^>]*type="email"/);
  assert.match(html, /<input[^>]*autoComplete="email"/);
  assert.match(html, /<input[^>]*inputMode="email"/);
  assert.match(html, /<input[^>]*placeholder="you@example.com"/);
  assert.match(html, /<input[^>]*required=""/);
  assert.match(html, /id="email"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="email-error email-description"/);
  assert.match(
    html,
    /<div id="email-description"[^>]*>We will only use this address to sign you in\.<\/div>/,
  );
  assert.match(
    html,
    /<p id="email-error"[^>]*>Enter a valid email\.<\/p>/,
  );
});

test("AuthField omits optional associations when feedback is absent", () => {
  const html = renderToStaticMarkup(
    <AuthField.Root id="username">
      <AuthField.Label>Username</AuthField.Label>
      <AuthField.Control name="username" />
      <AuthField.Description />
      <AuthField.Error />
    </AuthField.Root>,
  );

  assert.match(html, /<label for="username"[^>]*>Username<\/label>/);
  assert.match(html, /<input[^>]*id="username"/);
  assert.match(html, /aria-invalid="false"/);
  assert.doesNotMatch(html, /aria-describedby|username-description|username-error/);
});

test("SubmitButton preserves native submit state and copy", () => {
  const ready = renderToStaticMarkup(
    <SubmitButton pending={false}>Sign in</SubmitButton>,
  );
  const pending = renderToStaticMarkup(
    <SubmitButton pending={true}>Sign in</SubmitButton>,
  );

  assert.match(ready, /^<button type="submit"/);
  assert.doesNotMatch(ready, /disabled=""/);
  assert.match(ready, />Sign in<\/button>$/);
  assert.match(pending, /^<button type="submit" disabled=""/);
  assert.match(pending, /Un momento…<\/button>$/);
  assert.doesNotMatch(pending, />Sign in<\/button>$/);
});

test("PasswordField starts as a native password input with visibility copy", () => {
  const html = renderToStaticMarkup(
    <PasswordField
      id="password"
      label="Contraseña"
      name="password"
      autoComplete="current-password"
    />,
  );

  assert.match(html, /<label for="password"[^>]*>Contraseña<\/label>/);
  assert.match(html, /<input[^>]*name="password"/);
  assert.match(html, /<input[^>]*autoComplete="current-password"/);
  assert.match(html, /<input[^>]*type="password"/);
  assert.match(
    html,
    /<button type="button"[^>]*aria-label="Mostrar contraseña"[^>]*aria-pressed="false"/,
  );
});
