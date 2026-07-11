import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import http from "node:http";
import test from "node:test";
import express from "express";
import { Effect } from "effect";
import { DatabaseError } from "@/shared/errors.js";
import { errorMiddleware } from "@/middleware/error.middleware.js";
import { AuthRepository } from "./auth.repository.js";
import type { RefreshTokenRecord } from "./auth.repository.js";
import { UserRepository } from "../users/users.repository.js";
import type { runPublic } from "@/runtime/run-request.js";

process.env.DATABASE_URL = "postgres://test:test@localhost/test";
process.env.JWT_ACCESS_SECRET = "access-secret-at-least-thirty-two-characters";
process.env.JWT_REFRESH_SECRET = "refresh-secret-at-least-thirty-two-characters";
process.env.JWT_ISSUER = "finex-test";
process.env.JWT_AUDIENCE = "finex-test-api";
process.env.JWT_ACCESS_EXPIRES_IN_SECONDS = "900";
process.env.JWT_REFRESH_EXPIRES_IN_SECONDS = "604800";

const { createAuthRouter } = await import("./auth.handlers.js");

const user = {
  id: "8eb5a286-0d46-4f0e-a93f-f1681a6cb021",
  email: "user@test.dev",
  passsword: "plain-text-password",
};

async function requestLogin(
  saveRefreshToken: (
    record: RefreshTokenRecord,
  ) => Effect.Effect<void, DatabaseError>,
) {
  let persisted = false;
  const runWithRepositories = ((_context: unknown, program: Effect.Effect<unknown, unknown, unknown>) =>
    program.pipe(
      Effect.provideService(UserRepository, {
        findUser: () => Effect.succeed(user),
      }),
      Effect.provideService(AuthRepository, {
        saveRefreshToken: (record) =>
          saveRefreshToken(record).pipe(
            Effect.tap(() => Effect.sync(() => void (persisted = true))),
          ),
      }),
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
    const body = JSON.stringify({ email: user.email, password: user.passsword });
    const response = await new Promise<{ status: number; body: unknown }>((resolve, reject) => {
      const request = http.request(
        {
          host: "127.0.0.1",
          port,
          path: "/auth/login",
          method: "GET",
          headers: {
            "content-type": "application/json",
            "content-length": Buffer.byteLength(body),
          },
        },
        (incoming) => {
          const chunks: Buffer[] = [];
          incoming.on("data", (chunk) => chunks.push(chunk));
          incoming.on("end", () =>
            resolve({
              status: incoming.statusCode!,
              body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
            }),
          );
        },
      );
      request.once("error", reject);
      request.end(body);
    });
    return { ...response, persisted };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test("returns the exact login contract after persisting the refresh token", async () => {
  const response = await requestLogin(() => Effect.void);

  assert.equal(response.status, 200);
  assert.equal(response.persisted, true);
  assert.deepEqual(Object.keys(response.body as object).sort(), [
    "accessToken",
    "email",
    "id",
    "refreshToken",
  ]);
  const body = response.body as Record<string, unknown>;
  assert.equal(body.id, user.id);
  assert.equal(body.email, user.email);
  assert.equal(typeof body.accessToken, "string");
  assert.equal(typeof body.refreshToken, "string");
});

test("returns the centralized database error when persistence fails", async () => {
  const response = await requestLogin(() =>
    Effect.fail(new DatabaseError({ message: "insert failed" })),
  );

  assert.equal(response.status, 500);
  assert.equal(response.persisted, false);
  assert.deepEqual(response.body, {
    error: { code: "DatabaseError", requestId: "request-123" },
  });
});
