import { Context, Effect } from "effect";
import type { DatabaseError } from "@/shared/errors.js";
import type { savings } from "@/db/schema/savings.js";
export type SavingsRow = typeof savings.$inferSelect;
export type SavingsWrite = Pick<
  SavingsRow,
  "name" | "account_id" | "target_amount" | "current_amount"
>;
export class SavingsRepository extends Context.Tag("SavingsRepository")<
  SavingsRepository,
  {
    list: (
      user: string,
      accountId?: string,
      id?: string,
    ) => Effect.Effect<SavingsRow[], DatabaseError>;
    create: (
      user: string,
      data: SavingsWrite,
    ) => Effect.Effect<SavingsRow, DatabaseError>;
    update: (
      user: string,
      id: string,
      data: Partial<Omit<SavingsWrite, "current_amount">>,
    ) => Effect.Effect<SavingsRow | null, DatabaseError>;
    adjust: (
      user: string,
      id: string,
      amount: string,
      direction: "deposit" | "withdraw",
    ) => Effect.Effect<SavingsRow | null, DatabaseError>;
    delete: (user: string, id: string) => Effect.Effect<boolean, DatabaseError>;
    ownsAccount: (
      user: string,
      id: string,
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>() {}
