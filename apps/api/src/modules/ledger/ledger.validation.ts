import { z } from "zod";
import { cents } from "@/shared/money.js";
import { name, nonNegativeMoney, positiveMoney } from "../budgets/planning.validation.js";
const common = {
  name, account_id: z.uuid(), category_id: z.uuid().nullable(),
  amount: positiveMoney, is_active: z.boolean(),
};
const debtFields = {
  capital: positiveMoney.nullable(),
  interests: nonNegativeMoney.nullable(),
  time_limit: z.iso.datetime({ offset: true }).nullable(),
};
export const incomeInput = z.strictObject({
  ...common, category_id: common.category_id.default(null), is_active: common.is_active.default(true),
});
export const debtInput = incomeInput.extend({
  capital: debtFields.capital.default(null),
  interests: debtFields.interests.default(null),
  time_limit: debtFields.time_limit.default(null),
});
// PATCH schemas must not apply creation defaults to fields omitted by the caller.
export const incomePatch = z.strictObject(common).partial().refine((x) => Object.keys(x).length > 0, "Empty update");
export const debtPatch = z.strictObject({ ...common, ...debtFields }).partial().refine((x) => Object.keys(x).length > 0, "Empty update");
export const splitInput = z.strictObject({
  account_id: z.uuid(), amount: positiveMoney, state: z.enum(["Pending", "Completed"]).default("Completed"),
});
export const splitsInput = z.array(splitInput).min(1).max(50);
export const movementInput = z.strictObject({
  type: z.enum(["income", "expense"]), amount: positiveMoney,
  description: z.string().trim().max(1000).nullable().default(null),
  category_id: z.uuid().nullable().default(null), splits: splitsInput,
}).superRefine((value, ctx) => {
  if (value.splits.reduce((sum, s) => sum + cents(s.amount), 0n) !== cents(value.amount)) {
    ctx.addIssue({ code: "custom", path: ["splits"], message: "Split amounts must equal movement amount" });
  }
});
export const accrualInput = z.strictObject({
  amount: positiveMoney.optional(), description: z.string().trim().max(1000).optional(), splits: splitsInput.optional(),
});
export const settlementInput = z.strictObject({ splits: splitsInput });
