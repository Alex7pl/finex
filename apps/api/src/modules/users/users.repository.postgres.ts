import { DatabaseService } from "@/db/db.service.js";
import { users } from "@/db/schema/users.js";
import { eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { DatabaseError } from "@/shared/errors.js";
import { UserRepository } from "./users.repository.js";

export const UserRepositoryPostgresLayer = Layer.effect(
  UserRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return {
      findUser: (email: string) =>
        Effect.gen(function* () {
          const user = yield* Effect.promise(() =>
            db.select().from(users).where(eq(users.email, email)).limit(1),
          );

          if (!user) return null;
          return {
            id: user[0].id,
            email: user[0].email,
            passsword: user[0].password,
          };
        }),
      findUserById: (id: string) =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
            if (!rows[0]) return null;
            return {
              id: rows[0].id,
              email: rows[0].email,
              passsword: rows[0].password,
            };
          },
          catch: (cause) => new DatabaseError({
            message: "Failed to read user for token refresh",
            cause,
          }),
        }),
    };
  }),
);
