import { requireAllowedOrigin } from "@/middleware/allowed-origin.middleware.js";
import { makeHandler } from "@/middleware/make-handler.js";
import { runProtected } from "@/runtime/run-request.js";
import { ValidationError } from "@finex/shared/errors.js";
import { Effect } from "effect";
import express from "express";
import { getAccountById, getUserAccounts } from "./accounts.service.js";

export function createAccountRouter() {
  const router = express.Router();

  router.get(
    "/accounts",
    requireAllowedOrigin,
    makeHandler(runProtected)((req, ctx) =>
      getUserAccounts(ctx.user!.id).pipe(
        Effect.map((result) => {
          return result;
        }),
      ),
    ),
  );

  router.get(
    "/accounts/:accountId",
    requireAllowedOrigin,
    makeHandler(runProtected)((req) =>
      Effect.gen(function* () {
        // Validar entrada
        const accountId = req.params.accountId;

        if (Array.isArray(accountId)) {
          return yield* Effect.fail(
            new ValidationError({
              message: "Invalid account ID",
              issues: [{ message: "Invalid account ID", path: ["accountId"] }],
            }),
          );
        }

        // Ejecutar operación
        const account = yield* getAccountById(accountId);

        // Devolver resultado exitoso
        return account;
      }),
    ),
  );

  return router;
}

export const accountRouter = createAccountRouter();
