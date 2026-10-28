import type { UserProfile } from "@finex/shared/users/users.schema.js";
import { DatabaseService } from "@/db/db.service.js";
import { users } from "@/db/schema/users.js";
import { eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { DatabaseError } from "@/shared/errors.js";
import { UserRepository } from "./users.repository.js";
import { UserAlreadyExists } from "@finex/shared/auth/auth.errors.js";

function isUniqueViolation(cause: unknown): boolean {
  if (typeof cause !== "object" || cause === null) return false;
  if ("code" in cause && cause.code === "23505") return true;
  return "cause" in cause && typeof cause.cause === "object" && cause.cause !== null
    && "code" in cause.cause && cause.cause.code === "23505";
}

const publicColumns = {
  id: users.id,
  email: users.email,
  username: users.username,
  created_at: users.created_at,
  updated_at: users.updated_at,
};

function profile(row: {
  id: string; email: string; username: string; created_at: Date; updated_at: Date;
}): UserProfile {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export const UserRepositoryPostgresLayer = Layer.effect(
  UserRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return {
      findProfileById: (id: string) => Effect.tryPromise({
        try: async () => {
          const [row] = await db.select(publicColumns).from(users).where(eq(users.id, id)).limit(1);
          return row ? profile(row) : null;
        },
        catch: (cause) => new DatabaseError({ message: "Failed to read user profile", cause }),
      }),
      updateProfile: (id: string, input: { username?: string; email?: string }) => Effect.tryPromise({
        try: async () => {
          const [row] = await db.update(users).set({ ...input, updated_at: new Date() })
            .where(eq(users.id, id)).returning(publicColumns);
          return row ? profile(row) : null;
        },
        catch: (cause) => isUniqueViolation(cause)
          ? new UserAlreadyExists({ message: "Email or username already exists" })
          : new DatabaseError({ message: "Failed to update user profile", cause }),
      }),
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
