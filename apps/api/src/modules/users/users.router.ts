import express from "express";
import { Effect } from "effect";
import { requireAllowedOrigin } from "@/middleware/allowed-origin.middleware.js";
import { makeHandler } from "@/middleware/make-handler.js";
import { runProtected } from "@/runtime/run-request.js";
import { setAccessCookie } from "../auth/auth.cookies.js";
import { createAccessToken } from "../auth/auth.tokens.js";
import { getMyProfile, updateMyProfile } from "./users.service.js";

export function createUsersRouter(run = runProtected) {
  const router = express.Router();
  router.get("/me", makeHandler(run)(() => getMyProfile()));
  router.patch("/me", requireAllowedOrigin, makeHandler(run)((req, ctx) => updateMyProfile(req.body).pipe(
    Effect.tap((profile) => Effect.sync(() => {
      setAccessCookie(ctx.response, createAccessToken({ user_id: profile.id, email: profile.email }));
    })),
  )));
  return router;
}

export const usersRouter = createUsersRouter();
