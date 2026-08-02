import { requireAllowedOrigin } from "@/middleware/allowed-origin.middleware.js";
import { makeHandler } from "@/middleware/make-handler.js";
import { runPublic } from "@/runtime/run-request.js";
import { UnauthorizedError } from "@finex/shared/errors.js";
import { Effect } from "effect";
import express from "express";
import { clearAuthCookies, setAuthCookies } from "./auth.cookies.js";
import { login, refresh, register } from "./auth.service.js";

function getCookie(cookieHeader: string, name: string): string | null {
  for (const cookie of cookieHeader.split(";")) {
    const [key, ...value] = cookie.trim().split("=");
    if (key === name) {
      try {
        return decodeURIComponent(value.join("="));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function createAuthRouter(run: typeof runPublic = runPublic) {
  const router = express.Router();

  router.post(
    "/login",
    requireAllowedOrigin,
    makeHandler(run)((req, ctx) =>
      login(req.body).pipe(
        Effect.map((result) => {
          setAuthCookies(ctx.response, result);
          return result.body;
        }),
      ),
    ),
  );

  router.post(
    "/register",
    requireAllowedOrigin,
    makeHandler(run)((req, ctx) =>
      register(req.body).pipe(
        Effect.map((result) => {
          setAuthCookies(ctx.response, result);
          return result.body;
        }),
      ),
    ),
  );

  router.post(
    "/refresh",
    requireAllowedOrigin,
    makeHandler(run)((req, ctx) => {
      const token = getCookie(req.headers.cookie ?? "", "refreshToken");
      if (!token) {
        clearAuthCookies(ctx.response);
        return Effect.fail(new UnauthorizedError());
      }
      return refresh(token).pipe(
        Effect.map((result) => {
          setAuthCookies(ctx.response, result);
          return result.body;
        }),
        Effect.tapError((error) =>
          error._tag === "UnauthorizedError"
            ? Effect.sync(() => clearAuthCookies(ctx.response))
            : Effect.void,
        ),
      );
    }),
  );

  router.get(
    "/verifyLogin",
    requireAllowedOrigin,
    makeHandler(run)((req, ctx) => {
      if (ctx.user) {
        return Effect.succeed(true);
      }

      const refreshToken = getCookie(req.headers.cookie ?? "", "refreshToken");

      if (!refreshToken) {
        clearAuthCookies(ctx.response);
        return Effect.succeed(false);
      }

      return refresh(refreshToken).pipe(
        Effect.map((result) => {
          setAuthCookies(ctx.response, result);
          return true;
        }),
        Effect.catchTag("UnauthorizedError", () => {
          clearAuthCookies(ctx.response);
          return Effect.succeed(false);
        }),
      );
    }),
  );

  return router;
}

export const authRouter = createAuthRouter();
