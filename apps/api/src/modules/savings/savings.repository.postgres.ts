import { Effect, Layer } from "effect";
import { and, eq, sql } from "drizzle-orm";
import { DatabaseService } from "@/db/db.service.js";
import { savings } from "@/db/schema/savings.js";
import { accounts } from "@/db/schema/accounts.js";
import { DatabaseError } from "@/shared/errors.js";
import { SavingsRepository } from "./savings.repository.js";
export const SavingsRepositoryPostgresLayer = Layer.effect(
  SavingsRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const run = <A>(task: () => Promise<A>) =>
      Effect.tryPromise({
        try: task,
        catch: (cause) =>
          new DatabaseError({
            message: "Savings database operation failed",
            cause,
          }),
      });
    return SavingsRepository.of({
      list: (user, accountId, id) =>
        run(() =>
          db
            .select()
            .from(savings)
            .where(
              and(
                eq(savings.user_id, user),
                accountId ? eq(savings.account_id, accountId) : undefined,
                id ? eq(savings.id, id) : undefined,
              ),
            )
            .orderBy(savings.created_at, savings.id),
        ),
      create: (user, data) =>
        run(
          async () =>
            (
              await db
                .insert(savings)
                .values({ ...data, user_id: user })
                .returning()
            )[0]!,
        ),
      update: (user, id, data) =>
        run(
          async () =>
            (
              await db
                .update(savings)
                .set({ ...data, updated_at: new Date() })
                .where(and(eq(savings.id, id), eq(savings.user_id, user)))
                .returning()
            )[0] ?? null,
        ),
      adjust: (user, id, amount, direction) =>
        run(async () => {
          const delta = direction === "deposit" ? amount : `-${amount}`;
          const next = sql`${savings.current_amount} + ${delta}::numeric`;
          return (
            (
              await db
                .update(savings)
                .set({ current_amount: next, updated_at: new Date() })
                .where(
                  and(
                    eq(savings.id, id),
                    eq(savings.user_id, user),
                    sql`${next} >= 0 AND ${next} <= 9999999999.99`,
                  ),
                )
                .returning()
            )[0] ?? null
          );
        }),
      delete: (user, id) =>
        run(
          async () =>
            (
              await db
                .delete(savings)
                .where(and(eq(savings.id, id), eq(savings.user_id, user)))
                .returning({ id: savings.id })
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
