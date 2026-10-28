import { DatabaseService } from "@/db/db.service.js";
import { DatabaseError } from "@/shared/errors.js";
import type {
  HistoryBalance,
  UpdatedAccount,
} from "@finex/shared/accounts/accounts.schema.js";
import { sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { AccountRepository } from "./accounts.repository.js";

// Use the same visibility boundary as the transaction feed, including every account leg.
// Each completed transfer split credits its destination and debits its source once.
const movements = (userId: string) => sql`
  visible AS (
    SELECT t.* FROM transactions t WHERE t.user_id = ${userId}
      AND (t."from" IS NULL OR EXISTS (SELECT 1 FROM accounts a WHERE a.id = t."from" AND a.user_id = ${userId}))
      AND NOT EXISTS (SELECT 1 FROM transactions_splits s JOIN accounts a ON a.id = s.account_id
        WHERE s.transaction_id = t.id AND a.user_id <> ${userId})
  ), movements AS (
    SELECT s.account_id, t.created_at AS period, t.type,
      CASE WHEN t.type = 'expense' THEN -abs(s.amount)
        ELSE abs(s.amount) END AS amount
    FROM visible t JOIN transactions_splits s ON s.transaction_id = t.id
    WHERE s.state = 'Completed'
    UNION ALL
    SELECT t."from", t.created_at, t.type, -abs(s.amount)
    FROM visible t JOIN transactions_splits s ON s.transaction_id = t.id
    WHERE t.type = 'transfer' AND t."from" IS NOT NULL AND s.state = 'Completed'
  )`;

export const AccountRepositoryPostgresLayer = Layer.effect(
  AccountRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const attempt = <A>(task: () => Promise<A>) =>
      Effect.tryPromise({
        try: task,
        catch: (cause) =>
          new DatabaseError({ message: "Failed to read account data", cause }),
      });
    const list = (userId: string, accountId?: string) =>
      attempt(async () => {
        const rows = await db.execute<UpdatedAccount>(sql`
      WITH ${movements(userId)}
      SELECT a.id, a.name, a.emoji, a.color, a.annual_interest_rate::text,
        a.interest_payment_rate::text, COALESCE(sum(m.amount), 0)::numeric(20,2)::text AS balance
      FROM accounts a LEFT JOIN movements m ON m.account_id = a.id AND m.period <= now()
      WHERE a.user_id = ${userId} ${accountId ? sql`AND a.id = ${accountId}::uuid` : sql``}
      GROUP BY a.id ORDER BY a.name, a.id
    `);
        return [...rows];
      });
    return AccountRepository.of({
      getUserAccounts: (userId) => list(userId),
      getAccountById: (userId, accountId) =>
        list(userId, accountId).pipe(Effect.map((rows) => rows[0] ?? null)),
      getHistoryBalance: (userId, start, end, interval, accountId) =>
        attempt(async () => {
          const rows = await db.execute<HistoryBalance>(sql`
        WITH ${movements(userId)},
        scoped AS (
          SELECT m.* FROM movements m JOIN accounts a ON a.id = m.account_id
          WHERE a.user_id = ${userId} ${accountId ? sql`AND a.id = ${accountId}::uuid` : sql``}
            AND m.period < ${end}::timestamptz
        ), summary AS (
          SELECT COALESCE(sum(amount), 0) AS total_balance,
            COALESCE(sum(amount) FILTER (WHERE period < ${start}::timestamptz), 0) AS initial_balance,
            COALESCE(sum(amount) FILTER (WHERE period >= ${start}::timestamptz - (${end}::timestamptz - ${start}::timestamptz)
              AND period < ${start}::timestamptz), 0) AS previous_change,
            COALESCE(sum(amount) FILTER (WHERE period >= ${start}::timestamptz AND type = 'income'), 0) AS income,
            COALESCE(sum(-amount) FILTER (WHERE period >= ${start}::timestamptz AND type = 'expense'), 0) AS expenses
          FROM scoped
        ), periods AS (
          SELECT bucket FROM generate_series(
            date_trunc(${interval}, ${start}::timestamptz AT TIME ZONE 'Europe/Madrid'),
            date_trunc(${interval}, ${end}::timestamptz AT TIME ZONE 'Europe/Madrid'),
            ${`1 ${interval}`}::interval
          ) bucket WHERE bucket < (${end}::timestamptz AT TIME ZONE 'Europe/Madrid')
        ), changes AS (
          SELECT date_trunc(${interval}, period AT TIME ZONE 'Europe/Madrid') AS bucket, sum(amount) AS change
          FROM scoped WHERE period >= ${start}::timestamptz GROUP BY 1
        ), points AS (
          SELECT p.bucket, COALESCE(c.change, 0) AS change,
            s.initial_balance + sum(COALESCE(c.change, 0)) OVER (ORDER BY p.bucket) AS balance
          FROM periods p LEFT JOIN changes c ON c.bucket = p.bucket CROSS JOIN summary s
        )
        SELECT 'EUR'::text AS currency, total_balance::numeric(20,2)::text,
          initial_balance::numeric(20,2)::text, previous_change::numeric(20,2)::text AS last_period_balance,
          income::numeric(20,2)::text, expenses::numeric(20,2)::text,
          COALESCE((SELECT jsonb_agg(jsonb_build_object('date', to_char(bucket, 'YYYY-MM-DD'),
            'change', change::numeric(20,2)::text, 'acumulated_balance', balance::numeric(20,2)::text)
            ORDER BY bucket) FROM points), '[]'::jsonb) AS history
        FROM summary
      `);
          return rows[0]!;
        }),
    });
  }),
);
