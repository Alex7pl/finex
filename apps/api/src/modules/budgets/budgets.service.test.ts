import assert from "node:assert/strict";
import test from "node:test";
import { Effect } from "effect";
import { CurrentUser } from "@/runtime/request-context.js";
import { BudgetRepository, type BudgetSummary } from "./budgets.repository.js";
import {
  budgetDto,
  createBudget,
  listBudgets,
  updateBudget,
  deleteBudget,
} from "./budgets.service.js";
const id = "00000000-0000-4000-8000-000000000001";
const user = { id, email: "test@example.com" };
const row: BudgetSummary = {
  id,
  user_id: id,
  name: "Food",
  monthly_limit: "0.30",
  about_type: null,
  category_id: null,
  spent: "0.10",
  pending: "0.05",
  created_at: new Date(),
  updated_at: new Date(),
};
const repository: typeof BudgetRepository.Service = {
  list: (owner, month) => {
    assert.equal(owner, id);
    assert.match(month, /^\d{4}-\d{2}$/);
    return Effect.succeed([row]);
  },
  create: () => Effect.succeed(row),
  update: () => Effect.succeed(row),
  delete: () => Effect.succeed(true),
  ownsAccount: () => Effect.succeed(false),
  ownsCategory: () => Effect.succeed(false),
};
const run = <E>(
  effect: Effect.Effect<unknown, E, CurrentUser | BudgetRepository>,
  repo = repository,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provideService(CurrentUser, user),
      Effect.provideService(BudgetRepository, repo),
      Effect.either,
    ),
  );
test("budget uses exact cents and excludes pending from remaining/progress", () => {
  const dto = budgetDto(row, "2026-10");
  assert.equal(dto.remaining, "0.20");
  assert.equal(dto.exceeded, "0.00");
  assert.equal(dto.progress_percent, 33.33);
  assert.equal(
    budgetDto({ ...row, spent: "0.40" }, "2026-10").exceeded,
    "0.10",
  );
});
test("budget accepts explicit month and rejects malformed strict inputs", async () => {
  assert.equal((await run(listBudgets({ month: "2026-10" })))._tag, "Right");
  for (const monthly_limit of [
    0.1,
    "0",
    "-1",
    "1.001",
    "1e3",
    "10000000000",
    "01.20",
  ]) {
    const result = await run(createBudget({ name: "Food", monthly_limit }));
    assert.equal(result._tag, "Left", String(monthly_limit));
  }
  for (const query of [
    { month: "2026-13" },
    { month: ["2026-10"] },
    { unknown: true },
  ])
    assert.equal((await run(listBudgets(query)))._tag, "Left");
  assert.equal((await run(updateBudget(id, {})))._tag, "Left");
  assert.equal(
    (
      await run(
        createBudget({
          name: "Food",
          monthly_limit: "1",
          about_type: "income",
        }),
      )
    )._tag,
    "Left",
  );
});
test("budgets reject foreign or income categories and hide another owner's budget", async () => {
  const foreign = await run(
    createBudget({ name: "Food", monthly_limit: "10", category_id: id }),
  );
  assert.equal(foreign._tag, "Left");
  const absent = {
    ...repository,
    list: () => Effect.succeed([]),
    delete: () => Effect.succeed(false),
  };
  for (const operation of [
    listBudgets({}, id),
    updateBudget(id, { name: "Other" }),
    deleteBudget(id),
  ]) {
    const result = await run(operation, absent);
    assert.equal(result._tag, "Left");
    if (result._tag === "Left")
      assert.equal(result.left._tag, "BudgetNotFound");
  }
});
