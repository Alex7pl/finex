import assert from "node:assert/strict";
import test from "node:test";
import { Effect, Schema } from "effect";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { DatabaseService } from "@/db/db.service.js";
import { UserProfile } from "@finex/shared/users/users.schema.js";
import { UserRepository } from "./users.repository.js";
import { UserRepositoryPostgresLayer } from "./users.repository.postgres.js";

const url = process.env.USERS_TEST_DATABASE_URL ?? process.env.TRANSACTIONS_TEST_DATABASE_URL;
test("Postgres profiles expose public fields, update only authenticated ID and map uniqueness conflicts", { skip: !url }, async () => {
  const client = postgres(url!, { max: 1 });
  const id = "00000000-0000-4000-8000-000000000001";
  const otherId = "00000000-0000-4000-8000-000000000002";
  const missingId = "00000000-0000-4000-8000-000000000003";
  try {
    await client.unsafe(`CREATE TEMP TABLE users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL,
      username text UNIQUE NOT NULL, password text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await client`INSERT INTO users (id, email, username, password) VALUES
      (${id}, 'old@example.com', 'Ana', 'private-hash'),
      (${otherId}, 'other@example.com', 'Other', 'other-private-hash')`;
    const run = <A, E>(program: Effect.Effect<A, E, UserRepository>) => Effect.runPromise(program.pipe(
      Effect.provide(UserRepositoryPostgresLayer), Effect.provideService(DatabaseService, drizzle(client)),
    ));
    const get = (userId: string) => run(Effect.flatMap(UserRepository, (repo) => repo.findProfileById(userId)));
    const update = (input: { username?: string; email?: string }) => run(Effect.flatMap(UserRepository, (repo) => repo.updateProfile(id, input)).pipe(Effect.either));
    const original = Schema.decodeUnknownSync(UserProfile)(await get(id));
    assert.equal(original.username, "Ana");
    assert.equal("password" in (await get(id))!, false);
    const updated = await update({ username: "Ana López", email: "new@example.com" });
    assert.equal(updated._tag, "Right");
    if (updated._tag === "Right") {
      assert.equal(updated.right?.email, "new@example.com");
      assert.equal(updated.right?.username, "Ana López");
      assert.equal("password" in updated.right!, false);
    }
    assert.equal((await get(otherId))?.username, "Other");
    for (const input of [{ username: "Other" }, { email: "other@example.com" }]) {
      const duplicate = await update(input);
      assert.equal(duplicate._tag, "Left");
      if (duplicate._tag === "Left") assert.equal(duplicate.left._tag, "UserAlreadyExists");
    }
    assert.equal((await get(id))?.email, "new@example.com");
    assert.equal((await client`SELECT password FROM users WHERE id = ${id}`)[0]?.password, "private-hash");
    assert.equal(await get(missingId), null);
    assert.equal(await run(Effect.flatMap(UserRepository, (repo) => repo.updateProfile(missingId, { username: "Missing" }))), null);
    // Registration shares the same nested PostgreSQL uniqueness mapper.
    const duplicateRegistration = await run(Effect.flatMap(UserRepository, (repo) => repo.createUser({
      email: "new@example.com", username: "Brand new", password: "hash",
    })).pipe(Effect.either));
    assert.equal(duplicateRegistration._tag, "Left");
    if (duplicateRegistration._tag === "Left") assert.equal(duplicateRegistration.left._tag, "UserAlreadyExists");
  } finally {
    await client.end();
  }
});
