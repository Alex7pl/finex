import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";

process.env.DATABASE_URL = "postgres://test:test@localhost/test";
process.env.JWT_ACCESS_SECRET = "access-secret-at-least-thirty-two-characters";
process.env.JWT_REFRESH_SECRET = "refresh-secret-at-least-thirty-two-characters";
process.env.JWT_ISSUER = "finex-test";
process.env.JWT_AUDIENCE = "finex-test-api";
process.env.JWT_ACCESS_EXPIRES_IN_SECONDS = "900";
process.env.JWT_REFRESH_EXPIRES_IN_SECONDS = "604800";

const {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = await import("./auth.tokens.js");

test("signs and verifies access and refresh JWTs with separate secrets", () => {
  const userId = "8eb5a286-0d46-4f0e-a93f-f1681a6cb021";
  const familyId = "846dd67f-277a-4373-bf11-26fbf8bbdcf4";
  const accessToken = createAccessToken({ user_id: userId, email: "user@test.dev" });
  const refreshToken = createRefreshToken({ user_id: userId, family_id: familyId });

  const accessPayload = verifyAccessToken(accessToken);
  assert.equal(accessPayload?.sub, userId);
  assert.equal(accessPayload?.email, "user@test.dev");
  assert.equal(accessPayload?.tokenType, "access");
  const verifiedRefreshPayload = verifyRefreshToken(refreshToken);
  assert.equal(verifiedRefreshPayload?.sub, userId);
  assert.equal(verifiedRefreshPayload?.familyId, familyId);
  assert.equal(verifiedRefreshPayload?.tokenType, "refresh");
  assert.equal(
    verifyAccessToken(
      jwt.sign({ sub: userId, email: "user@test.dev" }, process.env.JWT_REFRESH_SECRET!),
    ),
    null,
  );

  const refreshPayload = jwt.decode(refreshToken);
  assert.ok(refreshPayload && typeof refreshPayload !== "string");
  assert.equal(refreshPayload.exp! - refreshPayload.iat!, 604800);
});

test("rejects malformed, expired, wrong-secret, and invalid access tokens", () => {
  const claims = {
    sub: "8eb5a286-0d46-4f0e-a93f-f1681a6cb021",
    email: "user@test.dev",
    tokenType: "access",
  };
  const options = {
    algorithm: "HS256" as const,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  };

  assert.equal(verifyAccessToken("not-a-jwt"), null);
  assert.equal(
    verifyAccessToken(
      jwt.sign(claims, process.env.JWT_ACCESS_SECRET!, {
        ...options,
        expiresIn: -1,
      }),
    ),
    null,
  );
  assert.equal(
    verifyAccessToken(jwt.sign(claims, "different-secret-at-least-thirty-two-characters", options)),
    null,
  );
  assert.equal(
    verifyAccessToken(
      jwt.sign({ sub: claims.sub, tokenType: "access" }, process.env.JWT_ACCESS_SECRET!, options),
    ),
    null,
  );
});

test("rejects wrong issuer, audience, algorithm, and token class", () => {
  const userId = "8eb5a286-0d46-4f0e-a93f-f1681a6cb021";
  const sharedSecret = process.env.JWT_ACCESS_SECRET!;
  const base = {
    sub: userId,
    email: "user@test.dev",
    tokenType: "access",
  };

  for (const token of [
    jwt.sign(base, sharedSecret, {
      algorithm: "HS256",
      issuer: "wrong-issuer",
      audience: process.env.JWT_AUDIENCE,
    }),
    jwt.sign(base, sharedSecret, {
      algorithm: "HS256",
      issuer: process.env.JWT_ISSUER,
      audience: "wrong-audience",
    }),
    jwt.sign(base, sharedSecret, {
      algorithm: "HS384",
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    }),
  ]) {
    assert.equal(verifyAccessToken(token), null);
  }

  const refreshToken = jwt.sign(
    { sub: userId, familyId: "family", tokenType: "refresh" },
    sharedSecret,
    {
      algorithm: "HS256",
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    },
  );
  assert.equal(verifyAccessToken(refreshToken), null);
  const accessTokenWithRefreshSecret = jwt.sign(base, process.env.JWT_REFRESH_SECRET!, {
    algorithm: "HS256",
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  });
  assert.equal(verifyRefreshToken(accessTokenWithRefreshSecret), null);
});

test("rejects malformed, expired, mis-signed, and invalid refresh tokens", () => {
  const claims = {
    sub: "8eb5a286-0d46-4f0e-a93f-f1681a6cb021",
    familyId: "846dd67f-277a-4373-bf11-26fbf8bbdcf4",
    jti: "refresh-token-id",
    tokenType: "refresh",
  };
  const secret = process.env.JWT_REFRESH_SECRET!;
  const options = {
    algorithm: "HS256" as const,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  };

  assert.equal(verifyRefreshToken("not-a-jwt"), null);
  for (const token of [
    jwt.sign(claims, secret, { ...options, expiresIn: -1 }),
    jwt.sign(claims, "different-secret-at-least-thirty-two-characters", options),
    jwt.sign(claims, secret, { ...options, issuer: "wrong-issuer" }),
    jwt.sign(claims, secret, { ...options, audience: "wrong-audience" }),
    jwt.sign(claims, secret, { ...options, algorithm: "HS384" }),
    jwt.sign({ sub: claims.sub, tokenType: "refresh" }, secret, options),
    jwt.sign(
      { sub: claims.sub, email: "user@test.dev", tokenType: "access" },
      secret,
      options,
    ),
  ]) {
    assert.equal(verifyRefreshToken(token), null);
  }
});
