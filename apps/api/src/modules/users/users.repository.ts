import { DatabaseError } from "@/shared/errors.js";
import { Context, Effect } from "effect";

export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    findUser: (email: string) => Effect.Effect<
      {
        id: string;
        email: string;
        passsword: string;
      } | null,
      DatabaseError
    >;
  }
>() {}
