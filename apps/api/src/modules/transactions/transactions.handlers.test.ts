import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import { Effect } from "effect";
import { UnauthorizedError } from "@finex/shared/errors.js";
import { DatabaseError } from "@/shared/errors.js";
import { errorMiddleware } from "@/middleware/error.middleware.js";
import { CurrentUser } from "@/runtime/request-context.js";
import type { runProtected } from "@/runtime/run-request.js";
import { createTransactionRouter } from "./transactions.handlers.js";
import { TransactionRepository } from "./transactions.repository.js";

const user = { id: "00000000-0000-4000-8000-000000000001", email: "user@test.dev" };

async function request(path: string, authenticated = true, failed = false) {
  let calls = 0;
  const repository: typeof TransactionRepository.Service = {
    list: (_userId, filters) => {
      calls++;
      return failed ? Effect.fail(new DatabaseError({ message: "private database error" })) :
        Effect.succeed({ items: [], total: 0, page: filters.page, limit: filters.limit, has_more: false });
    },
    findById: () => { calls++; return Effect.succeed(null); },
  };
  const run = ((data: { user: typeof user | null }, program: Effect.Effect<unknown, unknown, CurrentUser | TransactionRepository>) =>
    data.user ? program.pipe(Effect.provideService(CurrentUser, data.user), Effect.provideService(TransactionRepository, repository)) :
      Effect.fail(new UnauthorizedError())) as typeof runProtected;
  const app = express();
  app.use((_req, res, next) => {
    res.locals.requestId = "transactions-test";
    res.locals.user = authenticated ? user : null;
    next();
  });
  app.use("/transactions", createTransactionRouter(run));
  app.use(errorMiddleware);
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    const response = await new Promise<{ status: number; body: unknown }>((resolve, reject) => {
      http.get({ host: "127.0.0.1", port, path }, (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on("data", (chunk) => chunks.push(chunk));
        incoming.on("end", () => resolve({ status: incoming.statusCode!, body: JSON.parse(Buffer.concat(chunks).toString()) }));
      }).on("error", reject);
    });
    return { ...response, calls };
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("transaction endpoints require authentication before validation or database access", async () => {
  for (const path of ["/transactions", "/transactions/bad-id"]) {
    const response = await request(path, false);
    assert.equal(response.status, 401);
    assert.equal(response.calls, 0);
  }
});

test("transaction HTTP contracts: pagination, validation, 404 and safe database error", async () => {
  const response = await request("/transactions?page=2&limit=10");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { items: [], total: 0, page: 2, limit: 10, has_more: false });
  for (const path of ["/transactions?limit=101", "/transactions/bad-id"]) {
    const invalid = await request(path);
    assert.equal(invalid.status, 400);
    assert.equal(invalid.calls, 0);
    assert.deepEqual(invalid.body, { error: { code: "ValidationError", requestId: "transactions-test" } });
  }
  const missing = await request(`/transactions/${user.id}`);
  assert.equal(missing.status, 404);
  assert.deepEqual(missing.body, { error: { code: "TransactionNotFound", requestId: "transactions-test" } });
  const failure = await request("/transactions", true, true);
  assert.equal(failure.status, 500);
  assert.deepEqual(failure.body, { error: { code: "DatabaseError", requestId: "transactions-test" } });
});
