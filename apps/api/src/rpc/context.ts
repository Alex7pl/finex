import crypto from "node:crypto";
import { IncomingMessage } from "node:http";
import {
  AccessTokenPayload,
  verifyAccessToken,
} from "../modules/auth/auth.tokens.js";
import type { AuthenticatedUser } from "../runtime/request-context.js";

export type RpcContext = {
  requestId: string;
  user: AuthenticatedUser | null;
};

export async function createRpcContext(
  req: IncomingMessage,
): Promise<RpcContext> {
  const cookieHeaders = req.headers.cookie ?? "";

  const payload = getCookie(cookieHeaders, "accessToken");

  const accessToken: AccessTokenPayload | null = payload
    ? verifyAccessToken(payload)
    : null;

  const user: AuthenticatedUser | null = accessToken
    ? {
        id: accessToken.sub,
        email: accessToken.email,
      }
    : null;

  return {
    requestId: crypto.randomUUID(),
    user: user,
  };
}

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
