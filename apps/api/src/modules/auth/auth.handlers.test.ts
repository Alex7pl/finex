import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { errorMiddleware } from "@/middleware/error.middleware.js";
import { DatabaseError } from "@/shared/errors.js";
import express from "express";
import { Effect } from "effect";
import type { runPublic } from "@/runtime/run-request.js";
import { UserRepository } from "../users/users.repository.js";
import { AuthRepository } from "./auth.repository.js";

process.env.DATABASE_URL = "postgres://test:test@localhost/test";
process.env.WEB_ORIGIN = "https://web.example.com";
process.env.JWT_ACCESS_SECRET = "access-secret-at-least-thirty-two-characters";
process.env.JWT_REFRESH_SECRET = "refresh-secret-at-least-thirty-two-characters";
process.env.JWT_ISSUER = "finex-test";
process.env.JWT_AUDIENCE = "finex-test-api";
process.env.JWT_ACCESS_EXPIRES_IN_SECONDS = "900";
process.env.JWT_REFRESH_EXPIRES_IN_SECONDS = "604800";

const [{ createAuthRouter }, { createRefreshToken, hashRefreshToken }] = await Promise.all([
  import("./auth.handlers.js"),
  import("./auth.tokens.js"),
]);

const user = {
  id: "8eb5a286-0d46-4f0e-a93f-f1681a6cb021",
  email: "user@test.dev",
  username: "Test user",
  password: "plain-text-password",
};

type AuthRepositoryService = typeof AuthRepository.Service;

function repository(overrides: Partial<AuthRepositoryService> = {}): AuthRepositoryService {
  return {
    saveRefreshToken: () => Effect.void,
    findRefreshToken: () => Effect.succeed(null),
    rotateRefreshToken: () => Effect.succeed("missing"),
    revokeFamily: () => Effect.void,
    ...overrides,
  };
}

async function requestAuth(input: {
  path: "/auth/login" | "/auth/register" | "/auth/refresh";
  repository?: AuthRepositoryService;
  cookie?: string;
  origin?: string;
  referer?: string;
}) {
  const runWithRepositories = ((_context: unknown, program: Effect.Effect<unknown, unknown, unknown>) =>
    program.pipe(
      Effect.provideService(UserRepository, {
        findUser: () => Effect.succeed(user),
        findUserById: () => Effect.succeed(user),
        createUser: () => Effect.succeed(user),
      }),
      Effect.provideService(AuthRepository, input.repository ?? repository()),
    )) as typeof runPublic;
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.locals.requestId = "request-123";
    res.locals.user = null;
    next();
  });
  app.use("/auth", createAuthRouter(runWithRepositories));
  app.use(errorMiddleware);
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const { port } = server.address() as AddressInfo;
    const body = input.path.endsWith("login")
      ? JSON.stringify({ email: user.email, password: user.password })
      : input.path.endsWith("register")
        ? JSON.stringify({ username: user.username, email: user.email, password: "StrongPass2026" })
        : "";
    const headers: Record<string, string | number> = {};
    if (body) {
      headers["content-type"] = "application/json";
      headers["content-length"] = Buffer.byteLength(body);
    }
    if (input.cookie) headers.cookie = input.cookie;
    if (input.origin) headers.origin = input.origin;
    if (input.referer) headers.referer = input.referer;

    return await new Promise<{ status: number; body: unknown; cookies: string[] }>((resolve, reject) => {
      const request = http.request(
        { host: "127.0.0.1", port, path: input.path, method: "POST", headers },
        (incoming) => {
          const chunks: Buffer[] = [];
          incoming.on("data", (chunk) => chunks.push(chunk));
          incoming.on("end", () => {
            const rawBody = Buffer.concat(chunks).toString("utf8");
            resolve({
              status: incoming.statusCode!,
              body: rawBody ? JSON.parse(rawBody) : null,
              cookies: incoming.headers["set-cookie"] ?? [],
            });
          });
        },
      );
      request.once("error", reject);
      request.end(body);
    });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

function assertAuthCookies(cookies: string[]) {
  assert.match(cookies[0], /^accessToken=.*; Max-Age=900; Path=\/; Expires=.*; HttpOnly; SameSite=Lax$/);
  assert.match(cookies[1], /^refreshToken=.*; Max-Age=604800; Path=\/; Expires=.*; HttpOnly; SameSite=Lax$/);
}

function assertDeletedCookies(cookies: string[]) {
  assert.deepEqual(cookies, [
    "accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
    "refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
  ]);
}

