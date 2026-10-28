import { CategoryInUse } from "@finex/shared/categories/categories.errors.js";
import { DatabaseService } from "@/db/db.service.js";
import { categories } from "@/db/schema/categories.js";
import { DatabaseError } from "@/shared/errors.js";
import type { CategoryDto } from "@finex/shared/categories/categories.schema.js";
import { and, asc, eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { CategoryRepository } from "./categories.repository.js";

const dto = (row: typeof categories.$inferSelect): CategoryDto => ({
  id: row.id,
  name: row.name,
  kind: row.kind,
  emoji: row.emoji,
  color: row.color,
  created_at: row.created_at.toISOString(),
  updated_at: row.updated_at.toISOString(),
});

export const CategoryRepositoryPostgresLayer = Layer.effect(
  CategoryRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const attempt = <A>(query: () => Promise<A>) => Effect.tryPromise({
      try: query,
      catch: (cause) => new DatabaseError({ message: "Category database operation failed", cause }),
    });
    const owned = (userId: string, id: string) => and(
      eq(categories.user_id, userId), eq(categories.id, id),
    );
    return CategoryRepository.of({
      list: (userId, kind) => attempt(async () => {
        const rows = await db.select().from(categories).where(and(
          eq(categories.user_id, userId), kind ? eq(categories.kind, kind) : undefined,
        )).orderBy(asc(categories.name), asc(categories.id));
        return rows.map(dto);
      }),
      findById: (userId, id) => attempt(async () => {
        const [row] = await db.select().from(categories).where(owned(userId, id));
        return row ? dto(row) : null;
      }),
      create: (userId, input) => attempt(async () => {
        const [row] = await db.insert(categories).values({ ...input, user_id: userId }).returning();
        return dto(row!);
      }),
      update: (userId, id, input) => attempt(async () => {
        const [row] = await db.update(categories)
          .set({ ...input, updated_at: new Date() })
          .where(owned(userId, id)).returning();
        return row ? dto(row) : null;
      }),
      remove: (userId, id) => Effect.tryPromise({
        try: async () => {
          const rows = await db.delete(categories).where(owned(userId, id)).returning({ id: categories.id });
          return rows.length > 0;
        },
        catch: (cause) => {
          // Drizzle wraps PostgreSQL errors. RESTRICT preserves budgets referencing this category.
          const error = cause as { code?: string; cause?: { code?: string } };
          const inUse = [error.code, error.cause?.code].some(
            (code) => code === "23503" || code === "23001",
          );
          return inUse ? new CategoryInUse({ id }) : new DatabaseError({
            message: "Category deletion failed", cause,
          });
        },
      }),
    });
  }),
);
