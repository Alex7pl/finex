import type {
  CategoryDto,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@finex/shared/categories/categories.schema.js";
import type { CategoryInUse } from "@finex/shared/categories/categories.errors.js";
import type { DatabaseError } from "@/shared/errors.js";
import { Context, Effect } from "effect";

export class CategoryRepository extends Context.Tag("CategoryRepository")<
  CategoryRepository,
  {
    list: (userId: string, kind?: "income" | "expense") => Effect.Effect<CategoryDto[], DatabaseError>;
    findById: (userId: string, id: string) => Effect.Effect<CategoryDto | null, DatabaseError>;
    create: (userId: string, input: CreateCategoryInput) => Effect.Effect<CategoryDto, DatabaseError>;
    update: (
      userId: string, id: string, input: UpdateCategoryInput,
    ) => Effect.Effect<CategoryDto | null, DatabaseError>;
    remove: (userId: string, id: string) => Effect.Effect<boolean, DatabaseError | CategoryInUse>;
  }
>() {}
