import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { DatabaseError } from "@/shared/errors.js";
import { UserNotFound } from "@finex/shared/auth/auth.errors.js";
import { LoginInput, LoginResponse, RefreshResponse } from "@finex/shared/auth/auth.schema.js";
import { UnauthorizedError } from "@finex/shared/errors.js";
import { Effect } from "effect";
import { UserRepository } from "../users/users.repository.js";
import { AuthRepository } from "./auth.repository.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  inspectRefreshToken,
} from "./auth.tokens.js";

function createTokens(
  email: string,
  id: string,
  existingFamilyId?: string,
): {
  accessToken: string;
  refreshToken: string;
  familyId: string;
  refreshExpiresAt: Date;
} {
  const familyId = existingFamilyId ?? crypto.randomUUID();
  const accessToken = createAccessToken({ user_id: id, email });
  const refreshToken = createRefreshToken({ user_id: id, family_id: familyId });
  const payload = jwt.decode(refreshToken);

  if (!payload || typeof payload === "string" || typeof payload.exp !== "number") {
    throw new Error("Signed refresh token is missing an expiry");
  }

  return {
    accessToken,
    refreshToken,
    familyId,
    refreshExpiresAt: new Date(payload.exp * 1000),
  };
}

export type AuthResult<T> = {
  body: T;
  accessToken: string;
  refreshToken: string;
};

export function login(
  input: LoginInput,
): Effect.Effect<
  AuthResult<LoginResponse>,
  UserNotFound | DatabaseError,
  UserRepository | AuthRepository
> {
  return Effect.gen(function* () {
    const userRepo = yield* UserRepository;
    const authRepo = yield* AuthRepository;

    const user = yield* userRepo
      .findUser(input.email)
      .pipe(
        Effect.catchAll(() =>
          Effect.fail(new UserNotFound({ message: "User not found" })),
        ),
      );

    if (!user) {
      return yield* Effect.fail(
        new UserNotFound({ message: "User not found" }),
      );
    }

    if (user.passsword !== input.password) {
      return yield* Effect.fail(
        new UserNotFound({ message: "User not found" }),
      );
    }

    const tokens = createTokens(user.email, user.id);

    yield* authRepo.saveRefreshToken({
      userId: user.id,
      familyId: tokens.familyId,
      tokenHash: hashRefreshToken(tokens.refreshToken),
      expiresAt: tokens.refreshExpiresAt,
    });

    return {
      body: new LoginResponse({ id: user.id, email: user.email }),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  });
}

export function refresh(
  rawRefreshToken: string,
): Effect.Effect<
  AuthResult<RefreshResponse>,
  UnauthorizedError | DatabaseError,
  UserRepository | AuthRepository
> {
  return Effect.gen(function* () {
    const verification = inspectRefreshToken(rawRefreshToken);
    if (verification.status === "invalid") {
      return yield* Effect.fail(new UnauthorizedError());
    }

    const authRepo = yield* AuthRepository;
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const stored = yield* authRepo.findRefreshToken(tokenHash);
    if (!stored) return yield* Effect.fail(new UnauthorizedError());

    if (verification.status === "expired") {
      yield* authRepo.revokeFamily(stored.familyId);
      return yield* Effect.fail(new UnauthorizedError());
    }

    const userRepo = yield* UserRepository;

    if (
      stored.revokedAt ||
      stored.expiresAt.getTime() <= Date.now() ||
      verification.payload.sub !== stored.userId ||
      verification.payload.familyId !== stored.familyId
    ) {
      yield* authRepo.revokeFamily(stored.familyId);
      return yield* Effect.fail(new UnauthorizedError());
    }

    const user = yield* userRepo.findUserById(stored.userId);
    if (!user) {
      yield* authRepo.revokeFamily(stored.familyId);
      return yield* Effect.fail(new UnauthorizedError());
    }

    const tokens = createTokens(user.email, user.id, stored.familyId);
    const rotation = yield* authRepo.rotateRefreshToken(tokenHash, {
      userId: user.id,
      familyId: stored.familyId,
      tokenHash: hashRefreshToken(tokens.refreshToken),
      expiresAt: tokens.refreshExpiresAt,
    });

    if (rotation !== "rotated") {
      if (rotation === "reused") yield* authRepo.revokeFamily(stored.familyId);
      return yield* Effect.fail(new UnauthorizedError());
    }

    return {
      body: new RefreshResponse({ success: true }),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  });
}
