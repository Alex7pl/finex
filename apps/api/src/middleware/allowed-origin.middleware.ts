import { env } from "@/config/env.js";
import type { RequestHandler } from "express";

const allowedOrigin = new URL(env.WEB_ORIGIN).origin;

function requestOrigin(origin: string | undefined, referer: string | undefined): string | null {
  if (origin) {
    try {
      const rawOrigin = origin.trim();
      const parsed = new URL(rawOrigin);
      if (
        parsed.origin !== rawOrigin ||
        parsed.pathname !== "/" ||
        parsed.search ||
        parsed.hash ||
        parsed.username ||
        parsed.password
      ) {
        return "invalid";
      }
      return parsed.origin;
    } catch {
      return "invalid";
    }
  }

  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return "invalid";
    }
  }

  return null;
}

export const requireAllowedOrigin: RequestHandler = (req, res, next) => {
  const origin = requestOrigin(req.get("origin"), req.get("referer"));
  if (origin === allowedOrigin) {
    next();
    return;
  }

  res.status(401).json({
    error: {
      code: "UnauthorizedError",
      requestId: res.locals.requestId,
    },
  });
};
