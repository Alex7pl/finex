import { DatabaseError } from "@/shared/errors.js";
import { Context, Effect } from "effect";

export type RefreshTokenRecord = {
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
};

export type StoredRefreshToken = RefreshTokenRecord & {
  revokedAt: Date | null;
};

export type RotationResult = "rotated" | "reused" | "missing";

export class AuthRepository extends Context.Tag("AuthRepository")<
  AuthRepository,
  {
    saveRefreshToken: (
      record: RefreshTokenRecord,
    ) => Effect.Effect<void, DatabaseError>;
    findRefreshToken: (
      tokenHash: string,
    ) => Effect.Effect<StoredRefreshToken | null, DatabaseError>;
    rotateRefreshToken: (
      oldTokenHash: string,
      replacement: RefreshTokenRecord,
    ) => Effect.Effect<RotationResult, DatabaseError>;
    revokeFamily: (familyId: string) => Effect.Effect<void, DatabaseError>;
  }
>() {}
