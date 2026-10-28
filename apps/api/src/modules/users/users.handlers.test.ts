import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import { Effect, Schema } from "effect";
import { UnauthorizedError } from "@finex/shared/errors.js";
import { UserAlreadyExists } from "@finex/shared/auth/auth.errors.js";
import { UserProfile } from "@finex/shared/users/users.schema.js";
import { errorMiddleware } from "@/middleware/error.middleware.js";
import { CurrentUser } from "@/runtime/request-context.js";
import type { runProtected } from "@/runtime/run-request.js";
import { env } from "@/config/env.js";
import { createApp } from "@/app.js";
import { verifyAccessToken } from "../auth/auth.tokens.js";
import { UserRepository } from "./users.repository.js";
import { createUsersRouter } from "./users.router.js";

const user = { id: "00000000-0000-4000-8000-000000000001", email: "old@example.com" };
const profile = { ...user, username: "Ana", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" };

test("profile HTTP contracts, authentication, origin protection and renewed access cookie", async () => {
  let authenticated = true;
  let calls = 0;
  let missing = false;
  let conflict = false;
  const repo: typeof UserRepository.Service = {
    findUser: () => Effect.succeed(null),
    createUser: () => Effect.die("not used"),
    findUserById: () => Effect.succeed({ ...user, username: profile.username, password: "current-password" }),
    findProfileById: () => { calls++; return Effect.succeed(missing ? null : profile); },
    updateProfile: (_id, input) => {
      calls++;
      return conflict ? Effect.fail(new UserAlreadyExists({ message: "private conflict data" }))
        : Effect.succeed({ ...profile, ...input });
    },
  };
  const run = ((data: { user: typeof user | null }, program: Effect.Effect<unknown, unknown, CurrentUser | UserRepository>) =>
    data.user ? program.pipe(Effect.provideService(CurrentUser, data.user), Effect.provideService(UserRepository, repo))
      : Effect.fail(new UnauthorizedError())) as typeof runProtected;
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.locals.requestId = "profile-test";
    res.locals.user = authenticated ? user : null;
    next();
  });
  app.use("/users", createUsersRouter(run));
  app.use(errorMiddleware);
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    const request = (method: string, body?: unknown, origin = env.WEB_ORIGIN) => fetch(`http://127.0.0.1:${port}/users/me`, {
      method, headers: { origin, "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const read = await request("GET");
    assert.equal(read.status, 200);
    assert.deepEqual(Schema.decodeUnknownSync(UserProfile)(await read.json()), profile);
    assert.equal(read.headers.get("set-cookie"), null);
    const updated = await request("PATCH", { email: "new@example.com", current_password: "current-password" });
    assert.equal(updated.status, 200);
    assert.deepEqual(await updated.json(), { ...profile, email: "new@example.com" });
    const cookies = updated.headers.getSetCookie();
    assert.equal(cookies.length, 1);
    assert.match(cookies[0]!, /^accessToken=.*; Max-Age=\d+; Path=\/; Expires=.*; HttpOnly; SameSite=Lax/);
    const token = decodeURIComponent(cookies[0]!.split(";")[0]!.slice("accessToken=".length));
    assert.equal(verifyAccessToken(token)?.email, "new@example.com");
    const before = calls;
    for (const origin of ["https://evil.example", "null"]) {
      assert.equal((await request("PATCH", { username: "New" }, origin)).status, 401);
    }
    assert.equal(calls, before);
    authenticated = false;
    assert.equal((await request("GET")).status, 401);
    assert.equal((await request("PATCH", { username: "New" })).status, 401);
    assert.equal(calls, before);
    authenticated = true;
    const invalid = await request("PATCH", { id: user.id });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.headers.get("set-cookie"), null);
    conflict = true;
    const duplicate = await request("PATCH", { username: "Taken" });
    assert.equal(duplicate.status, 409);
    assert.deepEqual(await duplicate.json(), { error: { code: "UserAlreadyExists", requestId: "profile-test" } });
    assert.equal(duplicate.headers.get("set-cookie"), null);
    missing = true;
    assert.equal((await request("GET")).status, 404);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("real app mounts /users/me and protects it without a session", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  try {
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    assert.equal((await fetch(`http://127.0.0.1:${port}/users/me`)).status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
