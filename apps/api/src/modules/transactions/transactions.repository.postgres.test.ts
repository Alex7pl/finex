import assert from "node:assert/strict";
import test from "node:test";
import { Effect, Schema } from "effect";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { DatabaseService } from "@/db/db.service.js";
import { TransactionDto, TransactionList } from "@finex/shared/transactions/transactions.schema.js";
import { TransactionRepository } from "./transactions.repository.js";
import { TransactionRepositoryPostgresLayer } from "./transactions.repository.postgres.js";
import { parseTransactionFilters } from "./transactions.validation.js";

// Opt-in integration test. TEMP tables shadow public tables on this one connection.
// No production tables, migrations or data are modified.
test("Postgres transaction listing, grouping, filters and ownership", {
  skip: !process.env.TRANSACTIONS_TEST_DATABASE_URL,
}, async (t) => {
  const client = postgres(process.env.TRANSACTIONS_TEST_DATABASE_URL!, { max: 1 });
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const user = id(1), other = id(2), a = id(10), b = id(11), foreign = id(12);
  try {
    await client.unsafe(`
      CREATE TEMP TABLE accounts (id uuid PRIMARY KEY, user_id uuid, name text, emoji text, color text);
      CREATE TEMP TABLE categories (id uuid PRIMARY KEY, user_id uuid, name text, kind text, emoji text, color text,
        created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
      CREATE TEMP TABLE transactions (id uuid PRIMARY KEY, user_id uuid, type text, description text,
        amount numeric(12,2), "from" uuid, category_id uuid, debt_id uuid, income_id uuid,
        created_at timestamptz, updated_at timestamptz DEFAULT now());
      CREATE TEMP TABLE transactions_splits (id uuid PRIMARY KEY, transaction_id uuid,
        account_id uuid, amount numeric(12,2), state text);
    `);
    await client`INSERT INTO accounts VALUES (${a}, ${user}, 'Main', null, null),
      (${b}, ${user}, 'Savings', '🏦', '#fff'), (${foreign}, ${other}, 'Private', null, null)`;
    await client`INSERT INTO categories (id, user_id, name, kind) VALUES
      (${id(40)}, ${user}, 'Food', 'expense'), (${id(41)}, ${user}, 'Salary', 'income'),
      (${id(42)}, ${other}, 'Private', 'expense')`;
    const insert = async (n: number, owner: string, type: string, from: string | null, description: string, amount: string) => {
      await client`INSERT INTO transactions (id, user_id, type, "from", description, amount, created_at)
        VALUES (${id(n)}, ${owner}, ${type}, ${from}, ${description}, ${amount}, '2026-10-19T12:00:00Z')`;
    };
    await insert(20, user, "transfer", a, "Save 10%_monthly", "100.10");
    await insert(21, user, "expense", null, "Coffee", "3.50");
    await insert(22, other, "income", null, "Private salary", "1000");
    await insert(23, user, "transfer", a, "Invalid foreign link", "20");
    await insert(24, user, "income", null, "Salary", "2000");
    await insert(25, user, "transfer", a, "Invalid foreign destination", "20");
    await insert(26, user, "transfer", foreign, "Invalid foreign source", "20");
    await client`INSERT INTO transactions_splits VALUES
      (${id(30)}, ${id(20)}, ${b}, 60.05, 'Completed'),
      (${id(31)}, ${id(20)}, ${b}, 40.05, 'Pending'),
      (${id(32)}, ${id(21)}, ${a}, 3.50, 'Completed'),
      (${id(33)}, ${id(22)}, ${foreign}, 1000, 'Completed'),
      (${id(34)}, ${id(23)}, ${foreign}, 20, 'Completed'),
      (${id(35)}, ${id(24)}, ${a}, 2000, 'Completed'),
      (${id(36)}, ${id(25)}, ${b}, 10, 'Completed'),
      (${id(37)}, ${id(25)}, ${foreign}, 10, 'Completed'),
      (${id(38)}, ${id(26)}, ${b}, 20, 'Completed')`;
    const run = <A, E>(program: Effect.Effect<A, E, TransactionRepository>) => Effect.runPromise(program.pipe(
      Effect.provide(TransactionRepositoryPostgresLayer), Effect.provideService(DatabaseService, drizzle(client)),
    ));
    const list = async (raw: unknown) => {
      const filters = await Effect.runPromise(parseTransactionFilters(raw));
      return run(Effect.flatMap(TransactionRepository, (repo) => repo.list(user, filters)));
    };
    const detail = (transactionId: string) => run(Effect.flatMap(TransactionRepository, (repo) => repo.findById(user, transactionId)));

    await t.test("one transfer with all legs, precision and UI account data", async () => {
      const result = Schema.decodeUnknownSync(TransactionList)(await list({}));
      assert.equal(result.total, 3);
      const transfer = result.items.find((item) => item.id === id(20))!;
      assert.equal(transfer.amount, "100.10");
      assert.equal(transfer.is_internal_transfer, true);
      assert.equal(transfer.state, "Mixed");
      assert.equal(transfer.from_account?.id, a);
      assert.equal(transfer.splits.length, 2);
      assert.equal(transfer.splits[0]!.account.id, b);
      assert.deepEqual(Schema.decodeUnknownSync(TransactionDto)(await detail(id(20))), transfer);
    });
    await t.test("source/destination filters retain complete transfers and do not duplicate", async () => {
      assert.equal((await list({ accountId: a })).total, 3);
      const result = await list({ accountId: b });
      assert.equal(result.total, 1);
      assert.equal(result.items[0]!.splits.length, 2);
      assert.equal((await list({ accountId: `${a},${b}` })).total, 3);
      assert.equal((await list({ accountId: foreign })).total, 0);
    });
    await t.test("foreign and cross-user transactions are invisible", async () => {
      for (const n of [22, 23, 25, 26, 99]) assert.equal(await detail(id(n)), null);
    });
    await t.test("combined type, date, amount, literal search and aggregate state filters", async () => {
      const result = await list({ type: "transfer", kind: "transfer", dateFrom: "2026-10-19",
        dateTo: "2026-10-19", minAmount: "100.10", maxAmount: "100.10", search: "10%_", state: "Mixed", internalTransfer: "true" });
      assert.equal(result.total, 1);
      assert.equal((await list({ dateFrom: "2026-10-19T11:00:00Z", dateTo: "2026-10-19" })).total, 3);
      assert.equal((await list({ dateFrom: "2026-10-19T14:00:00+02:00", dateTo: "2026-10-19T12:00:00Z" })).total, 3);
      assert.equal((await list({ search: "10%X" })).total, 0);
      assert.equal((await list({ dateTo: "2026-10-18" })).total, 0);
      assert.equal((await list({ kind: "expense", state: "Completed" })).total, 1);
      assert.equal((await list({ internalTransfer: "false" })).total, 2);
      assert.equal((await list({ debtId: id(99) })).total, 0);
    });
    await t.test("category assignment, filters, kind checks and ownership", async () => {
      const assign = (transactionId: string, categoryId: string | null) => run(Effect.flatMap(TransactionRepository,
        (repo) => repo.setCategory(user, transactionId, categoryId)));
      assert.equal((await list({ uncategorized: "true" })).total, 3);
      assert.equal((await assign(id(21), id(40)))?.category?.name, "Food");
      assert.equal((await list({ categoryId: id(40) })).total, 1);
      assert.equal((await list({ categoryId: `${id(40)},${id(41)}` })).total, 1);
      assert.equal((await list({ uncategorized: "true" })).total, 2);
      assert.equal((await list({ uncategorized: "false" })).total, 1);
      assert.equal(await assign(id(20), id(40)), null);
      assert.equal(await assign(id(21), id(41)), null);
      assert.equal(await assign(id(21), id(42)), null);
      assert.equal(await assign(id(22), id(40)), null);
      assert.equal((await detail(id(21)))?.category_id, id(40));
      assert.equal((await assign(id(21), null))?.category, null);
      // Even corrupted cross-user references must not reveal category metadata.
      await client`UPDATE transactions SET category_id = ${id(42)} WHERE id = ${id(21)}`;
      assert.equal((await detail(id(21)))?.category_id, null);
      assert.equal((await detail(id(21)))?.category, null);
      assert.equal((await list({ categoryId: id(42) })).total, 0);
      await client`UPDATE transactions SET category_id = null WHERE id = ${id(21)}`;
    });
    await t.test("stable sorting, pagination and empty pages retain totals", async () => {
      const first = await list({ limit: "1", sortBy: "amount", sortOrder: "asc" });
      assert.equal(first.items[0]!.id, id(21));
      assert.equal(first.has_more, true);
      const empty = await list({ page: "10", limit: "1" });
      assert.deepEqual(empty.items, []);
      assert.equal(empty.total, 3);
      assert.equal(empty.has_more, false);
      const ascending = await list({ sortOrder: "asc" });
      const descending = await list({ sortOrder: "desc" });
      assert.deepEqual(ascending.items.map((item) => item.id), descending.items.map((item) => item.id).reverse());
    });
  } finally {
    await client.end();
  }
});
