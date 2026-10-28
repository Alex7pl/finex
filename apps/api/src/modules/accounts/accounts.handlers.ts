import express from "express";
import { makeHandler } from "@/middleware/make-handler.js";
import { runProtected } from "@/runtime/run-request.js";
import {
  getAccountById,
  getHistoryBalance,
  getUserAccounts,
} from "./accounts.service.js";

export function createAccountRouter(run = runProtected) {
  const router = express.Router();
  router.get(
    "/",
    makeHandler(run)(() => getUserAccounts()),
  );
  router.get(
    "/balance-history",
    makeHandler(run)((req) => getHistoryBalance(req.query)),
  );
  router.get(
    "/:accountId",
    makeHandler(run)((req) => getAccountById(req.params.accountId)),
  );
  return router;
}
export const accountRouter = createAccountRouter();
