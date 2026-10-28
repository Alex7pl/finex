import { Context, Effect } from "effect";
import type { SourceDto, SourceKind, SourceWrite, MovementWrite, AccrualWrite, SplitWrite, SourceNotFound } from "@finex/shared/ledger/ledger.schema.js";
import type { ValidationError } from "@finex/shared/errors.js";
import type { TransactionNotFound } from "@finex/shared/transactions/transactions.errors.js";
import type { DatabaseError } from "@/shared/errors.js";
type Failure = DatabaseError | ValidationError | SourceNotFound | TransactionNotFound;
export class LedgerRepository extends Context.Tag("LedgerRepository")<LedgerRepository, {
  list: (user: string, kind: SourceKind, id?: string) => Effect.Effect<SourceDto[], Failure>;
  save: (user: string, kind: SourceKind, data: Partial<SourceWrite>, id?: string) => Effect.Effect<string, Failure>;
  delete: (user: string, kind: SourceKind, id: string) => Effect.Effect<void, Failure>;
  createMovement: (user: string, data: MovementWrite) => Effect.Effect<string, Failure>;
  accrue: (user: string, kind: SourceKind, id: string, data: AccrualWrite) => Effect.Effect<string, Failure>;
  settle: (user: string, id: string, splits: readonly SplitWrite[]) => Effect.Effect<void, Failure>;
}>() {}
