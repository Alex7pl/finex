import { UserNotFound } from "@finex/shared/auth/auth.errors.js";
import { UnauthorizedError, ValidationError } from "@finex/shared/errors.js";
import { UpdateUserProfileInput } from "@finex/shared/users/users.schema.js";
import { CurrentUser } from "@/runtime/request-context.js";
import { Effect, Schema } from "effect";
import { verifyPassword } from "../auth/auth.password.js";
import { UserRepository } from "./users.repository.js";

export function getMyProfile() {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const repository = yield* UserRepository;
    const profile = yield* repository.findProfileById(user.id);
    if (!profile) return yield* Effect.fail(new UserNotFound({ message: "User not found" }));
    return profile;
  });
}

export function updateMyProfile(raw: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const input = yield* Schema.decodeUnknown(UpdateUserProfileInput)(raw, { onExcessProperty: "error" }).pipe(
      Effect.mapError(() => new ValidationError({ message: "Invalid profile input", issues: [] })),
    );
    if (input.username === undefined && input.email === undefined) {
      return yield* Effect.fail(new ValidationError({
        message: "At least one profile field is required",
        issues: [{ path: [], message: "Provide username or email" }],
      }));
    }
    const repository = yield* UserRepository;
    const current = yield* repository.findProfileById(user.id);
    if (!current) return yield* Effect.fail(new UserNotFound({ message: "User not found" }));
    const email = input.email?.toLowerCase();
    if (email !== undefined && email !== current.email) {
      if (!input.current_password) return yield* Effect.fail(new ValidationError({
        message: "Current password is required to change email",
        issues: [{ path: ["current_password"], message: "Required when changing email" }],
      }));
      const record = yield* repository.findUserById(user.id);
      if (!record || !(yield* Effect.promise(() => verifyPassword(input.current_password!, record.password)))) {
        return yield* Effect.fail(new UnauthorizedError());
      }
    }
    const updated = yield* repository.updateProfile(user.id, {
      ...(input.username !== undefined ? { username: input.username } : {}),
      ...(email !== undefined ? { email } : {}),
    });
    if (!updated) return yield* Effect.fail(new UserNotFound({ message: "User not found" }));
    return updated;
  });
}
