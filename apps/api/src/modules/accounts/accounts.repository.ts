import { DatabaseError } from "@/shared/errors.js";
import { Context, Effect } from "effect";
import {
  HistoryBalance,
  UpdatedAccount,
} from "@finex/shared/accounts/accounts.schema.js";

export class AccountRepository extends Context.Tag("AccountRepository")<
  AccountRepository,
  {
    getUserAccounts: (
      userId: string,
    ) => Effect.Effect<UpdatedAccount[], DatabaseError>;
    getAccountById: (
      userId: string,
      accountId: string,
    ) => Effect.Effect<UpdatedAccount | null, DatabaseError>;
    getHistoryBalance: (
      userId: string,
      startDate: string,
      endDate: string,
      interval: "day" | "month",
      accountId?: string,
    ) => Effect.Effect<HistoryBalance, DatabaseError>;
  }
>() {}
