import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import { Effect } from "effect";
import { UnauthorizedError } from "@finex/shared/errors.js";
import { env } from "@/config/env.js";
import { CurrentUser } from "@/runtime/request-context.js";
import type { runProtected } from "@/runtime/run-request.js";
import { errorMiddleware } from "@/middleware/error.middleware.js";
import { BudgetRepository, type BudgetSummary } from "./budgets.repository.js";
import { createBudgetRouter } from "./budgets.handlers.js";
import {
  SavingsRepository,
  type SavingsRow,
} from "../savings/savings.repository.js";
import { createSavingsRouter } from "../savings/savings.handlers.js";

const id = "00000000-0000-4000-8000-000000000001";
const user = { id, email: "user@example.com" };
test("planning HTTP mutation contracts, validation, missing resources and origin protection", async () => {
  const budget: BudgetSummary = {
    id,
    user_id: id,
    name: "Food",
    monthly_limit: "50.00",
    category_id: null,
    about_type: null,
    spent: "10.00",
    pending: "2.00",
    created_at: new Date(),
    updated_at: new Date(),
  };
  let goal: SavingsRow = {
    id,
    user_id: id,
    account_id: id,
    name: "Trip",
    target_amount: "100.00",
    current_amount: "0.00",
    created_at: new Date(),
    updated_at: new Date(),
  };
  let exists = true;
  let calls = 0;
  const budgetRepository: typeof BudgetRepository.Service = {
    list: () => {
      calls++;
      return Effect.succeed(exists ? [budget] : []);
    },
    create: () => {
      calls++;
      return Effect.succeed(budget);
    },
    update: () => {
      calls++;
      return Effect.succeed(exists ? budget : null);
    },
    delete: () => {
      calls++;
      return Effect.succeed(exists);
    },
    ownsAccount: () => Effect.succeed(true),
    ownsCategory: () => Effect.succeed(true),
  };
  const savingsRepository: typeof SavingsRepository.Service = {
    list: () => {
      calls++;
      return Effect.succeed(exists ? [goal] : []);
    },
    create: () => {
      calls++;
      return Effect.succeed(goal);
    },
    update: () => {
      calls++;
      return Effect.succeed(exists ? goal : null);
    },
    delete: () => {
      calls++;
      return Effect.succeed(exists);
    },
    ownsAccount: () => Effect.succeed(true),
    adjust: (_user, _id, amount, direction) => {
      calls++;
      if (direction === "withdraw") return Effect.succeed(null);
      goal = { ...goal, current_amount: amount };
      return Effect.succeed(goal);
    },
  };
  const run = ((
    data: { user: typeof user | null },
    program: Effect.Effect<
      unknown,
      unknown,
      CurrentUser | BudgetRepository | SavingsRepository
    >,
  ) =>
    data.user
      ? program.pipe(
          Effect.provideService(CurrentUser, data.user),
          Effect.provideService(BudgetRepository, budgetRepository),
          Effect.provideService(SavingsRepository, savingsRepository),
        )
      : Effect.fail(new UnauthorizedError())) as typeof runProtected;
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.locals.requestId = "planning-test";
    res.locals.user = user;
    next();
  });
  app.use("/budgets", createBudgetRouter(run));
  app.use("/savings", createSavingsRouter(run));
  app.use(errorMiddleware);
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    const request = async (
      path: string,
      method = "GET",
      body?: unknown,
      origin = env.WEB_ORIGIN,
    ) => {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: { origin, "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return {
        status: response.status,
        body: (await response.json()) as Record<string, any>,
      };
    };
    for (const [path, body] of [
      ["/budgets", { name: "Food", monthly_limit: "50" }],
      ["/savings", { name: "Trip", account_id: id, target_amount: "100" }],
    ] as const) {
      const created = await request(path, "POST", body);
      assert.equal(created.status, 200);
      assert.equal(created.body.id, id);
      assert.equal("user_id" in created.body, false);
      const updated = await request(`${path}/${id}`, "PATCH", {
        name: "Updated",
      });
      assert.equal(updated.status, 200);
      const deleted = await request(`${path}/${id}`, "DELETE");
      assert.deepEqual(deleted, { status: 200, body: { deleted: true } });
      const before = calls;
      assert.equal(
        (await request(path, "POST", body, "https://hostile.example")).status,
        401,
      );
      assert.equal(calls, before);
    }
    const contributed = await request(`/savings/${id}/contributions`, "POST", {
      amount: "0.10",
      direction: "deposit",
    });
    assert.equal(contributed.status, 200);
    assert.equal(contributed.body.current_amount, "0.10");
    const withdrawn = await request(`/savings/${id}/contributions`, "POST", {
      amount: "100",
      direction: "withdraw",
    });
    assert.equal(withdrawn.status, 400);
    const before = calls;
    assert.equal(
      (
        await request("/budgets", "POST", {
          name: "Food",
          monthly_limit: "1e3",
        })
      ).status,
      400,
    );
    assert.equal(calls, before);
    exists = false;
    for (const path of ["/budgets", "/savings"])
      for (const method of ["GET", "PATCH", "DELETE"])
        assert.equal(
          (
            await request(
              `${path}/${id}`,
              method,
              method === "PATCH" ? { name: "Missing" } : undefined,
            )
          ).status,
          404,
        );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
