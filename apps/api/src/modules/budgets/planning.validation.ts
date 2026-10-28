import { Effect } from "effect";
import { z } from "zod";
import { ValidationError } from "@finex/shared/errors.js";
import { cents } from "@/shared/money.js";
export const nonNegativeMoney = z
  .string()
  .regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/);
export const positiveMoney = nonNegativeMoney.pipe(
  z.string().refine((value) => cents(value) > 0n, "Must be positive"),
);
export const monthSchema = z.string().regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/);
export const listQuery = z.strictObject({
  month: monthSchema.optional(),
  accountId: z.uuid().optional(),
});
export const name = z.string().trim().min(1).max(200);
export function invalid(message: string) {
  return new ValidationError({ message, issues: [] });
}
export function parse<T extends z.ZodType>(schema: T, raw: unknown) {
  const result = schema.safeParse(raw);
  return result.success
    ? Effect.succeed(result.data)
    : Effect.fail(
        new ValidationError({
          message: "Invalid input",
          issues: result.error.issues.map((i) => ({
            path: i.path.map(String),
            message: i.message,
          })),
        }),
      );
}
export function currentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}
