import { sql } from "drizzle-orm";
import { check, index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { idColumn, moneyColumn, timestampColumns } from "../helpers.js";
import { accounts } from "./accounts.js";
import { users } from "./users.js";

export const savings = pgTable("savings", {
  ...idColumn,

  user_id: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" })
    .notNull(),
  account_id: uuid("account_id")
    .references(() => accounts.id, { onDelete: "restrict", onUpdate: "cascade" })
    .notNull(),

  name: text("name"),

  current_amount: moneyColumn("current_amount").notNull().default("0"),
  target_amount: moneyColumn("target_amount").notNull().default("0"),

  ...timestampColumns,
}, (table) => [
  index("savings_user_id_idx").on(table.user_id),
  index("savings_account_id_idx").on(table.account_id),
  check("savings_current_amount_non_negative", sql`${table.current_amount} >= 0`),
  check("savings_target_amount_non_negative", sql`${table.target_amount} >= 0`),
]);
