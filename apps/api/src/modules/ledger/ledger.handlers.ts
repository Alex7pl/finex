import express from "express";
import { requireAllowedOrigin } from "@/middleware/allowed-origin.middleware.js";
import { makeHandler } from "@/middleware/make-handler.js";
import { runProtected } from "@/runtime/run-request.js";
import type { SourceKind } from "@finex/shared/ledger/ledger.schema.js";
import { accrueSource, deleteSource, listSources, saveSource } from "./ledger.service.js";
export function createSourceRouter(kind: SourceKind, run = runProtected) {
  const router = express.Router();
  router.get("/", makeHandler(run)(() => listSources(kind)));
  router.get("/:id", makeHandler(run)((req) => listSources(kind, req.params.id)));
  router.post("/", requireAllowedOrigin, makeHandler(run)((req) => saveSource(kind, req.body)));
  router.patch("/:id", requireAllowedOrigin, makeHandler(run)((req) => saveSource(kind, req.body, req.params.id)));
  router.delete("/:id", requireAllowedOrigin, makeHandler(run)((req) => deleteSource(kind, req.params.id)));
  router.post("/:id/accrue", requireAllowedOrigin, makeHandler(run)((req) => accrueSource(kind, req.params.id, req.body ?? {})));
  return router;
}
