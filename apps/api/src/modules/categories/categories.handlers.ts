import { requireAllowedOrigin } from "@/middleware/allowed-origin.middleware.js";
import express from "express";
import { makeHandler } from "@/middleware/make-handler.js";
import { runProtected } from "@/runtime/run-request.js";
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./categories.service.js";

export function createCategoryRouter(run = runProtected) {
  const router = express.Router();
  router.get("/", makeHandler(run)((req) => getCategories(req.query)));
  router.post("/", requireAllowedOrigin,
    makeHandler(run)((req) => createCategory(req.body)),
  );
  router.get("/:categoryId",
    makeHandler(run)((req) => getCategoryById(req.params.categoryId)),
  );
  router.patch("/:categoryId", requireAllowedOrigin,
    makeHandler(run)((req) => updateCategory(req.params.categoryId, req.body)),
  );
  router.delete("/:categoryId", requireAllowedOrigin,
    makeHandler(run)((req) => deleteCategory(req.params.categoryId)),
  );
  return router;
}

export const categoryRouter = createCategoryRouter();
