import { DatabaseService } from "@/db/db.service.js";
import { user_tokens } from "@/db/schema/tokens.js";
import { DatabaseError } from "@/shared/errors.js";
import { Effect, Layer } from "effect";
import { AuthRepository } from "./auth.repository.js";

export const AuthRepositoryPostgresLayer = Layer.effect(
  AuthRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return {
      saveRefreshToken: (record) =>
        Effect.tryPromise({
          try: () =>
            db.insert(user_tokens).values({
              user_id: record.userId,
              family_id: record.familyId,
              token_hash: record.tokenHash,
              expires_at: record.expiresAt,
            }),
          catch: (cause) =>
            new DatabaseError({
              message: "Failed to persist refresh token",
              cause,
            }),
        }).pipe(Effect.asVoid),
    };
  }),
);
