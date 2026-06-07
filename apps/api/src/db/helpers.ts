import { sql } from "drizzle-orm";
import { numeric, uuid } from "drizzle-orm/pg-core";


export const idColumn = {
  id: uuid().default(sql`uuidv7()`).primaryKey().notNull()
};

export const numberHelper = (name: string) => numeric(`${name}`, { precision: 10, scale: 2 })