test("login returns only non-sensitive data and root-scoped auth cookies", async () => {
  let persisted = false;
  const response = await requestAuth({
    path: "/auth/login",
    origin: "https://web.example.com",
    repository: repository({
      saveRefreshToken: () => Effect.sync(() => void (persisted = true)),
    }),
  });

  assert.equal(response.status, 200);
  assert.equal(persisted, true);
  assert.deepEqual(response.body, { id: user.id, email: user.email });
  assert.equal("accessToken" in (response.body as object), false);
  assert.equal("refreshToken" in (response.body as object), false);
  assertAuthCookies(response.cookies);
});

test("register returns only public profile data and starts a secure session", async () => {
  const response = await requestAuth({
    path: "/auth/register",
    origin: "https://web.example.com",
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { id: user.id, email: user.email, username: user.username });
  assert.equal("password" in (response.body as object), false);
  assertAuthCookies(response.cookies);
});

test("cookie-minting endpoints accept trusted exact Origin and Referer", async () => {
  for (const headers of [
    { origin: "https://web.example.com" },
    { referer: "https://web.example.com/login" },
  ]) {
    const response = await requestAuth({ path: "/auth/login", ...headers });
    assert.equal(response.status, 200);
  }
});

test("cookie-minting endpoints reject absent, hostile, or malformed provenance", async () => {
  for (const headers of [
    {},
    { origin: "https://evil.example" },
    { referer: "https://evil.example/login" },
    { origin: "https://web.example.com/login" },
    { origin: "https://web.example.com?next=/login" },
    { origin: "https://web.example.com#login" },
    { origin: "https://user:password@web.example.com" },
    { origin: "not a valid origin" },
    { referer: "not a valid referer" },
  ]) {
    const response = await requestAuth({ path: "/auth/login", ...headers });
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, {
      error: { code: "UnauthorizedError", requestId: "request-123" },
    });
    assert.deepEqual(response.cookies, []);
  }
});

test("refresh rotates cookies and returns the exact non-sensitive success contract", async () => {
  const familyId = "846dd67f-277a-4373-bf11-26fbf8bbdcf4";
  const token = createRefreshToken({ user_id: user.id, family_id: familyId });
  const response = await requestAuth({
    path: "/auth/refresh",
    cookie: `refreshToken=${encodeURIComponent(token)}`,
    origin: "https://web.example.com",
    repository: repository({
      findRefreshToken: () => Effect.succeed({
        userId: user.id,
        familyId,
        tokenHash: hashRefreshToken(token),
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      }),
      rotateRefreshToken: () => Effect.succeed("rotated"),
    }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { success: true });
  assert.equal("accessToken" in (response.body as object), false);
  assert.equal("refreshToken" in (response.body as object), false);
  assertAuthCookies(response.cookies);
});

test("missing, malformed, and valid-but-unknown refresh tokens return 401 and delete both cookies", async () => {
  const unknown = createRefreshToken({
    user_id: user.id,
    family_id: "846dd67f-277a-4373-bf11-26fbf8bbdcf4",
  });
  for (const cookie of [undefined, "refreshToken=not-a-jwt", `refreshToken=${unknown}`]) {
    const response = await requestAuth({
      path: "/auth/refresh",
      cookie,
      origin: "https://web.example.com",
    });
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, {
      error: { code: "UnauthorizedError", requestId: "request-123" },
    });
    assertDeletedCookies(response.cookies);
  }
});

test("known reused and expired refresh tokens revoke their stored family", async () => {
  const familyId = "846dd67f-277a-4373-bf11-26fbf8bbdcf4";
  const valid = createRefreshToken({ user_id: user.id, family_id: familyId });
  const expired = await import("jsonwebtoken").then(({ default: jwt }) =>
    jwt.sign(
      { sub: user.id, familyId, jti: "expired-http-token", tokenType: "refresh" },
      process.env.JWT_REFRESH_SECRET!,
      {
        algorithm: "HS256",
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
        expiresIn: -1,
      },
    ),
  );
  let revoked = 0;
  const stored = (token: string) => ({
    userId: user.id,
    familyId,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: token === valid ? new Date() : null,
  });

  for (const token of [valid, expired]) {
    const response = await requestAuth({
      path: "/auth/refresh",
      cookie: `refreshToken=${token}`,
      origin: "https://web.example.com",
      repository: repository({
        findRefreshToken: () => Effect.succeed(stored(token)),
        revokeFamily: () => Effect.sync(() => void (revoked += 1)),
      }),
    });
    assert.equal(response.status, 401);
    assertDeletedCookies(response.cookies);
  }
  assert.equal(revoked, 2);
});

test("login preserves centralized database failures", async () => {
  const response = await requestAuth({
    path: "/auth/login",
    origin: "https://web.example.com",
    repository: repository({
      saveRefreshToken: () => Effect.fail(new DatabaseError({ message: "insert failed" })),
    }),
  });
  assert.equal(response.status, 500);
  assert.deepEqual(response.body, {
    error: { code: "DatabaseError", requestId: "request-123" },
  });
});
