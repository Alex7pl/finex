import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { DatabaseService } from "@/db/db.service.js";
import { DatabaseError } from "@/shared/errors.js";
import { cents, money } from "@/shared/money.js";
import { ValidationError } from "@finex/shared/errors.js";
import { SourceNotFound, type SourceDto, type SourceKind, type SourceWrite, type MovementWrite, type SplitWrite } from "@finex/shared/ledger/ledger.schema.js";
import { TransactionNotFound } from "@finex/shared/transactions/transactions.errors.js";
import { invalid } from "../budgets/planning.validation.js";
import { debtInput, incomeInput } from "./ledger.validation.js";
import { LedgerRepository } from "./ledger.repository.js";

type Db = typeof DatabaseService.Service;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
const table = (kind: SourceKind) => sql.identifier(kind === "debt" ? "debts" : "incomes");
const sourceColumn = (kind: SourceKind) => sql.identifier(kind === "debt" ? "debt_id" : "income_id");
type StoredSource = SourceWrite & { id: string; quota?: string };

async function lockSource(tx: Tx, user: string, kind: SourceKind, id: string) {
  const rows = await tx.execute<StoredSource>(sql`SELECT *, ${kind === "debt" ? sql`quota` : sql`amount`} AS amount
    FROM ${table(kind)} WHERE id = ${id}::uuid AND user_id = ${user}::uuid FOR UPDATE`);
  if (!rows[0]) throw new SourceNotFound({ id });
  return { ...rows[0], time_limit: rows[0].time_limit ? new Date(rows[0].time_limit).toISOString() : null };
}
async function validateReferences(tx: Tx, user: string, type: "income" | "expense", category: string | null, accounts: readonly string[]) {
  // Locks keep ownership/category checks valid until the write commits.
  for (const id of [...new Set(accounts)].sort()) {
    const rows = await tx.execute(sql`SELECT id FROM accounts WHERE id = ${id}::uuid AND user_id = ${user}::uuid FOR SHARE`);
    if (!rows.length) throw invalid("Expected owned accounts");
  }
  if (category) {
    const rows = await tx.execute(sql`SELECT id FROM categories
      WHERE id = ${category}::uuid AND user_id = ${user}::uuid AND kind = ${type} FOR SHARE`);
    if (!rows.length) throw invalid("Expected an owned category matching the movement type");
  }
}
function validateSplits(amount: string, splits: readonly SplitWrite[]) {
  if (!splits.length || splits.some((s) => cents(s.amount) <= 0n) ||
    splits.reduce((sum, s) => sum + cents(s.amount), 0n) !== cents(amount)) {
    throw invalid("Split amounts must equal the positive movement amount");
  }
}
async function insertSplits(tx: Tx, id: string, splits: readonly SplitWrite[]) {
  const values = splits.map((s) => sql`(${randomUUID()}::uuid, ${id}::uuid, ${s.account_id}::uuid, ${s.amount}::numeric, ${s.state})`);
  await tx.execute(sql`INSERT INTO transactions_splits (id, transaction_id, account_id, amount, state)
    VALUES ${sql.join(values, sql`, `)}`);
}
async function insertMovement(tx: Tx, user: string, data: MovementWrite, source?: { kind: SourceKind; id: string }) {
  validateSplits(data.amount, data.splits);
  await validateReferences(tx, user, data.type, data.category_id, data.splits.map((s) => s.account_id));
  const id = randomUUID();
  await tx.execute(sql`INSERT INTO transactions (id, user_id, type, description, amount, category_id, debt_id, income_id)
    VALUES (${id}::uuid, ${user}::uuid, ${data.type}, ${data.description}, ${data.amount}::numeric, ${data.category_id}::uuid,
      ${source?.kind === "debt" ? source.id : null}::uuid, ${source?.kind === "income" ? source.id : null}::uuid)`);
  await insertSplits(tx, id, data.splits);
  return id;
}
async function accrued(tx: Tx, user: string, kind: SourceKind, id: string) {
  const rows = await tx.execute<{ amount: string }>(sql`SELECT COALESCE(sum(abs(amount)), 0)::text AS amount
    FROM transactions WHERE ${sourceColumn(kind)} = ${id}::uuid AND user_id = ${user}::uuid`);
  return cents(rows[0]!.amount);
}
export const LedgerRepositoryPostgresLayer = Layer.effect(LedgerRepository, Effect.gen(function* () {
  const db = yield* DatabaseService;
  const run = <A>(task: () => Promise<A>) => Effect.tryPromise({
    try: task,
    catch: (cause) => cause instanceof ValidationError || cause instanceof SourceNotFound || cause instanceof TransactionNotFound
      ? cause : new DatabaseError({ message: "Ledger database operation failed", cause }),
  });
  return LedgerRepository.of({
    list: (user, kind, id) => run(async () => {
      const rows = await db.execute<SourceDto>(sql`
        SELECT o.id, ${kind}::text AS kind, o.name, o.account_id, o.category_id,
          ${kind === "debt" ? sql`o.quota` : sql`o.amount`}::text AS amount, o.is_active,
          ${kind === "debt" ? sql`o.capital::text` : sql`NULL::text`} AS capital,
          ${kind === "debt" ? sql`o.interests::text` : sql`NULL::text`} AS interests,
          ${kind === "debt" ? sql`to_char(o.time_limit AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')` : sql`NULL::text`} AS time_limit,
          COALESCE(h.accrued, 0)::text AS accrued_amount,
          COALESCE(h.settled, 0)::text AS settled_amount,
          COALESCE(h.pending, 0)::text AS pending_amount,
          ${kind === "debt" ? sql`(o.capital + COALESCE(o.interests, 0))::text` : sql`NULL::text`} AS total_amount,
          ${kind === "debt" ? sql`greatest(o.capital + COALESCE(o.interests, 0) - COALESCE(h.settled, 0), 0)::text` : sql`NULL::text`} AS remaining_amount,
          COALESCE(h.count, 0)::integer AS transaction_count,
          to_char(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at,
          to_char(o.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS updated_at
        FROM ${table(kind)} o
        LEFT JOIN LATERAL (
          SELECT sum(p.amount) AS accrued, sum(p.settled) AS settled, sum(p.pending) AS pending, count(*) AS count
          FROM (
            SELECT abs(t.amount) AS amount,
              COALESCE(sum(abs(s.amount)) FILTER (WHERE s.state = 'Completed'), 0) AS settled,
              COALESCE(sum(abs(s.amount)) FILTER (WHERE s.state = 'Pending'), 0) AS pending
            FROM transactions t LEFT JOIN transactions_splits s ON s.transaction_id = t.id
            WHERE t.${sourceColumn(kind)} = o.id AND t.user_id = o.user_id
              AND (t."from" IS NULL OR EXISTS (SELECT 1 FROM accounts a WHERE a.id = t."from" AND a.user_id = o.user_id))
              AND NOT EXISTS (SELECT 1 FROM transactions_splits xs JOIN accounts xa ON xa.id = xs.account_id
                WHERE xs.transaction_id = t.id AND xa.user_id <> o.user_id)
            GROUP BY t.id
          ) p
        ) h ON true
        WHERE o.user_id = ${user}::uuid ${id ? sql`AND o.id = ${id}::uuid` : sql``}
          AND EXISTS (SELECT 1 FROM accounts a WHERE a.id = o.account_id AND a.user_id = o.user_id)
        ORDER BY o.created_at DESC, o.id DESC`);
      // PostgreSQL greatest(NULL, 0) yields 0; unlimited sources have no remaining total.
      return [...rows].map((r) => ({ ...r,
        accrued_amount: money(cents(r.accrued_amount)),
        settled_amount: money(cents(r.settled_amount)),
        pending_amount: money(cents(r.pending_amount)),
        total_amount: r.total_amount === null ? null : money(cents(r.total_amount)),
        remaining_amount: r.capital === null ? null : money(cents(r.remaining_amount!)),
      }));
    }),
    save: (user, kind, patch, id) => run(() => db.transaction(async (tx) => {
      const previous = id ? await lockSource(tx, user, kind, id) : {};
      const parsed = (kind === "debt" ? debtInput : incomeInput).safeParse({
        ...Object.fromEntries(Object.entries(previous).filter(([key]) => (kind === "debt" ? ["name", "account_id", "category_id", "amount", "is_active", "capital", "interests", "time_limit"] : ["name", "account_id", "category_id", "amount", "is_active"]).includes(key))),
        ...patch,
      });
      if (!parsed.success) throw invalid("Invalid source fields");
      const data: SourceWrite = { capital: null, interests: null, time_limit: null, ...parsed.data };
      await validateReferences(tx, user, kind === "debt" ? "expense" : "income", data.category_id, [data.account_id]);
      const capital = data.capital;
      const interests = data.interests;
      if (capital === null && interests !== null) throw invalid("Interest requires capital");
      if (id && capital !== null && await accrued(tx, user, kind, id) > cents(capital) + cents(interests ?? "0")) {
        throw invalid("Debt total cannot be less than the amount already accrued");
      }
      const sourceId = id ?? randomUUID();
      if (id) {
        await tx.execute(sql`UPDATE ${table(kind)} SET name = ${data.name}, account_id = ${data.account_id}::uuid,
          category_id = ${data.category_id}::uuid, is_active = ${data.is_active}, updated_at = now(),
          ${kind === "debt" ? sql`quota = ${data.amount}::numeric, capital = ${capital}::numeric,
            interests = ${interests}::numeric, time_limit = ${data.time_limit}::timestamptz` : sql`amount = ${data.amount}::numeric`}
          WHERE id = ${id}::uuid AND user_id = ${user}::uuid`);
      } else if (kind === "debt") {
        await tx.execute(sql`INSERT INTO debts (id, user_id, name, account_id, category_id, is_active, quota, capital, interests, time_limit)
          VALUES (${sourceId}::uuid, ${user}::uuid, ${data.name}, ${data.account_id}::uuid, ${data.category_id}::uuid,
            ${data.is_active}, ${data.amount}::numeric, ${capital}::numeric, ${interests}::numeric, ${data.time_limit}::timestamptz)`);
      } else {
        await tx.execute(sql`INSERT INTO incomes (id, user_id, name, account_id, category_id, is_active, amount)
          VALUES (${sourceId}::uuid, ${user}::uuid, ${data.name}, ${data.account_id}::uuid, ${data.category_id}::uuid, ${data.is_active}, ${data.amount}::numeric)`);
      }
      return sourceId;
    })),
    delete: (user, kind, id) => run(() => db.transaction(async (tx) => {
      await lockSource(tx, user, kind, id);
      await tx.execute(sql`DELETE FROM ${table(kind)} WHERE id = ${id}::uuid AND user_id = ${user}::uuid`);
    })),
    createMovement: (user, data) => run(() => db.transaction((tx) => insertMovement(tx, user, data))),
    accrue: (user, kind, id, input) => run(() => db.transaction(async (tx) => {
      const source = await lockSource(tx, user, kind, id);
      if (!source.is_active) throw invalid("Inactive sources cannot accrue movements");
      const amount = input.amount ?? source.amount;
      if (kind === "debt" && source.capital !== null) {
        if (await accrued(tx, user, kind, id) + cents(amount) > cents(source.capital) + cents(source.interests ?? "0")) {
          throw invalid("Accrual exceeds the remaining debt; adjust the last installment amount");
        }
      }
      return insertMovement(tx, user, {
        type: kind === "debt" ? "expense" : "income", amount,
        description: input.description ?? source.name, category_id: source.category_id,
        splits: input.splits ?? [{ account_id: source.account_id, amount, state: "Pending" }],
      }, { kind, id });
    })),
    settle: (user, id, splits) => run(() => db.transaction(async (tx) => {
      const rows = await tx.execute<{ amount: string; type: string; category_id: string | null }>(sql`SELECT amount::text, type, category_id FROM transactions
        WHERE id = ${id}::uuid AND user_id = ${user}::uuid FOR UPDATE`);
      const movement = rows[0];
      if (!movement) throw new TransactionNotFound({ id });
      if (movement.type !== "income" && movement.type !== "expense") throw invalid("Settlement only supports income and expense movements");
      validateSplits(money(cents(movement.amount) < 0n ? -cents(movement.amount) : cents(movement.amount)), splits);
      // Existing malformed cross-user associations cannot be mutated through this endpoint.
      const foreign = await tx.execute(sql`SELECT s.id FROM transactions_splits s JOIN accounts a ON a.id = s.account_id
        WHERE s.transaction_id = ${id}::uuid AND a.user_id <> ${user}::uuid`);
      if (foreign.length) throw new TransactionNotFound({ id });
      await validateReferences(tx, user, movement.type, movement.category_id, splits.map((s) => s.account_id));
      await tx.execute(sql`DELETE FROM transactions_splits WHERE transaction_id = ${id}::uuid`);
      await insertSplits(tx, id, splits);
      await tx.execute(sql`UPDATE transactions SET updated_at = now() WHERE id = ${id}::uuid`);
    })),
  });
}));
