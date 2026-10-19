import { Schema } from "effect";

export class UpdatedAccount extends Schema.Class<UpdatedAccount>(
  "UpdatedAccount",
)({
  id: Schema.String,
  name: Schema.String,
  emoji: Schema.String,
  color: Schema.String,
  annual_interest_rate: Schema.Number,
  interest_payment_rate: Schema.Number,

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
  history: Schema.Array(BalancePointHistory),
}) {}
