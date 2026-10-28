import type { UserProfile } from "@finex/shared/users/users.schema.js";
import { DatabaseError } from "@/shared/errors.js";
import { UserAlreadyExists } from "@finex/shared/auth/auth.errors.js";
import { Context, Effect } from "effect";

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  password: string;
}

export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    findProfileById: (id: string) => Effect.Effect<UserProfile | null, DatabaseError>;
    updateProfile: (id: string, input: { username?: string; email?: string }) =>
      Effect.Effect<UserProfile | null, UserAlreadyExists | DatabaseError>;
    findUser: (email: string) => Effect.Effect<
      UserRecord | null,
      DatabaseError
    >;
    findUserById: (id: string) => Effect.Effect<
      UserRecord | null,
      DatabaseError
    >;
    createUser: (input: {
      email: string;
      username: string;
      password: string;
    }) => Effect.Effect<UserRecord, UserAlreadyExists | DatabaseError>;
  }
>() {}
