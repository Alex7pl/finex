import jwt from "jsonwebtoken";
import crypto from "node:crypto";

export type AccessTokenPayload = {
  sub: string;
  email: string;
};
export function createAccessToken(input: { user_id: string; email: string }) {
  const secret = process.env.JWT_SECRET || "secret";
  const payload = { sub: input.user_id, email: input.email };
  return jwt.sign(payload satisfies AccessTokenPayload, secret, {
    expiresIn: "15m",
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const secret = process.env.JWT_SECRET || "secret";
    const payload = jwt.verify(token, secret);

    if (
      typeof payload === "object" &&
      typeof payload.sub === "string" &&
      typeof payload.email === "string"
    ) {
      return payload as AccessTokenPayload;
    }

    return null;
  } catch {
    return null;
  }
}

export function createRefreshToken() {
  return crypto.randomBytes(64).toString("base64url");
}

export function hashRefreshToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
