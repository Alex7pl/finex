import express from "express";
import { requireAllowedOrigin } from "@/middleware/allowed-origin.middleware.js";
import { makeHandler } from "@/middleware/make-handler.js";
import { runProtected } from "@/runtime/run-request.js";
import {
  createSavings,
  listSavings,
  updateSavings,
  deleteSavings,
  contributeSavings,
} from "./savings.service.js";
export function createSavingsRouter(run = runProtected) {
  const router = express.Router();
  router.get(
    "/",
    makeHandler(run)((req) => listSavings(req.query)),
  );
  router.get(
    "/:id",
    makeHandler(run)((req) => listSavings(req.query, req.params.id)),
  );
  router.post(
    "/",
    requireAllowedOrigin,
    makeHandler(run)((req) => createSavings(req.body)),
  );
  router.patch(
    "/:id",
    requireAllowedOrigin,
    makeHandler(run)((req) => updateSavings(req.params.id, req.body)),
  );
  router.delete(
    "/:id",
    requireAllowedOrigin,
    makeHandler(run)((req) => deleteSavings(req.params.id)),
  );
  router.post(
    "/:id/contributions",
    requireAllowedOrigin,
    makeHandler(run)((req) => contributeSavings(req.params.id, req.body)),
  );
  return router;
}
export const savingsRouter = createSavingsRouter();
