import { Schema } from "effect";

export class UpdatedAccount extends Schema.Class<UpdatedAccount>(
  "UpdatedAccount",
)({
  id: Schema.String,
  name: Schema.String,
  emoji: Schema.NullOr(Schema.String),
  color: Schema.NullOr(Schema.String),
  annual_interest_rate: Schema.NullOr(Schema.String),
  interest_payment_rate: Schema.NullOr(Schema.String),

  balance: Schema.String,
}) {}

export class BalancePointHistory extends Schema.Class<BalancePointHistory>(
  "BalancePointHistory",
)({
  date: Schema.String,
  change: Schema.String,
  acumulated_balance: Schema.String,
}) {}

export class HistoryBalance extends Schema.Class<HistoryBalance>(
  "HistoryBalance",
)({
  currency: Schema.String,
  total_balance: Schema.String,
  initial_balance: Schema.String,
  last_period_balance: Schema.String,
  income: Schema.String,
  expenses: Schema.String,
  history: Schema.Array(BalancePointHistory),
}) {}
