import express from "express";
import { requireAllowedOrigin } from "@/middleware/allowed-origin.middleware.js";
import { makeHandler } from "@/middleware/make-handler.js";
import { runProtected } from "@/runtime/run-request.js";
import {
  createBudget,
  listBudgets,
  updateBudget,
  deleteBudget,
} from "./budgets.service.js";
export function createBudgetRouter(run = runProtected) {
  const router = express.Router();
  router.get(
    "/",
    makeHandler(run)((req) => listBudgets(req.query)),
  );
  router.get(
    "/:id",
    makeHandler(run)((req) => listBudgets(req.query, req.params.id)),
  );
  router.post(
    "/",
    requireAllowedOrigin,
    makeHandler(run)((req) => createBudget(req.body)),
  );
  router.patch(
    "/:id",
    requireAllowedOrigin,
    makeHandler(run)((req) => updateBudget(req.params.id, req.body)),
  );
  router.delete(
    "/:id",
    requireAllowedOrigin,
    makeHandler(run)((req) => deleteBudget(req.params.id)),
  );

  return router;
}
export const budgetRouter = createBudgetRouter();
