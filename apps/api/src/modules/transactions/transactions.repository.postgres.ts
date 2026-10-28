import { DatabaseService } from "@/db/db.service.js";
import { DatabaseError } from "@/shared/errors.js";
import type { TransactionDto, TransactionFilters, TransactionList } from "@finex/shared/transactions/transactions.schema.js";
import { sql, type SQL } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { TransactionRepository } from "./transactions.repository.js";

// Ownership is checked for the transaction and every referenced account. Invalid
// cross-user associations must never expose account names, IDs or split amounts.
function visibleTransactions(userId: string) {
  return sql`
    SELECT t.*,
      CASE WHEN t.type = 'Transfer' THEN 'transfer'
        WHEN t.type IN ('Fixed_income', 'Variable_income') THEN 'income'
        ELSE 'expense' END AS kind,
      CASE WHEN EXISTS (SELECT 1 FROM transactions_splits s WHERE s.transaction_id = t.id AND s.state = 'Pending')
        THEN CASE WHEN EXISTS (SELECT 1 FROM transactions_splits s WHERE s.transaction_id = t.id AND s.state = 'Completed')
          THEN 'Mixed' ELSE 'Pending' END
        WHEN EXISTS (SELECT 1 FROM transactions_splits s WHERE s.transaction_id = t.id) THEN 'Completed'
        ELSE 'Pending' END AS state,
      (t.type = 'Transfer' AND t."from" IS NOT NULL
        AND EXISTS (SELECT 1 FROM transactions_splits s WHERE s.transaction_id = t.id)
        AND NOT EXISTS (SELECT 1 FROM transactions_splits s WHERE s.transaction_id = t.id AND s.account_id = t."from")
      ) AS is_internal_transfer
    FROM transactions t
    WHERE t.user_id = ${userId}
      AND (t."from" IS NULL OR EXISTS (SELECT 1 FROM accounts a WHERE a.id = t."from" AND a.user_id = ${userId}))
      AND NOT EXISTS (
        SELECT 1 FROM transactions_splits s
        JOIN accounts a ON a.id = s.account_id
        WHERE s.transaction_id = t.id AND a.user_id <> ${userId}
      )
  `;
}

const accountJson = (alias: SQL) => sql`jsonb_build_object(
  'id', ${alias}.id, 'name', ${alias}.name, 'emoji', ${alias}.emoji, 'color', ${alias}.color)`;
const dto = sql`jsonb_build_object(
  'id', t.id, 'type', t.type, 'kind', t.kind,
  'category_id', (SELECT c.id FROM categories c WHERE c.id = t.category_id AND c.user_id = t.user_id),
  'category', (SELECT jsonb_build_object('id', c.id, 'name', c.name, 'kind', c.kind, 'emoji', c.emoji, 'color', c.color,
    'created_at', to_char(c.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'updated_at', to_char(c.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))
    FROM categories c WHERE c.id = t.category_id AND c.user_id = t.user_id),
  'description', t.description, 'amount', t.amount::text,
  'created_at', to_char(t.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'updated_at', to_char(t.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'cycle', to_char(t.cycle AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'is_active', t.is_active, 'state', t.state,
  'is_internal_transfer', t.is_internal_transfer,
  'from_account', (SELECT ${accountJson(sql`a`)} FROM accounts a WHERE a.id = t."from"),
  'splits', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', s.id, 'account', ${accountJson(sql`a`)}, 'amount', s.amount::text, 'state', s.state
    ) ORDER BY s.id)
    FROM transactions_splits s JOIN accounts a ON a.id = s.account_id
    WHERE s.transaction_id = t.id
  ), '[]'::jsonb)
)`;

