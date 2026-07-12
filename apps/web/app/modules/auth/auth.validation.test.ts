import assert from "node:assert/strict";
import test from "node:test";
import { passwordChecks, validateLogin, validateRegister } from "./auth.validation.js";

test("login validation reports missing and malformed credentials", () => {
  assert.deepEqual(validateLogin({ email: "", password: "" }), {
    email: "Introduce tu correo electrónico.",
    password: "Introduce tu contraseña.",
  });
  assert.equal(validateLogin({ email: "not-an-email", password: "secret" }).email, "Introduce un correo válido.");
  assert.deepEqual(validateLogin({ email: "user@finex.app", password: "secret" }), {});
});

test("registration requires a strong password and consent", () => {
  const errors = validateRegister({ username: "A", email: "wrong", password: "weak", terms: false });
  assert.ok(errors.username);
  assert.ok(errors.email);
  assert.ok(errors.password);
  assert.ok(errors.terms);

  assert.deepEqual(validateRegister({ username: "Alex", email: "alex@finex.app", password: "Finex2026", terms: true }), {});
  assert.ok(passwordChecks("Finex2026").every((check) => check.valid));
});
