import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { Effect, Schema } from "effect";
import { DatabaseService } from "@/db/db.service.js";
import { SourceDto, type SourceWrite } from "@finex/shared/ledger/ledger.schema.js";
import { LedgerRepository } from "./ledger.repository.js";
import { LedgerRepositoryPostgresLayer } from "./ledger.repository.postgres.js";
import { TransactionRepository } from "../transactions/transactions.repository.js";
import { TransactionRepositoryPostgresLayer } from "../transactions/transactions.repository.postgres.js";

test("ledger accrual, settlement, debt progress and history use owned, balanced allocations atomically", {
  skip: !process.env.TRANSACTIONS_TEST_DATABASE_URL,
}, async (t) => {
  const client = postgres(process.env.TRANSACTIONS_TEST_DATABASE_URL!, { max: 1 });
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const user = id(1), other = id(2), a = id(10), b = id(11), foreign = id(12), expense = id(20), income = id(21);
  try {
    await client.unsafe(`
      CREATE TEMP TABLE accounts (id uuid PRIMARY KEY, user_id uuid, name text, emoji text, color text);
      CREATE TEMP TABLE categories (id uuid PRIMARY KEY, user_id uuid, kind text, name text, emoji text, color text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
      CREATE TEMP TABLE debts (id uuid PRIMARY KEY, user_id uuid, name text NOT NULL, account_id uuid REFERENCES accounts(id), category_id uuid REFERENCES categories(id), quota numeric(12,2), capital numeric(12,2), interests numeric(12,2), time_limit timestamptz, is_active boolean, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
      CREATE TEMP TABLE incomes (id uuid PRIMARY KEY, user_id uuid, name text NOT NULL, account_id uuid REFERENCES accounts(id), category_id uuid REFERENCES categories(id), amount numeric(12,2), is_active boolean, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
      CREATE TEMP TABLE transactions (id uuid PRIMARY KEY, user_id uuid, type text, description text, category_id uuid, amount numeric(12,2), "from" uuid, debt_id uuid REFERENCES debts(id) ON DELETE SET NULL, income_id uuid REFERENCES incomes(id) ON DELETE SET NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
      CREATE TEMP TABLE transactions_splits (id uuid PRIMARY KEY, transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE, account_id uuid REFERENCES accounts(id), amount numeric(12,2), state text);
    `);
    await client`INSERT INTO accounts VALUES (${a}, ${user}, 'Main', null, null), (${b}, ${user}, 'Savings', null, null), (${foreign}, ${other}, 'Private', null, null)`;
    await client`INSERT INTO categories (id, user_id, kind, name) VALUES (${expense}, ${user}, 'expense', 'Rent'), (${income}, ${user}, 'income', 'Salary'), (${id(22)}, ${other}, 'income', 'Private')`;
    const provide = <A, E, R>(program: Effect.Effect<A, E, R>) => program.pipe(
      Effect.provide(LedgerRepositoryPostgresLayer), Effect.provide(TransactionRepositoryPostgresLayer),
      Effect.provideService(DatabaseService, drizzle(client)),
    ) as Effect.Effect<A, E>;
    const repo = await Effect.runPromise(provide(LedgerRepository));
    const transactions = await Effect.runPromise(provide(TransactionRepository));
    const run = Effect.runPromise;
    const rejected = async <A, E>(effect: Effect.Effect<A, E>, tag = "ValidationError") => {
      const result = await run(Effect.either(effect));
      assert.equal(result._tag, "Left");
      if (result._tag === "Left") assert.equal((result.left as { _tag: string })._tag, tag);
    };
    const base: SourceWrite = { name: "Rent", amount: "0.30", account_id: a, category_id: expense,
      is_active: true, capital: null, interests: null, time_limit: null };
    const debt = await run(repo.save(user, "debt", { ...base, capital: "0.90", interests: "0.10", time_limit: "2027-01-01T00:00:00Z" }));
    const summary = async () => Schema.decodeUnknownSync(SourceDto)((await run(repo.list(user, "debt", debt)))[0]);
    let first = "";
    await t.test("devengar creates pending expense; splits settle exact cents once without double counting", async () => {
      first = await run(repo.accrue(user, "debt", debt, {}));
      const movement = await run(transactions.findById(user, first));
      assert.equal(movement?.type, "expense");
      assert.equal(movement?.debt_id, debt);
      assert.equal(movement?.state, "Pending");
      let data = await summary();
      assert.equal(data.accrued_amount, "0.30");
      assert.equal(data.pending_amount, "0.30");
      assert.equal(data.settled_amount, "0.00");
      assert.equal(data.remaining_amount, "1.00");
      await run(repo.settle(user, first, [{ account_id: a, amount: "0.10", state: "Completed" }, { account_id: b, amount: "0.20", state: "Pending" }]));
      data = await summary();
      assert.equal(data.settled_amount, "0.10");
      assert.equal(data.pending_amount, "0.20");
      assert.equal(data.remaining_amount, "0.90");
      assert.equal(data.transaction_count, 1);
      await run(repo.settle(user, first, [{ account_id: a, amount: "0.10", state: "Completed" }, { account_id: b, amount: "0.20", state: "Completed" }]));
      assert.equal((await summary()).remaining_amount, "0.70");
    });
    await t.test("source edits preserve movement values; finite debts cannot over-accrue or shrink below history", async () => {
      await run(repo.save(user, "debt", { amount: "0.70", name: "New name", account_id: b }, debt));
      const original = await run(transactions.findById(user, first));
      assert.equal(original?.amount, "0.30");
      assert.equal(original?.description, "Rent");
      assert.equal(original?.splits[0]?.account.id === a || original?.splits[1]?.account.id === a, true);
      await run(repo.accrue(user, "debt", debt, {}));
      await rejected(repo.accrue(user, "debt", debt, { amount: "0.01" }));
      await rejected(repo.save(user, "debt", { capital: "0.01" }, debt));
      assert.equal((await summary()).accrued_amount, "1.00");
    });
    await t.test("foreign references, wrong categories and unbalanced splits roll back all writes", async () => {
      await rejected(repo.accrue(other, "debt", debt, {}), "SourceNotFound");
      await rejected(repo.settle(other, first, [{ account_id: foreign, amount: "0.30", state: "Completed" }]), "TransactionNotFound");
      await rejected(repo.settle(user, first, [{ account_id: foreign, amount: "0.30", state: "Completed" }]));
      await rejected(repo.settle(user, first, [{ account_id: a, amount: "0.29", state: "Completed" }]));
      await rejected(repo.save(user, "debt", { ...base, account_id: foreign }));
      await rejected(repo.save(user, "debt", { ...base, category_id: income }));
      await rejected(repo.save(user, "debt", { ...base, interests: "1" }));
      assert.equal((await summary()).settled_amount, "0.30");
      const before = (await client`SELECT count(*)::int AS n FROM transactions`)[0]!.n;
      await rejected(repo.createMovement(user, { type: "income", amount: "0.30", description: null, category_id: income,
        splits: [{ account_id: a, amount: "0.10", state: "Completed" }, { account_id: foreign, amount: "0.20", state: "Completed" }] }));
      assert.equal((await client`SELECT count(*)::int AS n FROM transactions`)[0]!.n, before);
    });
    await t.test("unlimited debts have no remaining total and inactive definitions cannot accrue", async () => {
      const unlimited = await run(repo.save(user, "debt", base));
      await run(repo.accrue(user, "debt", unlimited, { amount: "100.00" }));
      const data = (await run(repo.list(user, "debt", unlimited)))[0]!;
      assert.equal(data.total_amount, null);
      assert.equal(data.remaining_amount, null);
      await run(repo.save(user, "debt", { is_active: false }, unlimited));
      await rejected(repo.accrue(user, "debt", unlimited, {}));
    });
    await t.test("income supports multiple receiving accounts; deleting source keeps transaction history", async () => {
      const source = await run(repo.save(user, "income", { name: "Salary", amount: "2000", account_id: a, category_id: income, is_active: true }));
      const movement = await run(repo.accrue(user, "income", source, { amount: "2100", splits: [
        { account_id: a, amount: "1600", state: "Completed" }, { account_id: b, amount: "500", state: "Completed" },
      ] }));
      const data = Schema.decodeUnknownSync(SourceDto)((await run(repo.list(user, "income", source)))[0]);
      assert.equal(data.settled_amount, "2100.00");
      assert.equal(data.transaction_count, 1);
      await run(repo.save(user, "income", { amount: "2200" }, source));
      assert.equal((await run(transactions.findById(user, movement)))?.amount, "2100.00");
      await run(repo.delete(user, "income", source));
      const retained = await run(transactions.findById(user, movement));
      assert.equal(retained?.income_id, null);
      assert.equal(retained?.amount, "2100.00");
      assert.equal(retained?.splits.length, 2);
    });
    await t.test("manual movement has no source", async () => {
      const movement = await run(repo.createMovement(user, { type: "expense", amount: "2", category_id: expense, description: "Coffee",
        splits: [{ account_id: a, amount: "2", state: "Completed" }] }));
      const data = await run(transactions.findById(user, movement));
      assert.equal(data?.debt_id, null);
      assert.equal(data?.income_id, null);
    });
  } finally { await client.end(); }
});
