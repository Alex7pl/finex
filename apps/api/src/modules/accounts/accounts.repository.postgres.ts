import { DatabaseService } from "@/db/db.service.js";
import { transactions, transactions_splits } from "@/db/schema/transactions.js";
import { DatabaseError } from "@/shared/errors.js";
import { sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import {
  HistoryBalance,
  UpdatedAccount,
} from "~/packages/shared/dist/accounts/accounts.schema.js";
import { AccountRepository } from "./accounts.repository.js";

export const AccountRepositoryPostgresLayer = Layer.effect(
  AccountRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return {
      getUserAccounts: (userId: string) =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db.execute<UpdatedAccount>(sql`
                            WITH user_accounts AS (
                                SELECT 
                                    id,
                                    annual_interest_rate,
                                    interest_payment_rate,
                                    user_id,
                                    name,
                                    emoji,
                                    color
                                FROM accounts
                                WHERE user_id = ${userId}
                            ),
                            movements AS (
                                SELECT 
                                  s.account_id,
                                  CASE
                                    WHEN t.type IN ('Fixed_income', 'Variable_income', 'Transfer') THEN s.amount
                                    WHEN t.type IN ('Fixed_expense', 'Variable_expense')  THEN -s.amount
                                    ELSE 0
                                  END AS amount
                                FROM ${transactions_splits} s
                                INNER JOIN ${transactions} t ON s.transaction_id = t.id
                                WHERE t.type IN ('Fixed_income', 'Variable_income', 'Transfer', 'Fixed_expense', 'Variable_expense') 
                                  AND s.account_id IN (SELECT id FROM user_accounts)

                                UNION ALL

                                SELECT
                                  ${transactions}.from AS account_id,
                                  -${transactions}.amount AS amount
                                FROM ${transactions}
                                WHERE ${transactions}.from IN (SELECT id FROM user_accounts) 
                                  AND ${transactions}.type = 'Transfer'
                            ),
                            balances AS (
                                SELECT 
                                    account_id,
                                    SUM(amount) AS balance
                                FROM movements
                                GROUP BY account_id
                            ),
                            data AS (
                                SELECT 
                                    ua.id,
                                    ua.name,
                                    ua.emoji,
                                    ua.color,
                                    COALESCE(b.balance, 0) AS balance,
                                    ua.annual_interest_rate,
                                    ua.interest_payment_rate
                                FROM user_accounts ua
                                LEFT JOIN balances b ON ua.id = b.account_id
                            )
                            SELECT 
                                id,
                                name,
                                emoji,
                                color,
                                balance,
                                annual_interest_rate,
                                interest_payment_rate
                            FROM data
                            ORDER BY name ASC
                        `);
            return rows;
          },
          catch: (cause) =>
            new DatabaseError({
              message: "Failed to read user accounts",
              cause,
            }),
        }),
      getAccountById: (accountId: string) =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db.execute<UpdatedAccount>(sql`
                            WITH user_account AS (
                                SELECT 
                                    id,
                                    annual_interest_rate,
                                    interest_payment_rate,
                                    user_id,
                                    name,
                                    emoji,
                                    color
                                FROM accounts
                                WHERE id = ${accountId}
                            ),
                            movements AS (
                                SELECT 
                                  s.account_id,
                                  CASE
                                    WHEN t.type IN ('Fixed_income', 'Variable_income', 'Transfer') THEN s.amount
                                    WHEN t.type IN ('Fixed_expense', 'Variable_expense')  THEN -s.amount
                                    ELSE 0
                                  END AS amount
                                FROM ${transactions_splits} s
                                INNER JOIN ${transactions} t ON s.transaction_id = t.id
                                WHERE t.type IN ('Fixed_income', 'Variable_income', 'Transfer', 'Fixed_expense', 'Variable_expense') 
                                  AND s.account_id IN (SELECT id FROM user_account)

                                UNION ALL

                                SELECT
                                  ${transactions}.from AS account_id,
                                  -${transactions}.amount AS amount
                                FROM ${transactions}
                                WHERE ${transactions}.from IN (SELECT id FROM user_account) 
                                  AND ${transactions}.type = 'Transfer'
                            ),
                            balances AS (
                                SELECT 
                                    account_id,
                                    SUM(amount) AS balance
                                FROM movements
                                GROUP BY account_id
                            ),
                            data AS (
                                SELECT 
                                    ua.id,
                                    ua.name,
                                    ua.emoji,
                                    ua.color,
                                    COALESCE(b.balance, 0) AS balance,
                                    ua.annual_interest_rate,
                                    ua.interest_payment_rate
                                FROM user_account ua
                                LEFT JOIN balances b ON ua.id = b.account_id
                            )
                            SELECT 
                                id,
                                name,
                                emoji,
                                color,
                                balance,
                                annual_interest_rate,
                                interest_payment_rate
                            FROM data
                        `);
            return rows[0];
          },
          catch: (cause) =>
            new DatabaseError({
              message: "Failed to read account",
              cause,
            }),
        }),
      getHistoryBalance: (
        userId: string,
        startDate: string,
        endDate: string,
        interval: "day" | "month",
        accountId?: string,
      ) =>
        Effect.tryPromise({
          try: async () => {
            const step = `1 ${interval}`;

            const rows = await db.execute<HistoryBalance>(sql`
              WITH params AS (
                SELECT
                  ${startDate}::timestamptz AS start_at,
                  ${endDate}::timestamptz AS end_at,
                  ${interval}::text AS grain,
                  ${step}::interval AS step,
                  'Europe/Madrid'::text AS timezone
              ),
              user_accounts AS (
                SELECT id
                FROM accounts
                WHERE user_id = ${userId}
                  ${accountId ? sql`AND id = ${accountId}` : sql``}
              ),
              movements AS (
                SELECT
                  s.account_id,
                  CASE
                    WHEN t.type IN (
                      'Fixed_income', 'Variable_income', 'Transfer'
                    ) THEN s.amount
                    WHEN t.type IN (
                      'Fixed_expense', 'Variable_expense'
                    ) THEN -s.amount
                    ELSE 0
                  END AS amount,
                  t.created_at AS period
                FROM ${transactions_splits} s
                INNER JOIN ${transactions} t
                  ON t.id = s.transaction_id
                WHERE s.account_id IN (SELECT id FROM user_accounts)
                  AND t.type IN (
                    'Fixed_income',
                    'Variable_income',
                    'Fixed_expense',
                    'Variable_expense',
                    'Transfer'
                  )
                  AND t.created_at < (SELECT end_at FROM params)

                UNION ALL

                SELECT
                  t."from" AS account_id,
                  -t.amount AS amount,
                  t.created_at AS period
                FROM ${transactions} t
                WHERE t."from" IN (SELECT id FROM user_accounts)
                  AND t.type = 'Transfer'
                  AND t.created_at < (SELECT end_at FROM params)
              ),
              periods AS (
                SELECT series.bucket
                FROM params p
                CROSS JOIN LATERAL generate_series(
                  date_trunc(p.grain, p.start_at AT TIME ZONE p.timezone),
                  date_trunc(p.grain, p.end_at AT TIME ZONE p.timezone),
                  p.step
                ) AS series(bucket)
                WHERE series.bucket < (p.end_at AT TIME ZONE p.timezone)
              ),
              period_movements AS (
                SELECT
                  date_trunc(
                    p.grain,
                    m.period AT TIME ZONE p.timezone
                  ) AS bucket,
                  SUM(m.amount) AS change
                FROM movements m
                CROSS JOIN params p
                WHERE m.period >= p.start_at
                  AND m.period < p.end_at
                GROUP BY
                  date_trunc(p.grain, m.period AT TIME ZONE p.timezone)
              ),
              summary AS (
                SELECT
                  COALESCE(
                    SUM(m.amount) FILTER (
                      WHERE m.period < p.start_at
                    ),
                    0
                  ) AS initial_balance,

                  COALESCE(SUM(m.amount), 0) AS total_balance,

                  COALESCE(
                    SUM(m.amount) FILTER (
                      WHERE m.period >= p.start_at - (p.end_at - p.start_at)
                        AND m.period < p.start_at
                    ),
                    0
                  ) AS previous_period_change
                FROM movements m
                CROSS JOIN params p
              ),
              points AS (
                SELECT
                  periods.bucket,
                  COALESCE(pm.change, 0) AS change,
                  s.initial_balance
                    + SUM(COALESCE(pm.change, 0)) OVER (
                        ORDER BY periods.bucket
                        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                      ) AS accumulated_balance
                FROM periods
                LEFT JOIN period_movements pm
                  ON pm.bucket = periods.bucket
                CROSS JOIN summary s
              )
              SELECT
                'EUR'::text AS currency,
                s.total_balance::text AS total_balance,
                s.initial_balance::text AS initial_balance,
                s.previous_period_change::text AS last_period_balance,
                COALESCE(
                  (
                    SELECT jsonb_agg(
                      jsonb_build_object(
                        'date', to_char(pt.bucket, 'YYYY-MM-DD'),
                        'change', pt.change::text,
                        'acumulated_balance', pt.accumulated_balance::text
                      )
                      ORDER BY pt.bucket
                    )
                    FROM points pt
                  ),
                  '[]'::jsonb
                ) AS history
              FROM summary s
            `);

            return rows[0];
          },
          catch: (cause) =>
            new DatabaseError({
              message: "Failed to read account",
              cause,
            }),
        }),
    };
  }),
);
