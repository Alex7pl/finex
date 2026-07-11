import { makeHandler } from "@/middleware/make-handler.js";
import { runPublic } from "@/runtime/run-request.js";
import express from "express";
import { login } from "./auth.service.js";

export function createAuthRouter(run: typeof runPublic = runPublic) {
  const router = express.Router();

  router.get(
    "/login",
    makeHandler(run)((req) => login(req.body)),
  );

  return router;
}

export const authRouter = createAuthRouter();
