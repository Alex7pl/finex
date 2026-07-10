import { makeHandler } from "@/middleware/make-handler.js";
import { runPublic } from "@/runtime/run-request.js";
import express from "express";
import { login } from "./auth.service.js";

export const authRouter = express.Router();

authRouter.get(
  "/login",
  makeHandler(runPublic)((req) => login(req.body)),
);
