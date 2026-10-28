import assert from "node:assert/strict";
import test from "node:test";
import { Effect, Schema } from "effect";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { DatabaseService } from "@/db/db.service.js";
import { BudgetDto } from "@finex/shared/budgets/budgets.schema.js";
import { SavingsDto } from "@finex/shared/savings/savings.schema.js";
import { BudgetRepository } from "./budgets.repository.js";
import { BudgetRepositoryPostgresLayer } from "./budgets.repository.postgres.js";
import { budgetDto } from "./budgets.service.js";
import { SavingsRepository } from "../savings/savings.repository.js";
import { SavingsRepositoryPostgresLayer } from "../savings/savings.repository.postgres.js";
import { savingsDto } from "../savings/savings.service.js";

test(
  "Postgres budgets aggregate split amounts once, scope ownership/month/category, and savings mutate atomically",
  { skip: !process.env.TRANSACTIONS_TEST_DATABASE_URL },
  async (t) => {
    const client = postgres(process.env.TRANSACTIONS_TEST_DATABASE_URL!, {
      max: 1,
    });
    const id = (n: number) =>
      `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    const user = id(1),
      other = id(2),
      a = id(10),
      b = id(11),
      foreign = id(12),
      category = id(20),
      otherCategory = id(21);
    try {
      await client.unsafe(`
   CREATE TEMP TABLE accounts (id uuid PRIMARY KEY, user_id uuid);
   CREATE TEMP TABLE categories (id uuid PRIMARY KEY, user_id uuid, kind text);
   CREATE TEMP TABLE transactions (id uuid PRIMARY KEY, user_id uuid, type text, category_id uuid, "from" uuid, created_at timestamptz);
   CREATE TEMP TABLE transactions_splits (id uuid PRIMARY KEY, transaction_id uuid, account_id uuid, amount numeric(12,2), state text);
   CREATE TEMP TABLE budgets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, name text, monthly_limit numeric(12,2), about_type text, category_id uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
   CREATE TEMP TABLE savings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, account_id uuid, name text, current_amount numeric(12,2) CHECK (current_amount >= 0), target_amount numeric(12,2), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
  `);
      await client`INSERT INTO accounts VALUES (${a}, ${user}), (${b}, ${user}), (${foreign}, ${other})`;
      await client`INSERT INTO categories VALUES (${category}, ${user}, 'expense'), (${otherCategory}, ${other}, 'expense'), (${id(22)}, ${user}, 'income')`;
      const seed = async (
        n: number,
        type: string,
        cat: string | null,
        date: string,
        owner = user,
        from: string | null = null,
      ) => {
        await client`INSERT INTO transactions VALUES (${id(n)}, ${owner}, ${type}, ${cat}, ${from}, ${date})`;
      };
      await seed(30, "Variable_expense", category, "2026-10-19T12:00:00Z");
      await seed(31, "Fixed_expense", category, "2026-10-19T12:00:00Z");
      await seed(32, "Transfer", category, "2026-10-19T12:00:00Z");
      await seed(33, "Variable_income", category, "2026-10-19T12:00:00Z");
      await seed(34, "Variable_expense", category, "2026-10-31T23:00:00Z"); // November in Madrid
      await seed(35, "Variable_expense", category, "2026-09-30T22:00:00Z"); // October in Madrid
      await seed(
        36,
        "Variable_expense",
        otherCategory,
        "2026-10-19T12:00:00Z",
        other,
      );
      await seed(37, "Variable_expense", category, "2026-10-19T12:00:00Z"); // malformed cross-user split
      await seed(
        38,
        "Variable_expense",
        category,
        "2026-10-19T12:00:00Z",
        user,
        foreign,
      );
      await seed(39, "Variable_expense", null, "2026-10-19T12:00:00Z");
      await client`INSERT INTO transactions_splits VALUES
   (${id(100)}, ${id(30)}, ${a}, 0.10, 'Completed'), (${id(101)}, ${id(30)}, ${b}, 0.20, 'Completed'),
   (${id(102)}, ${id(30)}, ${a}, 0.05, 'Pending'), (${id(103)}, ${id(31)}, ${a}, 1.00, 'Completed'),
   (${id(104)}, ${id(32)}, ${a}, 100, 'Completed'), (${id(105)}, ${id(33)}, ${a}, 100, 'Completed'),
   (${id(106)}, ${id(34)}, ${a}, 100, 'Completed'), (${id(107)}, ${id(35)}, ${a}, 0.01, 'Completed'),
   (${id(108)}, ${id(36)}, ${foreign}, 100, 'Completed'), (${id(109)}, ${id(37)}, ${a}, 100, 'Completed'),
   (${id(110)}, ${id(37)}, ${foreign}, 100, 'Completed'), (${id(111)}, ${id(38)}, ${a}, 100, 'Completed'),
   (${id(112)}, ${id(39)}, ${a}, 2, 'Completed')`;
      const runBudget = <A, E>(effect: Effect.Effect<A, E, BudgetRepository>) =>
        Effect.runPromise(
          effect.pipe(
            Effect.provide(BudgetRepositoryPostgresLayer),
            Effect.provideService(DatabaseService, drizzle(client)),
          ),
        );
      const budgetRepo = await runBudget(BudgetRepository);
      const scoped = await Effect.runPromise(
        budgetRepo.create(user, {
          name: "Food",
          monthly_limit: "1",
          category_id: category,
          about_type: null,
        }),
      );
      const global = await Effect.runPromise(
        budgetRepo.create(user, {
          name: "All",
          monthly_limit: "10",
          category_id: null,
          about_type: null,
        }),
      );
      await t.test(
        "category and global budgets count completed allocations once, pending separately and exclude transfers/income/foreign data",
        async () => {
          const result = (
            await Effect.runPromise(
              budgetRepo.list(user, "2026-10", undefined, scoped.id),
            )
          )[0]!;
          assert.equal(result.spent, "1.31");
          assert.equal(result.pending, "0.05");
          const dto = Schema.decodeUnknownSync(BudgetDto)(
            budgetDto(result, "2026-10"),
          );
          assert.equal(dto.exceeded, "0.31");
          assert.equal(dto.remaining, "0.00");
          assert.equal(
            (
              await Effect.runPromise(
                budgetRepo.list(user, "2026-10", a, scoped.id),
              )
            )[0]!.spent,
            "1.11",
          );
          assert.equal(
            (
              await Effect.runPromise(
                budgetRepo.list(user, "2026-10", undefined, global.id),
              )
            )[0]!.spent,
            "3.31",
          );
          assert.equal(
            (
              await Effect.runPromise(
                budgetRepo.list(user, "2026-11", undefined, scoped.id),
              )
            )[0]!.spent,
            "100.00",
          );
          assert.equal(
            await Effect.runPromise(
              budgetRepo.ownsCategory(user, otherCategory),
            ),
            false,
          );
          assert.equal(
            await Effect.runPromise(budgetRepo.ownsCategory(user, id(22))),
            false,
          );
        },
      );
      await t.test(
        "CRUD ownership and legacy fixed-expense scope",
        async () => {
          assert.equal(
            await Effect.runPromise(
              budgetRepo.update(other, scoped.id, { name: "Stolen" }),
            ),
            null,
          );
          assert.deepEqual(
            await Effect.runPromise(
              budgetRepo.list(other, "2026-10", undefined, scoped.id),
            ),
            [],
          );
          assert.equal(
            await Effect.runPromise(budgetRepo.delete(other, scoped.id)),
            false,
          );
          await Effect.runPromise(
            budgetRepo.update(user, scoped.id, { about_type: "Fixed_expense" }),
          );
          assert.equal(
            (
              await Effect.runPromise(
                budgetRepo.list(user, "2026-10", undefined, scoped.id),
              )
            )[0]!.spent,
            "1.00",
          );
          assert.equal(
            await Effect.runPromise(budgetRepo.delete(user, scoped.id)),
            true,
          );
        },
      );
      const runSavings = <A, E>(
        effect: Effect.Effect<A, E, SavingsRepository>,
      ) =>
        Effect.runPromise(
          effect.pipe(
            Effect.provide(SavingsRepositoryPostgresLayer),
            Effect.provideService(DatabaseService, drizzle(client)),
          ),
        );
      const savingsRepo = await runSavings(SavingsRepository);
      const goal = await Effect.runPromise(
        savingsRepo.create(user, {
          name: "Trip",
          account_id: a,
          current_amount: "0",
          target_amount: "1",
        }),
      );
      await t.test(
        "concurrent deposits preserve exact cents and withdrawals cannot go negative",
        async () => {
          await Promise.all(
            ["0.10", "0.20"].map((amount) =>
              Effect.runPromise(
                savingsRepo.adjust(user, goal.id, amount, "deposit"),
              ),
            ),
          );
          const current = (
            await Effect.runPromise(savingsRepo.list(user, undefined, goal.id))
          )[0]!;
          const dto = Schema.decodeUnknownSync(SavingsDto)(savingsDto(current));
          assert.equal(dto.current_amount, "0.30");
          assert.equal(dto.remaining, "0.70");
          assert.equal(
            await Effect.runPromise(
              savingsRepo.adjust(user, goal.id, "0.31", "withdraw"),
            ),
            null,
          );
          assert.equal(
            await Effect.runPromise(
              savingsRepo.adjust(user, goal.id, "9999999999.99", "deposit"),
            ),
            null,
          );
          await Effect.runPromise(
            savingsRepo.adjust(user, goal.id, "0.30", "withdraw"),
          );
          assert.equal(
            (
              await Effect.runPromise(
                savingsRepo.list(user, undefined, goal.id),
              )
            )[0]!.current_amount,
            "0.00",
          );
        },
      );
      await t.test("savings CRUD and account/goal ownership", async () => {
        assert.equal(
          await Effect.runPromise(savingsRepo.ownsAccount(user, foreign)),
          false,
        );
        assert.deepEqual(
          await Effect.runPromise(savingsRepo.list(other, undefined, goal.id)),
          [],
        );
        assert.equal(
          await Effect.runPromise(
            savingsRepo.update(other, goal.id, { name: "Stolen" }),
          ),
          null,
        );
        assert.equal(
          await Effect.runPromise(
            savingsRepo.adjust(other, goal.id, "1", "deposit"),
          ),
          null,
        );
        assert.equal(
          await Effect.runPromise(savingsRepo.delete(other, goal.id)),
          false,
        );
        assert.equal(
          (await Effect.runPromise(
            savingsRepo.update(user, goal.id, { target_amount: "2" }),
          ))!.target_amount,
          "2.00",
        );
        assert.equal(
          await Effect.runPromise(savingsRepo.delete(user, goal.id)),
          true,
        );
      });
    } finally {
      await client.end();
    }
  },
);
