import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { DatabaseError } from "@/shared/errors.js";
import { UserAlreadyExists, UserNotFound } from "@finex/shared/auth/auth.errors.js";
import { LoginInput, LoginResponse, RefreshResponse, RegisterInput, RegisterResponse } from "@finex/shared/auth/auth.schema.js";
import { UnauthorizedError, ValidationError } from "@finex/shared/errors.js";
import { Effect } from "effect";
import { UserRepository } from "../users/users.repository.js";
import { hashPassword, verifyPassword } from "./auth.password.js";
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

    if (!(yield* Effect.promise(() => verifyPassword(input.password, user.password)))) {
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

export function register(
  input: RegisterInput,
): Effect.Effect<
  AuthResult<RegisterResponse>,
  ValidationError | UserAlreadyExists | DatabaseError,
  UserRepository | AuthRepository
> {
  return Effect.gen(function* () {
    const email = input.email?.trim().toLowerCase();
    const username = input.username?.trim();
    const issues: Array<{ path: string[]; message: string }> = [];
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issues.push({ path: ["email"], message: "Invalid email" });
    if (!username || username.length < 2 || username.length > 40) issues.push({ path: ["username"], message: "Invalid username" });
    if (!input.password || input.password.length < 8 || !/[A-Z]/.test(input.password) || !/\d/.test(input.password)) issues.push({ path: ["password"], message: "Weak password" });
    if (issues.length) return yield* Effect.fail(new ValidationError({ message: "Invalid registration", issues }));

    const userRepo = yield* UserRepository;
    const authRepo = yield* AuthRepository;
    const password = yield* Effect.promise(() => hashPassword(input.password));
    const user = yield* userRepo.createUser({ email, username, password });
    const tokens = createTokens(user.email, user.id);
    yield* authRepo.saveRefreshToken({
      userId: user.id,
      familyId: tokens.familyId,
      tokenHash: hashRefreshToken(tokens.refreshToken),
      expiresAt: tokens.refreshExpiresAt,
    });

    return {
      body: new RegisterResponse({ id: user.id, email: user.email, username: user.username }),
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
