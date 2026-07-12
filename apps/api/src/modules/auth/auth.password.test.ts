import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "./auth.password.js";

test("hashes new passwords and verifies only the matching value", async () => {
  const password = "StrongPass2026";
  const hashed = await hashPassword(password);

  assert.match(hashed, /^scrypt\$/);
  assert.notEqual(hashed, password);
  assert.equal(await verifyPassword(password, hashed), true);
  assert.equal(await verifyPassword("WrongPass2026", hashed), false);
});

test("temporarily accepts legacy plaintext records without unsafe length comparisons", async () => {
  assert.equal(await verifyPassword("legacy", "legacy"), true);
  assert.equal(await verifyPassword("different-length", "legacy"), false);
});
