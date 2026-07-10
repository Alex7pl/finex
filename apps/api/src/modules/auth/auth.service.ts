import { AuthenticatedUser } from "@/runtime/request-context.js";
import { UserNotFound } from "@finex/shared/auth/auth.errors.js";
import { LoginInput } from "@finex/shared/auth/auth.schema.js";
import { Effect } from "effect";
import { UserRepository } from "../users/users.repository.js";

export function login(
  input: LoginInput,
): Effect.Effect<AuthenticatedUser, UserNotFound, UserRepository> {
  return Effect.gen(function* () {
    const userRepo = yield* UserRepository;

    const user = yield* userRepo.findUser(input.email).pipe(
      Effect.catchAll(() =>
        Effect.fail(new UserNotFound({ message: "User not found" })),
      ),
    );

    if (!user) {
      return yield* Effect.fail(
        new UserNotFound({ message: "User not found" }),
      );
    }

    if (user.passsword !== input.password) {
      return yield* Effect.fail(
        new UserNotFound({ message: "User not found" }),
      );
    }

    return {
      id: user.id,
      email: user.email,
    };
  });
}
