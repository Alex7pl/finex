import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { idColumn, numberHelper, timestampColumns } from "../helpers.js";
import { accounts } from "./accounts.js";
import { users } from "./users.js";

export const savings = pgTable("savings", {
  ...idColumn,

  user_id: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  account_id: uuid("account_id")
    .references(() => accounts.id)
    .notNull(),

  name: text("name"),

  current_amount: numberHelper("current_amount").notNull().default("0"),
  target_amount: numberHelper("target_amount").notNull().default("0"),

  ...timestampColumns,
});
