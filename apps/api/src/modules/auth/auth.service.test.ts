import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseError } from "@/shared/errors.js";
import { Effect } from "effect";
import jwt from "jsonwebtoken";
import type { RefreshTokenRecord } from "./auth.repository.js";

process.env.DATABASE_URL = "postgres://test:test@localhost/test";
process.env.JWT_ACCESS_SECRET = "access-secret-at-least-thirty-two-characters";
process.env.JWT_REFRESH_SECRET = "refresh-secret-at-least-thirty-two-characters";
process.env.JWT_ISSUER = "finex-test";
process.env.JWT_AUDIENCE = "finex-test-api";
process.env.JWT_ACCESS_EXPIRES_IN_SECONDS = "900";
process.env.JWT_REFRESH_EXPIRES_IN_SECONDS = "604800";

const [{ login }, { AuthRepository }, { hashRefreshToken }, { UserRepository }] =
  await Promise.all([
    import("./auth.service.js"),
    import("./auth.repository.js"),
    import("./auth.tokens.js"),
    import("../users/users.repository.js"),
  ]);

const user = {
  id: "8eb5a286-0d46-4f0e-a93f-f1681a6cb021",
  email: "user@test.dev",
  passsword: "plain-text-password",
};

test("persists the refresh token hash before returning the login response", async () => {
  let persisted: RefreshTokenRecord | undefined;
  const program = login({ email: user.email, password: user.passsword }).pipe(
    Effect.provideService(UserRepository, {
      findUser: () => Effect.succeed(user),
    }),
    Effect.provideService(AuthRepository, {
      saveRefreshToken: (record) => Effect.sync(() => void (persisted = record)),
    }),
  );

  const response = await Effect.runPromise(program);

  assert.equal(response.id, user.id);
  assert.equal(response.email, user.email);
  assert.ok(response.accessToken);
  assert.ok(response.refreshToken);
  assert.ok(persisted);
  assert.equal(persisted.userId, user.id);
  assert.equal(persisted.tokenHash, hashRefreshToken(response.refreshToken));
  assert.notEqual(persisted.tokenHash, response.refreshToken);

  const payload = jwt.verify(
    response.refreshToken,
    process.env.JWT_REFRESH_SECRET!,
  );
  assert.ok(typeof payload === "object");
  assert.equal(payload.familyId, persisted.familyId);
  assert.equal(persisted.expiresAt.getTime(), payload.exp! * 1000);
});

test("fails login without returning tokens when refresh persistence fails", async () => {
  const databaseError = new DatabaseError({ message: "insert failed" });
  const program = login({ email: user.email, password: user.passsword }).pipe(
    Effect.provideService(UserRepository, {
      findUser: () => Effect.succeed(user),
    }),
    Effect.provideService(AuthRepository, {
      saveRefreshToken: () => Effect.fail(databaseError),
    }),
  );

  const result = await Effect.runPromise(Effect.either(program));

  assert.equal(result._tag, "Left");
  if (result._tag === "Left") assert.equal(result.left, databaseError);
});
