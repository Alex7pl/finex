import assert from "node:assert/strict";
import test from "node:test";
import { Effect } from "effect";
import { UserAlreadyExists } from "@finex/shared/auth/auth.errors.js";
import { CurrentUser } from "@/runtime/request-context.js";
import { hashPassword } from "../auth/auth.password.js";
import { UserRepository } from "./users.repository.js";
import { getMyProfile, updateMyProfile } from "./users.service.js";

const user = { id: "00000000-0000-4000-8000-000000000001", email: "old@example.com" };
const profile = { ...user, username: "Ana", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" };
const password = await hashPassword("StrongPass2026");
function repository(overrides: Partial<typeof UserRepository.Service> = {}): typeof UserRepository.Service {
  return {
    findUser: () => Effect.succeed(null),
    createUser: () => Effect.die("not used"),
    findUserById: () => Effect.succeed({ ...user, username: profile.username, password }),
    findProfileById: (id) => {
      assert.equal(id, user.id);
      return Effect.succeed(profile);
    },
    updateProfile: (id, input) => {
      assert.equal(id, user.id);
      return Effect.succeed({ ...profile, ...input });
    },
    ...overrides,
  };
}
function run<A, E>(program: Effect.Effect<A, E, CurrentUser | UserRepository>, repo = repository()) {
  return Effect.runPromise(program.pipe(
    Effect.provideService(CurrentUser, user), Effect.provideService(UserRepository, repo), Effect.either,
  ));
}

test("my profile reads persisted data by authenticated ID and trims username updates", async () => {
  const result = await run(getMyProfile());
  assert.equal(result._tag, "Right");
  if (result._tag === "Right") assert.deepEqual(result.right, profile);
  const updated = await run(updateMyProfile({ username: "  Ana López  " }), repository({
    findUserById: () => Effect.die("Username editing must not read credentials"),
  }));
  assert.equal(updated._tag, "Right");
  if (updated._tag === "Right") assert.equal(updated.right.username, "Ana López");
});

test("profile updates reject mass assignment and invalid/empty input before database access", async () => {
  let calls = 0;
  const repo = repository({ findProfileById: () => { calls++; return Effect.succeed(profile); } });
  for (const input of [
    {}, null, [], { username: " " }, { username: "A" }, { username: "x".repeat(41) },
    { email: "invalid" }, { email: "a".repeat(255) + "@x.com" },
    { id: user.id, username: "Other" }, { password: "new password" },
    { current_password: "StrongPass2026" }, { username: "Ana", role: "admin" },
  ]) {
    const result = await run(updateMyProfile(input), repo);
    assert.equal(result._tag, "Left", JSON.stringify(input));
    if (result._tag === "Left") assert.equal(result.left._tag, "ValidationError");
  }
  assert.equal(calls, 0);
});

test("changing login email verifies current password and normalizes the result", async () => {
  for (const [input, code] of [
    [{ email: "new@example.com" }, "ValidationError"],
    [{ email: "new@example.com", current_password: "wrong" }, "UnauthorizedError"],
  ] as const) {
    const result = await run(updateMyProfile(input), repository({ updateProfile: () => Effect.die("Must not update") }));
    assert.equal(result._tag, "Left");
    if (result._tag === "Left") assert.equal(result.left._tag, code);
  }
  const result = await run(updateMyProfile({ email: " NEW@EXAMPLE.COM ", current_password: "StrongPass2026" }));
  assert.equal(result._tag, "Right");
  if (result._tag === "Right") assert.equal(result.right.email, "new@example.com");
  const unchanged = await run(updateMyProfile({ email: " OLD@EXAMPLE.COM " }), repository({
    findUserById: () => Effect.die("Unchanged email needs no password"),
  }));
  assert.equal(unchanged._tag, "Right");
});

test("missing profiles and uniqueness conflicts preserve domain errors", async () => {
  for (const operation of [getMyProfile(), updateMyProfile({ username: "New" })]) {
    const result = await run(operation, repository({ findProfileById: () => Effect.succeed(null) }));
    assert.equal(result._tag, "Left");
    if (result._tag === "Left") assert.equal(result.left._tag, "UserNotFound");
  }
  const disappeared = await run(updateMyProfile({ username: "New" }), repository({ updateProfile: () => Effect.succeed(null) }));
  assert.equal(disappeared._tag, "Left");
  if (disappeared._tag === "Left") assert.equal(disappeared.left._tag, "UserNotFound");
  const conflict = await run(updateMyProfile({ username: "Taken" }), repository({
    updateProfile: () => Effect.fail(new UserAlreadyExists({ message: "Already exists" })),
  }));
  assert.equal(conflict._tag, "Left");
  if (conflict._tag === "Left") assert.equal(conflict.left._tag, "UserAlreadyExists");
});
