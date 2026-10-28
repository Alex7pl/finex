import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { CategoryNotFound, CategoryInUse } from "@finex/shared/categories/categories.errors.js";
import { BudgetNotFound } from "@finex/shared/budgets/budgets.errors.js";
import { SavingsNotFound } from "@finex/shared/savings/savings.errors.js";
import { UserNotFound } from "@finex/shared/auth/auth.errors.js";
import { UnauthorizedError, ValidationError } from "@finex/shared/errors.js";
import express from "express";
import { Effect } from "effect";
import { authMiddleware } from "./auth.middleware.js";
import { errorMiddleware } from "./error.middleware.js";
import { makeHandler } from "./make-handler.js";
import type { runPublic } from "../runtime/run-request.js";

const runWithoutAppLayer = ((_context: unknown, program: unknown) =>
  program) as typeof runPublic;

async function withTestServer(run: (baseUrl: string) => Promise<void>) {
  const app = express();
  app.use(authMiddleware);
  app.use((_req, res, next) => {
    res.setHeader("x-request-id", res.locals.requestId);
    next();
  });

  const expectedErrors = [
    new ValidationError({ message: "invalid", issues: [] }),
    new UserNotFound({ message: "private user detail" }),
    new UnauthorizedError(),
    new CategoryNotFound({ id: "private-category-id" }),
    new CategoryInUse({ id: "private-category-id" }),
    new BudgetNotFound({ id: "private-budget-id" }),
    new SavingsNotFound({ id: "private-goal-id" }),
  ];
  for (const error of expectedErrors) {
    app.get(
      `/${error._tag}`,
      makeHandler(runWithoutAppLayer)(() => Effect.fail(error)),
    );
  }
  app.get("/thrown", async () => {
    throw new Error("database credentials");
  });
  app.get("/next", (_req, _res, next) => {
    next(new Error("internal topology"));
  });
  app.use(errorMiddleware);

  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const { port } = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test("serves stable expected and unexpected error envelopes over HTTP", async () => {
  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    await withTestServer(async (baseUrl) => {
      for (const [path, status, code] of [
        ["/ValidationError", 400, "ValidationError"],
        ["/UserNotFound", 404, "UserNotFound"],
        ["/UnauthorizedError", 401, "UnauthorizedError"],
        ["/CategoryNotFound", 404, "CategoryNotFound"],
        ["/CategoryInUse", 409, "CategoryInUse"],
        ["/BudgetNotFound", 404, "BudgetNotFound"],
        ["/SavingsNotFound", 404, "SavingsNotFound"],
      ] as const) {
        const response = await fetch(`${baseUrl}${path}`);
        assert.equal(response.status, status);
        assert.deepEqual(await response.json(), {
          error: { code, requestId: response.headers.get("x-request-id") },
        });
      }

      for (const path of ["/thrown", "/next"]) {
        const response = await fetch(`${baseUrl}${path}`);
        const body = await response.json();
        assert.equal(response.status, 500);
        assert.deepEqual(body, {
          error: {
            code: "InternalServerError",
            requestId: response.headers.get("x-request-id"),
          },
        });
        assert.doesNotMatch(
          JSON.stringify(body),
          /database credentials|internal topology/,
        );
      }
    });
  } finally {
    console.error = originalConsoleError;
  }
});
