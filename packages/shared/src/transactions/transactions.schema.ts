import { CategoryDto } from "../categories/categories.schema.js";
import { Schema } from "effect";

export const TransactionType = Schema.Literal(
  "income", "expense", "transfer",
);
export const TransactionKind = Schema.Literal("income", "expense", "transfer");
export const TransactionState = Schema.Literal("Completed", "Pending", "Mixed");
export const TransactionAccount = Schema.Struct({
  id: Schema.UUID,
  name: Schema.String,
  emoji: Schema.NullOr(Schema.String),
  color: Schema.NullOr(Schema.String),
});
export const TransactionSplit = Schema.Struct({
  id: Schema.UUID,
  account: TransactionAccount,
  amount: Schema.String,
  state: Schema.Literal("Completed", "Pending"),
});

/** One item per transaction, including all legs of an internal transfer. Money is decimal text. */
export const TransactionDto = Schema.Struct({
  id: Schema.UUID,
  type: TransactionType,
  kind: TransactionKind,
  description: Schema.NullOr(Schema.String),
  category_id: Schema.NullOr(Schema.UUID),
  category: Schema.NullOr(CategoryDto),
  amount: Schema.String,
  created_at: Schema.String,
  updated_at: Schema.String,
  debt_id: Schema.NullOr(Schema.UUID),
  income_id: Schema.NullOr(Schema.UUID),
  state: TransactionState,
  is_internal_transfer: Schema.Boolean,
  from_account: Schema.NullOr(TransactionAccount),
  splits: Schema.Array(TransactionSplit),
});
export type TransactionDto = typeof TransactionDto.Type;

export const TransactionList = Schema.Struct({
  items: Schema.Array(TransactionDto),
  total: Schema.Number,
  page: Schema.Number,
  limit: Schema.Number,
  has_more: Schema.Boolean,
});
export type TransactionList = typeof TransactionList.Type;

export type TransactionFilters = {
  accountIds: readonly string[];
  categoryIds: readonly string[];
  uncategorized?: boolean;
  types: readonly (typeof TransactionType.Type)[];
  kind?: typeof TransactionKind.Type;
  state?: typeof TransactionState.Type;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: string;
  maxAmount?: string;
  debtId?: string;
  incomeId?: string;
  internalTransfer?: boolean;
  page: number;
  limit: number;
  sortBy: "date" | "amount" | "description";
  sortOrder: "asc" | "desc";
};

export const SetTransactionCategoryInput = Schema.Struct({ category_id: Schema.NullOr(Schema.UUID) });
