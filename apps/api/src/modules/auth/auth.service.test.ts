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

const [{ login, refresh, register }, { AuthRepository }, { createRefreshToken, hashRefreshToken }, { UserRepository }] =
  await Promise.all([
    import("./auth.service.js"),
    import("./auth.repository.js"),
    import("./auth.tokens.js"),
    import("../users/users.repository.js"),
  ]);

const user = {
  id: "8eb5a286-0d46-4f0e-a93f-f1681a6cb021",
  email: "user@test.dev",
  username: "Test user",
  password: "plain-text-password",
};

const userRepository = {
  findProfileById: () => Effect.succeed(null),
  updateProfile: () => Effect.succeed(null),
  findUser: () => Effect.succeed(user),
  findUserById: () => Effect.succeed(user),
  createUser: () => Effect.succeed(user),
};

function authRepository(overrides: Partial<{
  saveRefreshToken: typeof AuthRepository.Service.saveRefreshToken;
  findRefreshToken: typeof AuthRepository.Service.findRefreshToken;
  rotateRefreshToken: typeof AuthRepository.Service.rotateRefreshToken;
  revokeFamily: typeof AuthRepository.Service.revokeFamily;
}> = {}) {
  return {
    saveRefreshToken: () => Effect.void,
    findRefreshToken: () => Effect.succeed(null),
    rotateRefreshToken: () => Effect.succeed("missing" as const),
    revokeFamily: () => Effect.void,
    ...overrides,
  };
}

test("persists the refresh token hash before returning the login response", async () => {
  let persisted: RefreshTokenRecord | undefined;
  const program = login({ email: user.email, password: user.password }).pipe(
    Effect.provideService(UserRepository, userRepository),
    Effect.provideService(AuthRepository, authRepository({
      saveRefreshToken: (record) => Effect.sync(() => void (persisted = record)),
    })),
  );

  const response = await Effect.runPromise(program);

  assert.equal(response.body.id, user.id);
  assert.equal(response.body.email, user.email);
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
  const program = login({ email: user.email, password: user.password }).pipe(
    Effect.provideService(UserRepository, userRepository),
    Effect.provideService(AuthRepository, authRepository({
      saveRefreshToken: () => Effect.fail(databaseError),
    })),
  );

  const result = await Effect.runPromise(Effect.either(program));

  assert.equal(result._tag, "Left");
  if (result._tag === "Left") assert.equal(result.left, databaseError);
});

test("register creates a hashed user and persists a refresh token", async () => {
  let createdPassword = "";
  let persisted: RefreshTokenRecord | undefined;
  const program = register({
    username: user.username,
    email: user.email.toUpperCase(),
    password: "StrongPass2026",
  }).pipe(
    Effect.provideService(UserRepository, {
      ...userRepository,
      createUser: (input) => {
        createdPassword = input.password;
        return Effect.succeed({ ...user, email: input.email, username: input.username, password: input.password });
      },
    }),
    Effect.provideService(AuthRepository, authRepository({
      saveRefreshToken: (record) => Effect.sync(() => void (persisted = record)),
    })),
  );

  const response = await Effect.runPromise(program);
  assert.equal(response.body.email, user.email);
  assert.equal(response.body.username, user.username);
  assert.match(createdPassword, /^scrypt\$/);
  assert.notEqual(createdPassword, "StrongPass2026");
  assert.equal(persisted?.userId, user.id);
});

test("rotates a valid refresh token in the same family", async () => {
  const familyId = "846dd67f-277a-4373-bf11-26fbf8bbdcf4";
  const rawToken = createRefreshToken({ user_id: user.id, family_id: familyId });
  const expiresAt = new Date(Date.now() + 60_000);
  let replacement: RefreshTokenRecord | undefined;
  const program = refresh(rawToken).pipe(
    Effect.provideService(UserRepository, userRepository),
    Effect.provideService(AuthRepository, authRepository({
      findRefreshToken: () => Effect.succeed({
        userId: user.id,
        familyId,
        tokenHash: hashRefreshToken(rawToken),
        expiresAt,
        revokedAt: null,
      }),
      rotateRefreshToken: (_oldHash, record) =>
        Effect.sync(() => {
          replacement = record;
          return "rotated" as const;
        }),
    })),
  );

  const result = await Effect.runPromise(program);
  assert.equal(result.body.success, true);
  assert.equal(replacement?.familyId, familyId);
  assert.equal(replacement?.tokenHash, hashRefreshToken(result.refreshToken));
  assert.notEqual(result.refreshToken, rawToken);
});

test("revokes a known expired or reused token family", async () => {
  const familyId = "846dd67f-277a-4373-bf11-26fbf8bbdcf4";
  const expired = jwt.sign(
    { sub: user.id, familyId, jti: "expired-token", tokenType: "refresh" },
    process.env.JWT_REFRESH_SECRET!,
    { algorithm: "HS256", issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE, expiresIn: -1 },
  );
  let revoked = 0;
  const repository = authRepository({
    findRefreshToken: () => Effect.succeed({
      userId: user.id,
      familyId,
      tokenHash: hashRefreshToken(expired),
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
    }),
    revokeFamily: () => Effect.sync(() => void (revoked += 1)),
  });

  const result = await Effect.runPromise(refresh(expired).pipe(
    Effect.provideService(UserRepository, userRepository),
    Effect.provideService(AuthRepository, repository),
    Effect.either,
  ));
  assert.equal(result._tag, "Left");
  assert.equal(revoked, 1);
});

test("rejects malformed refresh tokens before any repository call", async () => {
  let repositoryCalls = 0;
  const databaseError = new DatabaseError({ message: "repository must not run" });
  const result = await Effect.runPromise(refresh("not-a-jwt").pipe(
    Effect.provideService(UserRepository, userRepository),
    Effect.provideService(AuthRepository, authRepository({
      findRefreshToken: () => {
        repositoryCalls += 1;
        return Effect.fail(databaseError);
      },
      revokeFamily: () => {
        repositoryCalls += 1;
        return Effect.fail(databaseError);
      },
    })),
    Effect.either,
  ));
  assert.equal(result._tag, "Left");
  if (result._tag === "Left") assert.equal(result.left._tag, "UnauthorizedError");
  assert.equal(repositoryCalls, 0);
});

test("allows exactly one concurrent rotation and revokes the family on reuse", async () => {
  const familyId = "846dd67f-277a-4373-bf11-26fbf8bbdcf4";
  const rawToken = createRefreshToken({ user_id: user.id, family_id: familyId });
  let active = true;
  let revoked = 0;
  const repository = authRepository({
    findRefreshToken: () => Effect.succeed({
      userId: user.id,
      familyId,
      tokenHash: hashRefreshToken(rawToken),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    }),
    rotateRefreshToken: () => Effect.sync(() => {
      if (!active) return "reused" as const;
      active = false;
      return "rotated" as const;
    }),
    revokeFamily: () => Effect.sync(() => void (revoked += 1)),
  });
  const run = () => Effect.runPromise(refresh(rawToken).pipe(
    Effect.provideService(UserRepository, userRepository),
    Effect.provideService(AuthRepository, repository),
    Effect.either,
  ));

  const results = await Promise.all([run(), run()]);
  assert.equal(results.filter((result) => result._tag === "Right").length, 1);
  assert.equal(results.filter((result) => result._tag === "Left").length, 1);
  assert.ok(revoked >= 1);
});