function conditions(filters: TransactionFilters) {
  const parts: SQL[] = [sql`true`];
  if (filters.accountIds.length) {
    const ids = sql.join(filters.accountIds.map((id) => sql`${id}::uuid`), sql`, `);
    parts.push(sql`(t."from" IN (${ids}) OR EXISTS (
      SELECT 1 FROM transactions_splits s WHERE s.transaction_id = t.id AND s.account_id IN (${ids})
    ))`);
  }
  if (filters.categoryIds.length) parts.push(sql`EXISTS (SELECT 1 FROM categories c
    WHERE c.id = t.category_id AND c.user_id = t.user_id
      AND c.id IN (${sql.join(filters.categoryIds.map((id) => sql`${id}::uuid`), sql`, `)}))`);
  if (filters.uncategorized !== undefined) parts.push(filters.uncategorized
    ? sql`NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = t.category_id AND c.user_id = t.user_id)`
    : sql`EXISTS (SELECT 1 FROM categories c WHERE c.id = t.category_id AND c.user_id = t.user_id)`);
  if (filters.types.length) parts.push(sql`t.type IN (${sql.join(filters.types.map((type) => sql`${type}`), sql`, `)})`);
  if (filters.kind) parts.push(sql`t.kind = ${filters.kind}`);
  if (filters.state) parts.push(sql`t.state = ${filters.state}`);
  if (filters.search) {
    const pattern = `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`;
    parts.push(sql`t.description ILIKE ${pattern} ESCAPE '\\'`);
  }
  if (filters.dateFrom) parts.push(sql`t.created_at >= ${new Date(filters.dateFrom).toISOString()}::timestamptz`);
  if (filters.dateTo) {
    const dateOnly = filters.dateTo.length === 10;
    const end = new Date(Date.parse(filters.dateTo) + (dateOnly ? 86_400_000 : 0)).toISOString();
    parts.push(dateOnly ? sql`t.created_at < ${end}::timestamptz` : sql`t.created_at <= ${end}::timestamptz`);
  }
  if (filters.minAmount !== undefined) parts.push(sql`abs(t.amount) >= ${filters.minAmount}::numeric`);
  if (filters.maxAmount !== undefined) parts.push(sql`abs(t.amount) <= ${filters.maxAmount}::numeric`);
  if (filters.isActive !== undefined) parts.push(sql`t.is_active = ${filters.isActive}`);
  if (filters.internalTransfer !== undefined) parts.push(sql`t.is_internal_transfer = ${filters.internalTransfer}`);
  return sql.join(parts, sql` AND `);
}

export const TransactionRepositoryPostgresLayer = Layer.effect(
  TransactionRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    return {
      list: (userId: string, filters: TransactionFilters) => Effect.tryPromise({
        try: async () => {
          const column = { date: sql`t.created_at`, amount: sql`abs(t.amount)`, description: sql`t.description` }[filters.sortBy];
          const direction = filters.sortOrder === "asc" ? sql`ASC` : sql`DESC`;
          const order = sql`${column} ${direction} NULLS LAST, t.id ${direction}`;
          // Count and page share one statement/snapshot, including empty pages.
          const rows = await db.execute<{ items: TransactionDto[]; total: number }>(sql`
            WITH visible AS (${visibleTransactions(userId)}),
            filtered AS (SELECT * FROM visible t WHERE ${conditions(filters)}),
            page AS (
              SELECT ${dto} AS dto, row_number() OVER (ORDER BY ${order}) AS position
              FROM filtered t ORDER BY ${order}
              LIMIT ${filters.limit} OFFSET ${(filters.page - 1) * filters.limit}
            )
            SELECT COALESCE((SELECT jsonb_agg(dto ORDER BY position) FROM page), '[]'::jsonb) AS items,
              (SELECT count(*)::integer FROM filtered) AS total
          `);
          const { items, total } = rows[0]!;
          return { items, total, page: filters.page, limit: filters.limit,
            has_more: filters.page * filters.limit < total } satisfies TransactionList;
        },
        catch: (cause) => new DatabaseError({ message: "Failed to list transactions", cause }),
      }),
      setCategory: (userId: string, id: string, categoryId: string | null) => Effect.tryPromise({
        try: async () => db.transaction(async (tx) => {
          // Recheck ownership and kind in the mutation itself to avoid races with validation.
          const rows = await tx.execute<{ id: string }>(sql`
            WITH visible AS (${visibleTransactions(userId)})
            UPDATE transactions t SET category_id = ${categoryId}::uuid, updated_at = now()
            WHERE t.id = ${id}::uuid AND t.id IN (SELECT id FROM visible)
              AND (${categoryId}::uuid IS NULL OR EXISTS (
                SELECT 1 FROM categories c WHERE c.id = ${categoryId}::uuid AND c.user_id = ${userId}
                  AND ((c.kind = 'income' AND t.type IN ('Fixed_income', 'Variable_income'))
                    OR (c.kind = 'expense' AND t.type IN ('Fixed_expense', 'Variable_expense')))
              )) RETURNING t.id
          `);
          if (!rows.length) return null;
          const result = await tx.execute<{ dto: TransactionDto }>(sql`
            WITH visible AS (${visibleTransactions(userId)}) SELECT ${dto} AS dto FROM visible t WHERE t.id = ${id}::uuid
          `);
          return result[0]?.dto ?? null;
        }),
        catch: (cause) => new DatabaseError({ message: "Failed to set transaction category", cause }),
      }),
      findById: (userId: string, id: string) => Effect.tryPromise({
        try: async () => {
          const rows = await db.execute<{ dto: TransactionDto }>(sql`
            WITH visible AS (${visibleTransactions(userId)})
            SELECT ${dto} AS dto FROM visible t WHERE t.id = ${id}::uuid
          `);
          return rows[0]?.dto ?? null;
        },
        catch: (cause) => new DatabaseError({ message: "Failed to read transaction", cause }),
      }),
    };
  }),
);
