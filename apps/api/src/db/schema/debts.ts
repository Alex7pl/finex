import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { idColumn, numberHelper, timestampColumns } from "../helpers.js";
import { accounts } from "./accounts.js";
import { users } from "./users.js";

export const debts = pgTable("debts", {
  ...idColumn,

  user_id: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  account_id: uuid("account_id")
    .references(() => accounts.id)
    .notNull(),

  name: text("name"),

  // for debts with interest
  capital: numberHelper("capital"),
  interests: numberHelper("interests"),
  time_limit: timestamp("time_limit", { withTimezone: true }).defaultNow(),

  // for simple debts
  quota: numberHelper("quota"),

  ...timestampColumns,
});
