import crypto from "node:crypto";
import type { RequestHandler } from "express";
import {
  verifyAccessToken,
  type AccessTokenPayload,
} from "../modules/auth/auth.tokens.js";
import type { AuthenticatedUser } from "../runtime/request-context.js";

function getCookie(cookieHeader: string, name: string): string | null {
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split("=");

    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}

export const authMiddleware: RequestHandler = async (req, res, next) => {
  const cookieHeader = req.headers.cookie ?? "";
  const token = getCookie(cookieHeader, "accessToken");

  const payload: AccessTokenPayload | null = token
    ? verifyAccessToken(token)
    : null;

  const user: AuthenticatedUser | null = payload
    ? { id: payload.sub, email: payload.email }
    : null;

  res.locals.requestId = crypto.randomUUID();
  res.locals.user = user;

  next();
};
