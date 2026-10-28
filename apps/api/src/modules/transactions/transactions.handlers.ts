import { requireAllowedOrigin } from "@/middleware/allowed-origin.middleware.js";
import express from "express";
import { makeHandler } from "@/middleware/make-handler.js";
import { runProtected } from "@/runtime/run-request.js";
import { getTransactionById, getTransactions, setTransactionCategory } from "./transactions.service.js";

export function createTransactionRouter(run = runProtected) {
  const router = express.Router();
  router.get("/", makeHandler(run)((req) => getTransactions(req.query)));
  router.patch("/:transactionId/category", requireAllowedOrigin, makeHandler(run)((req) => setTransactionCategory(req.params.transactionId, req.body)));
  router.get("/:transactionId", makeHandler(run)((req) => getTransactionById(req.params.transactionId)));
  return router;
}

export const transactionRouter = createTransactionRouter();
