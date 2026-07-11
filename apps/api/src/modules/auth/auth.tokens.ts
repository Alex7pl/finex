import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "@/config/env.js";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  tokenType: "access";
};

export type RefreshTokenPayload = {
  sub: string;
  familyId: string;
  jti: string;
  tokenType: "refresh";
};

export type RefreshTokenVerification =
  | { status: "valid"; payload: RefreshTokenPayload }
  | { status: "expired"; payload: RefreshTokenPayload }
  | { status: "invalid" };

const algorithm = "HS256" as const;

export function createAccessToken(input: { user_id: string; email: string }) {
  const payload = {
    sub: input.user_id,
    email: input.email,
    tokenType: "access" as const,
  };
  return jwt.sign(payload satisfies AccessTokenPayload, env.JWT_ACCESS_SECRET, {
    algorithm,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: [algorithm],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });

    if (
      typeof payload === "object" &&
      typeof payload.sub === "string" &&
      typeof payload.email === "string" &&
      payload.tokenType === "access"
    ) {
      return payload as AccessTokenPayload;
    }

    return null;
  } catch {
    return null;
  }
}

export function createRefreshToken(input: { user_id: string; family_id: string }) {
  const payload = {
    sub: input.user_id,
    familyId: input.family_id,
    jti: crypto.randomUUID(),
    tokenType: "refresh" as const,
  };
  return jwt.sign(payload satisfies RefreshTokenPayload, env.JWT_REFRESH_SECRET, {
    algorithm,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    expiresIn: env.JWT_REFRESH_EXPIRES_IN_SECONDS,
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  const result = inspectRefreshToken(token);
  return result.status === "valid" ? result.payload : null;
}

function isRefreshPayload(payload: string | jwt.JwtPayload): payload is jwt.JwtPayload & RefreshTokenPayload {
  return (
    typeof payload === "object" &&
    typeof payload.sub === "string" &&
    typeof payload.familyId === "string" &&
    typeof payload.jti === "string" &&
    payload.tokenType === "refresh"
  );
}

export function inspectRefreshToken(token: string): RefreshTokenVerification {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      algorithms: [algorithm],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });

    return isRefreshPayload(payload)
      ? { status: "valid", payload }
      : { status: "invalid" };
  } catch (error) {
    if (!(error instanceof jwt.TokenExpiredError)) return { status: "invalid" };
    try {
      const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
        algorithms: [algorithm],
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
        ignoreExpiration: true,
      });
      return isRefreshPayload(payload)
        ? { status: "expired", payload }
        : { status: "invalid" };
    } catch {
      return { status: "invalid" };
    }
  }
}

export function hashRefreshToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
