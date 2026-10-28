import assert from "node:assert/strict";
import test from "node:test";
import { Effect, Schema } from "effect";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { DatabaseService } from "@/db/db.service.js";
import { CurrentUser } from "@/runtime/request-context.js";
import {
  HistoryBalance,
  UpdatedAccount,
} from "@finex/shared/accounts/accounts.schema.js";
import { AccountRepository } from "./accounts.repository.js";
import { AccountRepositoryPostgresLayer } from "./accounts.repository.postgres.js";
import { getAccountById, getHistoryBalance } from "./accounts.service.js";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const user = { id: id(1), email: "user@example.com" };
test("account reads validate dates and ownership before exposing detail or history", async () => {
  let historyCalls = 0;
  const repo: typeof AccountRepository.Service = {
    getUserAccounts: () => Effect.succeed([]),
    getAccountById: (owner) => {
      assert.equal(owner, user.id);
      return Effect.succeed(null);
    },
    getHistoryBalance: () => {
      historyCalls++;
      return Effect.die("Not expected");
    },
  };
  const run = <A, E>(
    effect: Effect.Effect<A, E, CurrentUser | AccountRepository>,
  ) =>
    Effect.runPromise(
      effect.pipe(
        Effect.provideService(CurrentUser, user),
        Effect.provideService(AccountRepository, repo),
        Effect.either,
      ),
    );
  const missing = await run(getAccountById(id(10)));
  assert.equal(missing._tag, "Left");
  if (missing._tag === "Left")
    assert.equal(missing.left._tag, "AccountNotFound");
  for (const query of [
    {},
    { dateFrom: "2026-10-01", dateTo: "2026-11-01" },
    { dateFrom: "2026-11-01T00:00:00Z", dateTo: "2026-10-01T00:00:00Z" },
    { dateFrom: "2020-01-01T00:00:00Z", dateTo: "2026-01-01T00:00:00Z" },
  ]) {
    const invalid = await run(getHistoryBalance(query));
    assert.equal(invalid._tag, "Left");
    if (invalid._tag === "Left")
      assert.equal(invalid.left._tag, "ValidationError");
  }
  const foreign = await run(
    getHistoryBalance({
      dateFrom: "2026-10-01T00:00:00Z",
      dateTo: "2026-11-01T00:00:00Z",
      accountId: id(12),
    }),
  );
  assert.equal(foreign._tag, "Left");
  if (foreign._tag === "Left")
    assert.equal(foreign.left._tag, "AccountNotFound");
  assert.equal(historyCalls, 0);
});

test(
  "Postgres dashboard balances exclude pending, offset internal transfers once and share transaction ownership",
  {
    skip: !process.env.TRANSACTIONS_TEST_DATABASE_URL,
  },
  async () => {
    const client = postgres(process.env.TRANSACTIONS_TEST_DATABASE_URL!, {
      max: 1,
    });
    const a = id(10),
      b = id(11),
      foreign = id(12),
      other = id(2);
    try {
      await client.unsafe(`
      CREATE TEMP TABLE accounts (id uuid PRIMARY KEY, user_id uuid, name text, emoji text, color text,
        annual_interest_rate numeric(5,2), interest_payment_rate numeric(5,2));
      CREATE TEMP TABLE transactions (id uuid PRIMARY KEY, user_id uuid, type text, "from" uuid,
        created_at timestamptz);
      CREATE TEMP TABLE transactions_splits (id uuid PRIMARY KEY, transaction_id uuid, account_id uuid,
        amount numeric(12,2), state text);
    `);
      await client`INSERT INTO accounts (id,user_id,name) VALUES (${a},${user.id},'Main'), (${b},${user.id},'Savings'), (${foreign},${other},'Private')`;
      await client`INSERT INTO transactions VALUES
      (${id(20)}, ${user.id}, 'Variable_income', null, '2026-09-30T21:00:00Z'),
      (${id(21)}, ${user.id}, 'Variable_income', null, '2026-10-01T00:00:00Z'),
      (${id(22)}, ${user.id}, 'Variable_expense', null, '2026-10-02T12:00:00Z'),
      (${id(23)}, ${user.id}, 'Transfer', ${a}, '2026-10-03T12:00:00Z'),
      (${id(24)}, ${other}, 'Variable_income', null, '2026-10-03T12:00:00Z'),
      (${id(25)}, ${user.id}, 'Variable_expense', ${foreign}, '2026-10-03T12:00:00Z'),
      (${id(26)}, ${user.id}, 'Variable_expense', null, '2026-10-03T12:00:00Z')`;
      await client`INSERT INTO transactions_splits VALUES
      (${id(30)},${id(20)},${a},1000,'Completed'),
      (${id(31)},${id(21)},${a},100,'Completed'),
      (${id(32)},${id(22)},${a},60,'Completed'),
      (${id(33)},${id(22)},${a},40,'Pending'),
      (${id(34)},${id(23)},${b},300,'Completed'),
      (${id(35)},${id(23)},${b},200,'Pending'),
      (${id(36)},${id(24)},${a},9000,'Completed'),
      (${id(37)},${id(25)},${a},900,'Completed'),
      (${id(38)},${id(26)},${a},800,'Completed'),
      (${id(39)},${id(26)},${foreign},100,'Completed')`;
      const run = <A, E>(effect: Effect.Effect<A, E, AccountRepository>) =>
        Effect.runPromise(
          effect.pipe(
            Effect.provide(AccountRepositoryPostgresLayer),
            Effect.provideService(DatabaseService, drizzle(client)),
          ),
        );
      const accounts = Schema.decodeUnknownSync(Schema.Array(UpdatedAccount))(
        await run(
          Effect.flatMap(AccountRepository, (repo) =>
            repo.getUserAccounts(user.id),
          ),
        ),
      );
      assert.equal(
        accounts.find((account) => account.id === a)?.balance,
        "740.00",
      );
      assert.equal(
        accounts.find((account) => account.id === b)?.balance,
        "300.00",
      );
      assert.equal(accounts[0]?.annual_interest_rate, null);
      assert.equal(
        await run(
          Effect.flatMap(AccountRepository, (repo) =>
            repo.getAccountById(other, a),
          ),
        ),
        null,
      );
      const history = (owner: string, accountId?: string) =>
        run(
          Effect.flatMap(AccountRepository, (repo) =>
            repo.getHistoryBalance(
              owner,
              "2026-09-30T22:00:00Z",
              "2026-10-31T23:00:00Z",
              "day",
              accountId,
            ),
          ),
        );
      const consolidated = Schema.decodeUnknownSync(HistoryBalance)(
        await history(user.id),
      );
      assert.equal(consolidated.total_balance, "1040.00");
      assert.equal(consolidated.initial_balance, "1000.00");
      assert.equal(consolidated.income, "100.00");
      assert.equal(consolidated.expenses, "60.00");
      assert.equal(consolidated.history.length, 31);
      assert.equal(consolidated.history.at(-1)?.acumulated_balance, "1040.00");
      assert.equal((await history(user.id, a)).total_balance, "740.00");
      assert.equal((await history(user.id, b)).total_balance, "300.00");
      const empty = await history(id(99));
      assert.equal(empty.total_balance, "0.00");
      assert.equal(empty.income, "0.00");
      assert.equal(empty.history.length, 31);
    } finally {
      await client.end();
    }
  },
);
