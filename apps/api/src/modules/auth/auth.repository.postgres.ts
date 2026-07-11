import { DatabaseService } from "@/db/db.service.js";
import { user_tokens } from "@/db/schema/tokens.js";
import { DatabaseError } from "@/shared/errors.js";
import { and, eq, isNull } from "drizzle-orm";
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
      findRefreshToken: (tokenHash) =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db
              .select()
              .from(user_tokens)
              .where(eq(user_tokens.token_hash, tokenHash))
              .limit(1);
            const row = rows[0];
            return row
              ? {
                  userId: row.user_id,
                  familyId: row.family_id,
                  tokenHash: row.token_hash,
                  expiresAt: row.expires_at,
                  revokedAt: row.revoked_at,
                }
              : null;
          },
          catch: (cause) =>
            new DatabaseError({
              message: "Failed to read refresh token",
              cause,
            }),
        }),
      rotateRefreshToken: (oldTokenHash, replacement) =>
        Effect.tryPromise({
          try: () =>
            db.transaction(async (tx) => {
              const rows = await tx
                .select()
                .from(user_tokens)
                .where(eq(user_tokens.token_hash, oldTokenHash))
                .limit(1)
                .for("update");
              const current = rows[0];
              if (!current) return "missing" as const;

              if (current.revoked_at || current.expires_at.getTime() <= Date.now()) {
                await tx
                  .update(user_tokens)
                  .set({ revoked_at: new Date() })
                  .where(
                    and(
                      eq(user_tokens.family_id, current.family_id),
                      isNull(user_tokens.revoked_at),
                    ),
                  );
                return "reused" as const;
              }

              await tx
                .update(user_tokens)
                .set({ revoked_at: new Date() })
                .where(
                  and(
                    eq(user_tokens.token_hash, oldTokenHash),
                    isNull(user_tokens.revoked_at),
                  ),
                );
              await tx.insert(user_tokens).values({
                user_id: replacement.userId,
                family_id: current.family_id,
                token_hash: replacement.tokenHash,
                expires_at: replacement.expiresAt,
              });
              return "rotated" as const;
            }),
          catch: (cause) =>
            new DatabaseError({
              message: "Failed to rotate refresh token",
              cause,
            }),
        }),
      revokeFamily: (familyId) =>
        Effect.tryPromise({
          try: () =>
            db
              .update(user_tokens)
              .set({ revoked_at: new Date() })
              .where(
                and(
                  eq(user_tokens.family_id, familyId),
                  isNull(user_tokens.revoked_at),
                ),
              ),
          catch: (cause) =>
            new DatabaseError({
              message: "Failed to revoke refresh-token family",
              cause,
            }),
        }).pipe(Effect.asVoid),
    };
  }),
);
