import { Effect, Layer } from "effect";
import { and, eq, sql } from "drizzle-orm";
import { DatabaseService } from "@/db/db.service.js";
import { budgets } from "@/db/schema/budgets.js";
import { categories } from "@/db/schema/categories.js";
import { accounts } from "@/db/schema/accounts.js";
import { DatabaseError } from "@/shared/errors.js";
import { BudgetRepository, type BudgetSummary } from "./budgets.repository.js";
export const BudgetRepositoryPostgresLayer = Layer.effect(
  BudgetRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const run = <A>(task: () => Promise<A>) =>
      Effect.tryPromise({
        try: task,
        catch: (cause) =>
          new DatabaseError({
            message: "Budget database operation failed",
            cause,
          }),
      });
    return BudgetRepository.of({
      list: (user, month, accountId, id) =>
        run(async () => {
          const rows = await db.execute<BudgetSummary>(sql`SELECT b.*,
    COALESCE(SUM(abs(s.amount)) FILTER (WHERE s.state = 'Completed'), 0)::text AS spent,
    COALESCE(SUM(abs(s.amount)) FILTER (WHERE s.state = 'Pending'), 0)::text AS pending
    FROM budgets b
    LEFT JOIN transactions t ON t.user_id = b.user_id AND t.type = 'expense'
     AND (b.about_type IS NULL OR t.type = b.about_type)
     AND (b.category_id IS NULL OR (t.category_id = b.category_id AND EXISTS (
      SELECT 1 FROM categories c WHERE c.id = b.category_id AND c.user_id = b.user_id AND c.kind = 'expense'
     )))
     AND (t."from" IS NULL OR EXISTS (SELECT 1 FROM accounts a WHERE a.id = t."from" AND a.user_id = b.user_id))
     AND NOT EXISTS (SELECT 1 FROM transactions_splits s2 JOIN accounts a2 ON a2.id = s2.account_id
      WHERE s2.transaction_id = t.id AND a2.user_id <> b.user_id)
     AND t.created_at >= (${month + "-01"}::date::timestamp AT TIME ZONE 'Europe/Madrid')
     AND t.created_at < ((${month + "-01"}::date + interval '1 month')::timestamp AT TIME ZONE 'Europe/Madrid')
    LEFT JOIN transactions_splits s ON s.transaction_id = t.id
     AND s.account_id IN (SELECT id FROM accounts WHERE user_id = ${user} ${accountId ? sql`AND id = ${accountId}` : sql``})
    WHERE b.user_id = ${user} ${id ? sql`AND b.id = ${id}` : sql``}
    GROUP BY b.id ORDER BY b.created_at DESC, b.id DESC`);
          return [...rows].map((r) => ({
            ...r,
            created_at: new Date(r.created_at),
            updated_at: new Date(r.updated_at),
          }));
        }),
      create: (user, data) =>
        run(
          async () =>
            (
              await db
                .insert(budgets)
                .values({ ...data, user_id: user })
                .returning()
            )[0]!,
        ),
      update: (user, id, data) =>
        run(
          async () =>
            (
              await db
                .update(budgets)
                .set({ ...data, updated_at: new Date() })
                .where(and(eq(budgets.id, id), eq(budgets.user_id, user)))
                .returning()
            )[0] ?? null,
        ),
      delete: (user, id) =>
        run(
          async () =>
            (
              await db
                .delete(budgets)
                .where(and(eq(budgets.id, id), eq(budgets.user_id, user)))
                .returning({ id: budgets.id })
            ).length > 0,
        ),
      ownsCategory: (user, id) =>
        run(
          async () =>
            (
              await db
                .select({ id: categories.id })
                .from(categories)
                .where(
                  and(
                    eq(categories.id, id),
                    eq(categories.user_id, user),
                    eq(categories.kind, "expense"),
                  ),
                )
            ).length > 0,
        ),
      ownsAccount: (user, id) =>
        run(
          async () =>
            (
              await db
                .select({ id: accounts.id })
                .from(accounts)
                .where(and(eq(accounts.id, id), eq(accounts.user_id, user)))
            ).length > 0,
        ),
    });
  }),
);
