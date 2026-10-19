import { DatabaseError } from "@/shared/errors.js";
import { Effect } from "effect";
import { AccountNotFound } from "~/packages/shared/dist/accounts/accounts.errors.js";
import {
  HistoryBalance,
  UpdatedAccount,
} from "~/packages/shared/dist/accounts/accounts.schema.js";
import { AccountRepository } from "./accounts.repository.js";

export function getUserAccounts(
  userId: string,
): Effect.Effect<
  UpdatedAccount[],
  DatabaseError | AccountNotFound,
  AccountRepository
> {
  return Effect.gen(function* () {
    const accountRepo = yield* AccountRepository;

    const accounts = yield* accountRepo.getUserAccounts(userId);

    if (!accounts) {
      return yield* Effect.fail(
        new AccountNotFound({
          message: `No accounts found for user with ID ${userId}`,
        }),
      );
    }

    return accounts;
  });
}

export function getAccountById(
  accountId: string,
): Effect.Effect<
  UpdatedAccount | null,
  DatabaseError | AccountNotFound,
  AccountRepository
> {
  return Effect.gen(function* () {
    const accountRepo = yield* AccountRepository;

    const account = yield* accountRepo.getAccountById(accountId);

    if (!account) {
      return yield* Effect.fail(
        new AccountNotFound({
          message: `No account found with ID ${accountId}`,
        }),
      );
    }

    return account;
  });
}

export function getHistoryBalance(
  userId: string,
  startDate: string,
  endDate: string,
  interval: "day" | "month",
  accountId?: string,
): Effect.Effect<
  HistoryBalance,
  DatabaseError | AccountNotFound,
  AccountRepository
> {
  return Effect.gen(function* () {
    const accountRepo = yield* AccountRepository;

    const historyBalance = yield* accountRepo.getHistoryBalance(
      userId,
      startDate,
      endDate,
      interval,
      accountId,
    );

    if (!historyBalance) {
      return yield* Effect.fail(
        new AccountNotFound({
          message: `No history balance found for user with ID ${userId}`,
        }),
      );
    }

    return historyBalance;
  });
}
