import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { Context, Effect, Layer } from "effect";
import { AppLayer } from "../runtime/app-layer.js";
import { CategoryRepository } from "../modules/categories/categories.repository.js";
import { BudgetRepository } from "../modules/budgets/budgets.repository.js";
import { SavingsRepository } from "../modules/savings/savings.repository.js";
import { createApp } from "../app.js";
import { createAccessToken } from "../modules/auth/auth.tokens.js";

// Exercises the real app registration, authentication and middleware stack.
// All requests stop before database access.
test("planning and category endpoints are mounted and protected in the real app", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;
    const token = createAccessToken({
      user_id: "00000000-0000-4000-8000-000000000001", email: "user@example.com",
    });
    const cookie = `accessToken=${token}`;
    const uuid = "00000000-0000-4000-8000-000000000010";
    for (const path of ["/categories", "/budgets", "/savings", "/transactions"]) {
      const response = await fetch(`${baseUrl}${path}`);
      assert.equal(response.status, 401, path);
      const body = await response.json() as { error: { code: string; requestId: string } };
      assert.equal(body.error.code, "UnauthorizedError");
      assert.ok(body.error.requestId);
    }
    for (const [method, path] of [
      ["POST", "/categories"], ["PATCH", `/categories/${uuid}`], ["DELETE", `/categories/${uuid}`],
      ["POST", "/budgets"], ["PATCH", `/budgets/${uuid}`], ["DELETE", `/budgets/${uuid}`],
      ["POST", "/savings"], ["PATCH", `/savings/${uuid}`], ["DELETE", `/savings/${uuid}`],
      ["POST", `/savings/${uuid}/contributions`], ["PATCH", `/transactions/${uuid}/category`],
    ]) {
      const response = await fetch(`${baseUrl}${path}`, {
        method, headers: { cookie, origin: "https://untrusted.example" },
      });
      assert.equal(response.status, 401, `${method} ${path}`);
      assert.equal((await response.json() as { error: { code: string } }).error.code, "UnauthorizedError");
    }
    for (const path of ["/categories/not-a-uuid", "/budgets/not-a-uuid", "/savings/not-a-uuid"]) {
      const response = await fetch(`${baseUrl}${path}`, { headers: { cookie } });
      assert.equal(response.status, 400, path);
      assert.equal((await response.json() as { error: { code: string } }).error.code, "ValidationError");
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});


test("AppLayer provides every category and planning repository", async () => {
  const context = await Effect.runPromise(Layer.build(AppLayer).pipe(Effect.scoped));
  assert.ok(Context.get(context, CategoryRepository));
  assert.ok(Context.get(context, BudgetRepository));
  assert.ok(Context.get(context, SavingsRepository));
});
