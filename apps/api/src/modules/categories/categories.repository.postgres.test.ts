import assert from "node:assert/strict";
import test from "node:test";
import { Effect, Schema } from "effect";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { DatabaseService } from "@/db/db.service.js";
import { CategoryDto } from "@finex/shared/categories/categories.schema.js";
import { CategoryRepository } from "./categories.repository.js";
import { CategoryRepositoryPostgresLayer } from "./categories.repository.postgres.js";

test("Postgres category CRUD scopes every operation and preserves referenced budgets", {
  skip: !process.env.TRANSACTIONS_TEST_DATABASE_URL,
}, async () => {
  const client = postgres(process.env.TRANSACTIONS_TEST_DATABASE_URL!, { max: 1 });
  const user = "00000000-0000-4000-8000-000000000001";
  const other = "00000000-0000-4000-8000-000000000002";
  try {
    await client.unsafe(`
      CREATE TEMP TABLE categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid,
        name text NOT NULL, kind text NOT NULL, emoji text, color text,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
      CREATE TEMP TABLE category_test_budgets (category_id uuid REFERENCES categories(id) ON DELETE RESTRICT);
      CREATE TEMP TABLE category_test_transactions (category_id uuid REFERENCES categories(id) ON DELETE SET NULL);
    `);
    const run = <A, E>(program: Effect.Effect<A, E, CategoryRepository>) => Effect.runPromise(program.pipe(
      Effect.provide(CategoryRepositoryPostgresLayer), Effect.provideService(DatabaseService, drizzle(client)),
    ));
    const create = (owner: string, name: string, kind: "income" | "expense") => run(Effect.flatMap(CategoryRepository,
      (repo) => repo.create(owner, { name, kind })));
    const food = Schema.decodeUnknownSync(CategoryDto)(await create(user, "Food", "expense"));
    const salary = await create(user, "Salary", "income");
    await create(other, "Private", "expense");
    const listed = await run(Effect.flatMap(CategoryRepository, (repo) => repo.list(user)));
    assert.deepEqual(listed.map((row) => row.name), ["Food", "Salary"]);
    assert.deepEqual((await run(Effect.flatMap(CategoryRepository, (repo) => repo.list(user, "income")))).map((row) => row.id), [salary.id]);
    assert.equal(await run(Effect.flatMap(CategoryRepository, (repo) => repo.findById(other, food.id))), null);
    assert.equal(await run(Effect.flatMap(CategoryRepository, (repo) => repo.update(other, food.id, { name: "Stolen" }))), null);
    assert.equal(await run(Effect.flatMap(CategoryRepository, (repo) => repo.remove(other, food.id))), false);
    const updated = await run(Effect.flatMap(CategoryRepository, (repo) => repo.update(user, food.id, { name: "Meals", emoji: "🍽️", color: "#FF0000" })));
    assert.equal(updated?.name, "Meals");
    assert.equal(updated?.emoji, "🍽️");
    await client`INSERT INTO category_test_budgets VALUES (${food.id})`;
    const inUse = await run(Effect.flatMap(CategoryRepository, (repo) => repo.remove(user, food.id)).pipe(Effect.either));
    assert.equal(inUse._tag, "Left");
    if (inUse._tag === "Left") assert.equal(inUse.left._tag, "CategoryInUse");
    await client`DELETE FROM category_test_budgets`;
    await client`INSERT INTO category_test_transactions VALUES (${food.id})`;
    assert.equal(await run(Effect.flatMap(CategoryRepository, (repo) => repo.remove(user, food.id))), true);
    assert.equal((await client`SELECT category_id FROM category_test_transactions`)[0]?.category_id, null);
  } finally {
    await client.end();
  }
});
