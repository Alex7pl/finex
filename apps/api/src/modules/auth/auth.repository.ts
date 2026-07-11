import { DatabaseError } from "@/shared/errors.js";
import { Context, Effect } from "effect";

export type RefreshTokenRecord = {
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
};

export class AuthRepository extends Context.Tag("AuthRepository")<
  AuthRepository,
  {
    saveRefreshToken: (
      record: RefreshTokenRecord,
    ) => Effect.Effect<void, DatabaseError>;
  }
>() {}
