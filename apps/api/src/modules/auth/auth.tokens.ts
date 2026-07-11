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
  tokenType: "refresh";
};

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
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      algorithms: [algorithm],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });

    if (
      typeof payload === "object" &&
      typeof payload.sub === "string" &&
      typeof payload.familyId === "string" &&
      payload.tokenType === "refresh"
    ) {
      return payload as RefreshTokenPayload;
    }

    return null;
  } catch {
    return null;
  }
}

export function hashRefreshToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
