CREATE TABLE "incomes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incomes_amount_positive" CHECK ("incomes"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "debts" DROP CONSTRAINT "debts_quota_non_negative";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_transfer_no_category";--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "about_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
UPDATE "transactions" SET "type" = CASE
  WHEN "type" IN ('Fixed_income', 'Variable_income') THEN 'income'
  WHEN "type" IN ('Fixed_expense', 'Variable_expense') THEN 'expense'
  WHEN "type" = 'Transfer' THEN 'transfer' ELSE "type" END;--> statement-breakpoint
UPDATE "budgets" SET "about_type" = CASE
  WHEN "about_type" IN ('Fixed_expense', 'Variable_expense', 'expense') THEN 'expense'
  ELSE NULL END;--> statement-breakpoint
DROP TYPE "public"."transactions_type";--> statement-breakpoint
CREATE TYPE "public"."transactions_type" AS ENUM('income', 'expense', 'transfer');--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "about_type" SET DATA TYPE "public"."transactions_type" USING "about_type"::"public"."transactions_type";--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "type" SET DATA TYPE "public"."transactions_type" USING "type"::"public"."transactions_type";--> statement-breakpoint
UPDATE "debts" SET "name" = COALESCE(NULLIF(trim("name"), ''), 'Deuda'),
  "interests" = CASE WHEN "capital" IS NULL THEN NULL ELSE "interests" END,
  "time_limit" = CASE WHEN "capital" IS NULL THEN NULL ELSE "time_limit" END;--> statement-breakpoint
ALTER TABLE "debts" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "debts" ALTER COLUMN "time_limit" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "debts" ALTER COLUMN "quota" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "debt_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "income_id" uuid;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "incomes_user_id_idx" ON "incomes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "incomes_account_id_idx" ON "incomes" USING btree ("account_id");--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_income_id_incomes_id_fk" FOREIGN KEY ("income_id") REFERENCES "public"."incomes"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "transactions_debt_id_idx" ON "transactions" USING btree ("debt_id");--> statement-breakpoint
CREATE INDEX "transactions_income_id_idx" ON "transactions" USING btree ("income_id");--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "cycle";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_quota_positive" CHECK ("debts"."quota" > 0);--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_interest_requires_capital" CHECK ("debts"."capital" IS NOT NULL OR "debts"."interests" IS NULL);--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_source_matches_type" CHECK (("transactions"."debt_id" IS NULL OR ("transactions"."type" = 'expense' AND "transactions"."income_id" IS NULL)) AND ("transactions"."income_id" IS NULL OR ("transactions"."type" = 'income' AND "transactions"."debt_id" IS NULL)));--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transfer_no_category" CHECK ("transactions"."type" <> 'transfer' OR "transactions"."category_id" IS NULL);