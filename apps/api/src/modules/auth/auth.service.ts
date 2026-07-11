import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { DatabaseError } from "@/shared/errors.js";
import { UserNotFound } from "@finex/shared/auth/auth.errors.js";
import { LoginInput, LoginResponse } from "@finex/shared/auth/auth.schema.js";
import { Effect } from "effect";
import { UserRepository } from "../users/users.repository.js";
import { AuthRepository } from "./auth.repository.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from "./auth.tokens.js";

function createTokens(
  email: string,
  id: string,
): {
  accessToken: string;
  refreshToken: string;
  familyId: string;
  refreshExpiresAt: Date;
} {
  const familyId = crypto.randomUUID();
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

export function login(
  input: LoginInput,
): Effect.Effect<
  LoginResponse,
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

    return new LoginResponse({
      id: user.id,
      email: user.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  });
}
