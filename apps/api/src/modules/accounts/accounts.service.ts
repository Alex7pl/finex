import { Effect } from "effect";
import { z } from "zod";
import { ValidationError } from "@finex/shared/errors.js";
import { AccountNotFound } from "@finex/shared/accounts/accounts.errors.js";
import { CurrentUser } from "@/runtime/request-context.js";
import { AccountRepository } from "./accounts.repository.js";

function decode<T extends z.ZodType>(schema: T, raw: unknown) {
  const result = schema.safeParse(raw);
  return result.success
    ? Effect.succeed(result.data)
    : Effect.fail(
        new ValidationError({
          message: "Invalid account query",
          issues: result.error.issues.map((issue) => ({
            path: issue.path.map(String),
            message: issue.message,
          })),
        }),
      );
}
export function getUserAccounts() {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    return yield* (yield* AccountRepository).getUserAccounts(user.id);
  });
}
export function getAccountById(raw: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const id = yield* decode(z.uuid(), raw);
    const account = yield* (yield* AccountRepository).getAccountById(
      user.id,
      id,
    );
    if (!account)
      return yield* Effect.fail(
        new AccountNotFound({ message: "Account not found" }),
      );
    return account;
  });
}
export function getHistoryBalance(raw: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const query = yield* decode(
      z
        .strictObject({
          dateFrom: z.iso.datetime({ offset: true }),
          dateTo: z.iso.datetime({ offset: true }),
          interval: z.enum(["day", "month"]).default("day"),
          accountId: z.uuid().optional(),
        })
        .refine(
          (value) =>
            Date.parse(value.dateTo) > Date.parse(value.dateFrom) &&
            Date.parse(value.dateTo) - Date.parse(value.dateFrom) <=
              367 * 86400000,
          "Period must be positive and at most 367 days",
        ),
      raw,
    );
    const repo = yield* AccountRepository;
    if (
      query.accountId &&
      !(yield* repo.getAccountById(user.id, query.accountId))
    ) {
      return yield* Effect.fail(
        new AccountNotFound({ message: "Account not found" }),
      );
    }
    return yield* repo.getHistoryBalance(
      user.id,
      query.dateFrom,
      query.dateTo,
      query.interval,
      query.accountId,
    );
  });
}
