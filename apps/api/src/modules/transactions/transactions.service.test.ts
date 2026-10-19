import assert from "node:assert/strict";
import test from "node:test";
import { Effect } from "effect";
import { CurrentUser } from "@/runtime/request-context.js";
import { TransactionRepository } from "./transactions.repository.js";
import { getTransactionById, getTransactions } from "./transactions.service.js";
import { parseTransactionFilters } from "./transactions.validation.js";

const user = { id: "00000000-0000-4000-8000-000000000001", email: "user@test.dev" };

test("transaction filters accept repeated/comma-separated IDs and explicit false", async () => {
  const filters = await Effect.runPromise(parseTransactionFilters({
    accountId: [user.id, user.id], type: "Transfer,Fixed_income", internalTransfer: "false",
    minAmount: "0.01", maxAmount: "9999999999.99", dateFrom: "2026-10-01", limit: "100",
  }));
  assert.deepEqual(filters.types, ["Transfer", "Fixed_income"]);
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
