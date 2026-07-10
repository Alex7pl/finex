import { DatabaseService } from "@/db/db.service.js";
import { users } from "@/db/schema/users.js";
import { eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
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
    };
  }),
);
