import type { TransactionDto, TransactionFilters, TransactionList } from "@finex/shared/transactions/transactions.schema.js";
import type { DatabaseError } from "@/shared/errors.js";
import { Context, Effect } from "effect";

export class TransactionRepository extends Context.Tag("TransactionRepository")<
  TransactionRepository,
  {
    list: (userId: string, filters: TransactionFilters) => Effect.Effect<TransactionList, DatabaseError>;
    findById: (userId: string, id: string) => Effect.Effect<TransactionDto | null, DatabaseError>;
  }
>() {}
