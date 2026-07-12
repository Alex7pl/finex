import { DatabaseService } from "@/db/db.service.js";
import { users } from "@/db/schema/users.js";
import { eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { DatabaseError } from "@/shared/errors.js";
import { UserRepository } from "./users.repository.js";
import { UserAlreadyExists } from "@finex/shared/auth/auth.errors.js";

function isUniqueViolation(cause: unknown): boolean {
  return typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23505";
}

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

          if (!user[0]) return null;
          return {
            id: user[0].id,
            email: user[0].email,
            username: user[0].username,
            password: user[0].password,
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
              username: rows[0].username,
              password: rows[0].password,
            };
          },
          catch: (cause) => new DatabaseError({
            message: "Failed to read user for token refresh",
            cause,
          }),
        }),
      createUser: (input) =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db.insert(users).values(input).returning();
            const user = rows[0];
            if (!user) throw new Error("User insert returned no record");
            return {
              id: user.id,
              email: user.email,
              username: user.username,
              password: user.password,
            };
          },
          catch: (cause) =>
            isUniqueViolation(cause)
              ? new UserAlreadyExists({ message: "User already exists" })
              : new DatabaseError({ message: "Failed to create user", cause }),
        }),
    };
  }),
);
