import assert from "node:assert/strict";
import test from "node:test";
import type { AddressInfo } from "node:net";
import express from "express";
import { CategoryDto } from "@finex/shared/categories/categories.schema.js";
import { TransactionDto } from "@finex/shared/transactions/transactions.schema.js";
import { Effect, Schema } from "effect";
import { UnauthorizedError } from "@finex/shared/errors.js";
import { env } from "@/config/env.js";
import { CurrentUser } from "@/runtime/request-context.js";
import type { runProtected } from "@/runtime/run-request.js";
import { errorMiddleware } from "@/middleware/error.middleware.js";
import { CategoryRepository } from "./categories.repository.js";
import { createCategoryRouter } from "./categories.handlers.js";
import { TransactionRepository } from "../transactions/transactions.repository.js";
import { createTransactionRouter } from "../transactions/transactions.handlers.js";

const user = { id: "00000000-0000-4000-8000-000000000001", email: "user@test.dev" };
const category = {
  id: user.id, name: "Food", kind: "expense" as const, emoji: null, color: null,
  created_at: "2026-10-19T00:00:00Z", updated_at: "2026-10-19T00:00:00Z",
};

test("category and transaction category HTTP contracts validate auth, mutations and response DTOs", async () => {
  let calls = 0;
  const categories: typeof CategoryRepository.Service = {
    list: (owner) => { assert.equal(owner, user.id); calls++; return Effect.succeed([category]); },
    findById: (owner) => { assert.equal(owner, user.id); calls++; return Effect.succeed(category); },
    create: (owner, input) => { assert.equal(owner, user.id); calls++; return Effect.succeed({ ...category, ...input }); },
    update: (_owner, _id, input) => { calls++; return Effect.succeed({ ...category, ...input }); },
    remove: () => { calls++; return Effect.succeed(true); },
  };
  const transaction = {
    id: user.id, type: "Variable_expense" as const, kind: "expense" as const,
    amount: "10.00", description: "Lunch", category_id: null, category: null,
    created_at: category.created_at, updated_at: category.updated_at,
    cycle: null, is_active: null, state: "Completed" as const,
    is_internal_transfer: false, from_account: null, splits: [],
  };
  const transactions: typeof TransactionRepository.Service = {
    list: () => Effect.die("unused"),
    findById: () => Effect.succeed(transaction),
    setCategory: (_owner, _id, categoryId) => Effect.succeed({
      ...transaction, category_id: categoryId, category: categoryId ? category : null,
    }),
  };
  const run = ((data: { user: typeof user | null }, program: Effect.Effect<unknown, unknown,
    CurrentUser | CategoryRepository | TransactionRepository>) => data.user
      ? program.pipe(
        Effect.provideService(CurrentUser, data.user),
        Effect.provideService(CategoryRepository, categories),
        Effect.provideService(TransactionRepository, transactions),
      ) : Effect.fail(new UnauthorizedError())) as typeof runProtected;
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.locals.requestId = "categories-test";
    res.locals.user = req.get("x-test-unauthenticated") ? null : user;
    next();
  });
  app.use("/categories", createCategoryRouter(run));
  app.use("/transactions", createTransactionRouter(run));
  app.use(errorMiddleware);
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    const request = async (path: string, method = "GET", body?: unknown, unauthenticated = false) => {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: {
          origin: env.WEB_ORIGIN, "content-type": "application/json",
          ...(unauthenticated ? { "x-test-unauthenticated": "true" } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    };
    assert.equal((await request("/categories", "POST", { name: "Food", kind: "expense" }, true)).status, 401);
    assert.equal(calls, 0);
    assert.equal((await request("/categories", "POST", { name: " ", kind: "expense" })).status, 400);
    assert.equal(calls, 0);
    assert.deepEqual((await request("/categories")).body, [category]);
    const created = await request("/categories", "POST", { name: "  Meals  ", kind: "expense" });
    assert.equal(created.status, 200);
    assert.equal(Schema.decodeUnknownSync(CategoryDto)(created.body).name, "Meals");
    assert.equal((await request(`/categories/${user.id}`, "PATCH", { kind: "income" })).status, 400);
    assert.equal(Schema.decodeUnknownSync(CategoryDto)((await request(`/categories/${user.id}`, "PATCH", { name: "Meals" })).body).name, "Meals");
    assert.deepEqual((await request(`/categories/${user.id}`, "DELETE")).body, { deleted: true });
    const assigned = await request(`/transactions/${user.id}/category`, "PATCH", { category_id: user.id });
    assert.equal(assigned.status, 200);
    assert.deepEqual(Schema.decodeUnknownSync(TransactionDto)(assigned.body).category, category);
    const cleared = await request(`/transactions/${user.id}/category`, "PATCH", { category_id: null });
    assert.equal(cleared.status, 200);
    assert.equal(Schema.decodeUnknownSync(TransactionDto)(cleared.body).category, null);
    assert.equal((await request(`/transactions/${user.id}/category`, "PATCH", {})).status, 400);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
