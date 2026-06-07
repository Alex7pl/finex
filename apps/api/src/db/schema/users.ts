import { pgTable, varchar } from "drizzle-orm/pg-core";
import { idColumn } from "../helpers.js";

export const users = pgTable("users", {
    ...idColumn,
    email: varchar("email").notNull().unique(),
    username: varchar("username").notNull().unique(),
    password: varchar("password").notNull()
})