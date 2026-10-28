import { sql } from "drizzle-orm";
import { boolean, check, index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { idColumn, moneyColumn, timestampColumns } from "../helpers.js";
import { accounts } from "./accounts.js";
import { categories } from "./categories.js";
import { users } from "./users.js";

export const incomes = pgTable("incomes", {
  ...idColumn,
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }).notNull(),
  account_id: uuid("account_id").references(() => accounts.id, { onDelete: "restrict", onUpdate: "cascade" }).notNull(),
  category_id: uuid("category_id").references(() => categories.id, { onDelete: "set null", onUpdate: "cascade" }),
  name: text("name").notNull(),
  amount: moneyColumn("amount").notNull(),
  is_active: boolean("is_active").notNull().default(true),
  ...timestampColumns,
}, (table) => [
  index("incomes_user_id_idx").on(table.user_id),
  index("incomes_account_id_idx").on(table.account_id),
  check("incomes_amount_positive", sql`${table.amount} > 0`),
]);
