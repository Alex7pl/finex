import { ValidationError } from "@finex/shared/errors.js";
import { TransactionKind, TransactionState, TransactionType, type TransactionFilters } from "@finex/shared/transactions/transactions.schema.js";
import { Effect, Schema } from "effect";
import { z } from "zod";

const list = <T extends z.ZodType>(item: T) => z.preprocess(
  (value) => value === undefined ? [] : (Array.isArray(value) ? value : [value])
    .flatMap((entry: unknown) => typeof entry === "string" ? entry.split(",") : [entry]),
  z.array(item).max(50),
);
const decimal = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/);
const boolean = z.enum(["true", "false"]).transform((value) => value === "true");
const date = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);
const querySchema = z.strictObject({
  accountId: list(z.uuid()),
  categoryId: list(z.uuid()),
  uncategorized: boolean.optional(),
  type: list(z.enum(TransactionType.literals)),
  kind: z.enum(TransactionKind.literals).optional(),
  state: z.enum(TransactionState.literals).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  dateFrom: date.optional(),
  dateTo: date.optional(),
  minAmount: decimal.optional(),
  maxAmount: decimal.optional(),
  isActive: boolean.optional(),
  internalTransfer: boolean.optional(),
  page: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(1_000_000)).default(1),
  limit: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100)).default(25),
  sortBy: z.enum(["date", "amount", "description"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).superRefine((value, ctx) => {
  if (value.uncategorized === true && value.categoryId.length) ctx.addIssue({ code: "custom", path: ["uncategorized"], message: "categoryId and uncategorized=true cannot be combined" });
  const end = value.dateTo ? Date.parse(value.dateTo) : undefined;
  const start = value.dateFrom ? Date.parse(value.dateFrom) : undefined;
  const invalidRange = start !== undefined && end !== undefined && (
    value.dateTo!.length === 10 ? start >= end + 86_400_000 : start > end
  );
  if (invalidRange) {
    ctx.addIssue({ code: "custom", path: ["dateTo"], message: "dateTo must be on or after dateFrom" });
  }
  if (value.minAmount && value.maxAmount && Number(value.minAmount) > Number(value.maxAmount)) {
    ctx.addIssue({ code: "custom", path: ["maxAmount"], message: "maxAmount must be at least minAmount" });
  }
});

export function parseTransactionFilters(raw: unknown) {
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) return Effect.fail(new ValidationError({
    message: "Invalid transaction filters",
    issues: parsed.error.issues.map((issue) => ({ path: issue.path.map(String), message: issue.message })),
  }));
  const { accountId, categoryId, type, ...rest } = parsed.data;
  return Effect.succeed({ ...rest, accountIds: accountId, categoryIds: categoryId, types: type } satisfies TransactionFilters);
}

export function parseTransactionId(raw: unknown) {
  return Schema.decodeUnknown(Schema.UUID)(raw).pipe(Effect.mapError(() => new ValidationError({
    message: "Invalid transaction ID", issues: [{ path: ["transactionId"], message: "Expected UUID" }],
  })));
}
