import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import { Effect, Schema } from "effect";
import { SourceDto, SourceNotFound } from "@finex/shared/ledger/ledger.schema.js";
import { UnauthorizedError } from "@finex/shared/errors.js";
import { CurrentUser } from "@/runtime/request-context.js";
import type { runProtected } from "@/runtime/run-request.js";
import { errorMiddleware } from "@/middleware/error.middleware.js";
import { TransactionRepository } from "../transactions/transactions.repository.js";
import { createTransactionRouter } from "../transactions/transactions.handlers.js";
import { LedgerRepository } from "./ledger.repository.js";
import { createSourceRouter } from "./ledger.handlers.js";

const uuid = "00000000-0000-4000-8000-000000000001";
const user = { id: uuid, email: "user@test.dev" };

test("source and movement HTTP writes preserve strict inputs, ownership context and response contracts", async () => {
  const calls: { method: string; data: unknown }[] = [];
  const source = { id: uuid, kind: "debt" as const, name: "Rent", amount: "850.00", account_id: uuid,
    category_id: null, is_active: false, capital: null, interests: null, time_limit: null,
    accrued_amount: "0.00", settled_amount: "0.00", pending_amount: "0.00", total_amount: null, remaining_amount: null,
    transaction_count: 0, created_at: "2026-10-28T00:00:00Z", updated_at: "2026-10-28T00:00:00Z" };
  const movement = { id: uuid, amount: "850.00", debt_id: uuid, income_id: null };
  const repo: typeof LedgerRepository.Service = {
    list: (owner, kind) => { assert.equal(owner, uuid); return Effect.succeed([{ ...source, kind }]); },
    save: (owner, kind, data, id) => { assert.equal(owner, uuid); calls.push({ method: id ? "patch" : kind, data }); return Effect.succeed(uuid); },
    delete: () => Effect.fail(new SourceNotFound({ id: uuid })),
    accrue: (owner, kind, id, data) => { assert.equal(owner, uuid); assert.equal(id, uuid); calls.push({ method: `accrue-${kind}`, data }); return Effect.succeed(uuid); },
    createMovement: (owner, data) => { assert.equal(owner, uuid); calls.push({ method: "movement", data }); return Effect.succeed(uuid); },
    settle: (owner, id, splits) => { assert.equal(owner, uuid); assert.equal(id, uuid); calls.push({ method: "settle", data: splits }); return Effect.void; },
  };
  const transactions = { findById: () => Effect.succeed(movement) } as unknown as typeof TransactionRepository.Service;
  const run = ((data: { user: typeof user | null }, program: Effect.Effect<unknown, unknown, CurrentUser | LedgerRepository | TransactionRepository>) =>
    data.user ? program.pipe(Effect.provideService(CurrentUser, data.user), Effect.provideService(LedgerRepository, repo), Effect.provideService(TransactionRepository, transactions))
      : Effect.fail(new UnauthorizedError())) as typeof runProtected;
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => { res.locals.requestId = "ledger-test"; res.locals.user = user; next(); });
  app.use("/debts", createSourceRouter("debt", run));
  app.use("/incomes", createSourceRouter("income", run));
  app.use("/transactions", createTransactionRouter(run));
  app.use(errorMiddleware);
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    const request = async (method: string, path: string, body: unknown) => {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, { method,
        headers: { origin: "http://localhost:5173", "content-type": "application/json" }, body: JSON.stringify(body) });
      return { status: response.status, body: await response.json() as Record<string, unknown> };
    };
    const created = await request("POST", "/debts", { name: "Rent", amount: "850", account_id: uuid });
    assert.equal(created.status, 200);
    Schema.decodeUnknownSync(SourceDto)(created.body);
    assert.equal(calls.at(-1)?.method, "debt");
    assert.equal((calls.at(-1)?.data as { is_active: boolean }).is_active, true);
    assert.equal((await request("PATCH", `/debts/${uuid}`, { amount: "900" })).status, 200);
    assert.deepEqual(calls.at(-1)?.data, { amount: "900" });
    assert.equal((await request("POST", `/incomes/${uuid}/accrue`, { amount: "1000" })).status, 200);
    assert.equal(calls.at(-1)?.method, "accrue-income");
    const splits = [{ account_id: uuid, amount: "850", state: "Completed" }];
    assert.equal((await request("POST", "/transactions", { type: "expense", amount: "850", splits })).status, 200);
    assert.equal((await request("PUT", `/transactions/${uuid}/splits`, { splits })).status, 200);
    assert.equal(calls.at(-1)?.method, "settle");
    const before = calls.length;
    for (const [method, path, body] of [
      ["POST", "/transactions", { type: "expense", amount: "849", splits }],
      ["POST", "/transactions", { type: "Fixed_income", amount: "850", splits }],
      ["POST", "/incomes", { name: "Salary", amount: "1", account_id: uuid, capital: "1" }],
      ["PATCH", `/debts/${uuid}`, {}], ["POST", "/debts/not-a-uuid/accrue", {}],
    ] as const) assert.equal((await request(method, path, body)).status, 400);
    assert.equal(calls.length, before);
    const missing = await request("DELETE", `/debts/${uuid}`, {});
    assert.equal(missing.status, 404);
    assert.deepEqual(missing.body, { error: { code: "SourceNotFound", requestId: "ledger-test" } });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
