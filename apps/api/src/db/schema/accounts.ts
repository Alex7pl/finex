import { pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { idColumn, numberHelper } from "../helpers.js";
import { users } from "./users.js";


export const accounts = pgTable("accounts", {
    ...idColumn,
    user_id: uuid("user_id").references(() => users.id),

    name: text("name").notNull(),
    emoji: varchar("emoji"),
    color: varchar("color"),

    initial_balance: numberHelper("initial_balance").notNull().default("0"),
    annual_interest_rate: numberHelper("annual_interest_rate"),
    interest_payment_rate: numberHelper("interest_payment_rate")
})