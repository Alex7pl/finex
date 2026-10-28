import assert from "node:assert/strict";
import test from "node:test";
import { Effect } from "effect";
import { CurrentUser } from "@/runtime/request-context.js";
import { TransactionRepository } from "./transactions.repository.js";
import { getTransactionById, getTransactions, setTransactionCategory } from "./transactions.service.js";
import { parseTransactionFilters } from "./transactions.validation.js";

const user = { id: "00000000-0000-4000-8000-000000000001", email: "user@test.dev" };

test("transaction filters accept repeated/comma-separated IDs and explicit false", async () => {
  const filters = await Effect.runPromise(parseTransactionFilters({
    accountId: [user.id, user.id], type: "transfer,income", internalTransfer: "false",
    minAmount: "0.01", maxAmount: "9999999999.99", dateFrom: "2026-10-01", limit: "100",
  }));
  assert.deepEqual(filters.types, ["transfer", "income"]);
  assert.equal(filters.internalTransfer, false);
  assert.equal(filters.limit, 100);
  assert.equal(filters.page, 1);
});

test("invalid filters fail with ValidationError before repository access", async () => {
  for (const query of [
    { accountId: "bad" }, { type: "bad" }, { limit: "101" }, { page: "1.5" },
    { page: "1000001" }, { internalTransfer: "yes" }, { search: { nested: "x" } },
    { dateFrom: "2026-02-30" }, { dateFrom: "2026-10-20", dateTo: "2026-10-01" },
    { minAmount: "12", maxAmount: "10" }, { minAmount: "0.001" },
    { sortBy: "id; DROP TABLE transactions" }, { unknown: "value" },
  ]) {
    const result = await Effect.runPromise(Effect.either(parseTransactionFilters(query)));
    assert.equal(result._tag, "Left", JSON.stringify(query));
    if (result._tag === "Left") assert.equal(result.left._tag, "ValidationError");
  }
});

test("list uses authenticated ownership and detail hides missing or foreign IDs", async () => {
  let calls = 0;
  const repository: typeof TransactionRepository.Service = {
    list: (userId, filters) => {
      assert.equal(userId, user.id);
      calls++;
      return Effect.succeed({ items: [], total: 0, page: filters.page, limit: filters.limit, has_more: false });
    },
    setCategory: () => Effect.succeed(null),
    findById: (userId) => {
      assert.equal(userId, user.id);
      calls++;
      return Effect.succeed(null);
    },
  };
  const run = <A, E>(program: Effect.Effect<A, E, CurrentUser | TransactionRepository>) => Effect.runPromise(
    program.pipe(Effect.provideService(CurrentUser, user), Effect.provideService(TransactionRepository, repository), Effect.either),
  );
  assert.equal((await run(getTransactions({})))._tag, "Right");
  const missing = await run(getTransactionById(user.id));
  assert.equal(missing._tag, "Left");
  if (missing._tag === "Left") assert.equal(missing.left._tag, "TransactionNotFound");
  const invalid = await run(getTransactionById("bad"));
  assert.equal(invalid._tag, "Left");
  assert.equal(calls, 2);
});

test("category filters parse multiple IDs and reject contradictory or malformed flags", async () => {
  const result = await Effect.runPromise(parseTransactionFilters({ categoryId: `${user.id},${user.id}`, uncategorized: "false" }));
  assert.deepEqual(result.categoryIds, [user.id, user.id]);
  assert.equal(result.uncategorized, false);
  for (const query of [{ categoryId: "bad" }, { uncategorized: "yes" }, { categoryId: user.id, uncategorized: "true" }]) {
    const result = await Effect.runPromise(Effect.either(parseTransactionFilters(query)));
    assert.equal(result._tag, "Left");
  }
});


test("assign categories enforces authenticated ownership, matching kind and transfer exclusion", async () => {
  const { CategoryRepository } = await import("../categories/categories.repository.js");
  const category = { id: user.id, name: "Food", kind: "expense" as "expense" | "income", emoji: null, color: null,
    created_at: "2026-10-19T00:00:00Z", updated_at: "2026-10-19T00:00:00Z" };
  const transaction = { id: user.id, type: "expense" as const, kind: "expense" as "income" | "expense" | "transfer",
    description: "Lunch", amount: "12.00", category_id: null, category: null,
    created_at: category.created_at, updated_at: category.updated_at, debt_id: null, income_id: null,
    state: "Completed" as const, is_internal_transfer: false, from_account: null, splits: [] };
  let writes = 0, found = true;
  const transactions: typeof TransactionRepository.Service = {
    list: () => Effect.die("unused"),
    findById: (owner) => { assert.equal(owner, user.id); return Effect.succeed(transaction); },
    setCategory: (owner, id, categoryId) => { assert.equal(owner, user.id); assert.equal(id, user.id); writes++;
      return Effect.succeed({ ...transaction, category_id: categoryId, category: categoryId ? category : null }); },
  };
  const categories: typeof CategoryRepository.Service = {
    list: () => Effect.die("unused"), create: () => Effect.die("unused"), update: () => Effect.die("unused"), remove: () => Effect.die("unused"),
    findById: (owner) => { assert.equal(owner, user.id); return Effect.succeed(found ? category : null); },
  };
  const run = (input: unknown) => Effect.runPromise(setTransactionCategory(user.id, input).pipe(
    Effect.provideService(CurrentUser, user), Effect.provideService(TransactionRepository, transactions),
    Effect.provideService(CategoryRepository, categories), Effect.either,
  ));
  assert.equal((await run({ category_id: user.id }))._tag, "Right");
  assert.equal((await run({ category_id: null }))._tag, "Right");
  found = false;
  const foreign = await run({ category_id: user.id });
  assert.equal(foreign._tag, "Left");
  if (foreign._tag === "Left") assert.equal(foreign.left._tag, "CategoryNotFound");
  found = true;
  for (const kind of ["income", "transfer"] as const) {
    transaction.kind = kind;
    const result = await run({ category_id: user.id });
    assert.equal(result._tag, "Left");
    if (result._tag === "Left") assert.equal(result.left._tag, "ValidationError");
  }
  assert.equal((await run({ category_id: null }))._tag, "Right");
  assert.equal((await run({}))._tag, "Left");
  assert.equal(writes, 3);
});
