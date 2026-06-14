import { sql } from "drizzle-orm";
import { numeric, timestamp, uuid } from "drizzle-orm/pg-core";

export const idColumn = {
  id: uuid()
    .default(sql`uuidv7()`)
    .primaryKey()
    .notNull(),
};

export const timestampColumns = {
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const moneyColumn = (name: string) =>
  numeric(name, { precision: 12, scale: 2 });

export const rateColumn = (name: string) =>
  numeric(name, { precision: 5, scale: 2 });
