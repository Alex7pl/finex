import assert from "node:assert/strict";
import test from "node:test";
import { debtInput, debtPatch, incomePatch, movementInput, accrualInput } from "./ledger.validation.js";
const account = "00000000-0000-4000-8000-000000000001";
test("movement writes require exact positive allocations and reject source forgery and removed types", () => {
  const base = { type: "income", amount: "0.30", splits: [{ account_id: account, amount: "0.10" }, { account_id: account, amount: "0.20" }] };
  assert.equal(movementInput.safeParse(base).success, true);
  for (const change of [ { amount: "0.31" }, { amount: "-0.30" }, { amount: "0" }, { type: "Fixed_income" },
    { type: "Variable_expense" }, { type: "transfer" }, { debt_id: account }, { income_id: account },
    { splits: [] }, { splits: [{ account_id: account, amount: "0.30", state: "Unknown" }] } ]) {
    assert.equal(movementInput.safeParse({ ...base, ...change }).success, false);
  }
});
test("sources and accruals accept unlimited debts and variable amounts without scheduling metadata", () => {
  assert.equal(debtInput.safeParse({ name: "Rent", amount: "850", account_id: account }).success, true);
  assert.equal(accrualInput.safeParse({ amount: "860" }).success, true);
  for (const amount of ["0", "-1", "1.001", "10000000000"]) assert.equal(accrualInput.safeParse({ amount }).success, false);
  assert.equal(accrualInput.safeParse({ cycle: "monthly" }).success, false);
});

test("source PATCH preserves omitted account, activity, category, capital and interest fields", () => {
  for (const schema of [debtPatch, incomePatch]) {
    assert.deepEqual(schema.parse({ amount: "100" }), { amount: "100" });
    assert.deepEqual(schema.parse({ is_active: false }), { is_active: false });
    assert.equal(schema.safeParse({}).success, false);
  }
  assert.deepEqual(debtPatch.parse({ capital: null, interests: null }), { capital: null, interests: null });
});
