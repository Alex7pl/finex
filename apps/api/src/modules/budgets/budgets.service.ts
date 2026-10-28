import { Effect } from "effect";
import { z } from "zod";
import { BudgetNotFound } from "@finex/shared/budgets/budgets.errors.js";
import { CurrentUser } from "@/runtime/request-context.js";
import { BudgetRepository, type BudgetSummary } from "./budgets.repository.js";
import { cents, money, progress } from "@/shared/money.js";
import {
  currentMonth,
  invalid,
  listQuery,
  name,
  parse,
  positiveMoney,
} from "./planning.validation.js";
const input = z.strictObject({
  name,
  monthly_limit: positiveMoney,
  category_id: z.uuid().nullable().optional(),
  about_type: z
    .enum(["Fixed_expense", "Variable_expense"])
    .nullable()
    .optional(),
});
const patch = input
  .partial()
  .refine((x) => Object.keys(x).length > 0, "Empty update");
export function budgetDto(row: BudgetSummary, month: string) {
  const limit = cents(row.monthly_limit),
    spent = cents(row.spent);
  return {
    id: row.id,
    name: row.name,
    monthly_limit: row.monthly_limit,
    category_id: row.category_id,
    about_type: row.about_type,
    spent: money(spent),
    pending: money(cents(row.pending)),
    month,
    remaining: money(limit > spent ? limit - spent : 0n),
    exceeded: money(spent > limit ? spent - limit : 0n),
    progress_percent: progress(spent, limit),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}
export function listBudgets(raw: unknown, rawId?: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const repo = yield* BudgetRepository;
    const query = yield* parse(listQuery, raw);
    const id = rawId === undefined ? undefined : yield* parse(z.uuid(), rawId);
    const month = query.month ?? currentMonth();
    if (query.accountId && !(yield* repo.ownsAccount(user.id, query.accountId)))
      return yield* Effect.fail(invalid("Unknown account"));
    const rows = yield* repo.list(user.id, month, query.accountId, id);
    if (id && !rows.length)
      return yield* Effect.fail(new BudgetNotFound({ id }));
    return id
      ? budgetDto(rows[0]!, month)
      : { items: rows.map((r) => budgetDto(r, month)), month };
  });
}
export function createBudget(raw: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const repo = yield* BudgetRepository;
    const data = yield* parse(input, raw);
    if (
      data.category_id &&
      !(yield* repo.ownsCategory(user.id, data.category_id))
    )
      return yield* Effect.fail(invalid("Expected an owned expense category"));
    const row = yield* repo.create(user.id, {
      ...data,
      category_id: data.category_id ?? null,
      about_type: data.about_type ?? null,
    });
    return yield* listBudgets({}, row.id);
  });
}
export function updateBudget(rawId: unknown, raw: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const repo = yield* BudgetRepository;
    const id = yield* parse(z.uuid(), rawId);
    const data = yield* parse(patch, raw);
    if (!(yield* repo.list(user.id, currentMonth(), undefined, id)).length)
      return yield* Effect.fail(new BudgetNotFound({ id }));
    if (
      data.category_id &&
      !(yield* repo.ownsCategory(user.id, data.category_id))
    )
      return yield* Effect.fail(invalid("Expected an owned expense category"));
    if (!(yield* repo.update(user.id, id, data)))
      return yield* Effect.fail(new BudgetNotFound({ id }));
    return yield* listBudgets({}, id);
  });
}
export function deleteBudget(rawId: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const repo = yield* BudgetRepository;
    const id = yield* parse(z.uuid(), rawId);
    if (!(yield* repo.delete(user.id, id)))
      return yield* Effect.fail(new BudgetNotFound({ id }));
    return { deleted: true };
  });
}
