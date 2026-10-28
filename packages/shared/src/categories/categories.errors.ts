import { Schema } from "effect";

export class CategoryNotFound extends Schema.TaggedError<CategoryNotFound>()(
  "CategoryNotFound", { id: Schema.String },
) {}

export class CategoryInUse extends Schema.TaggedError<CategoryInUse>()(
  "CategoryInUse", { id: Schema.String },
) {}
