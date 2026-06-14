CREATE TYPE "public"."state" AS ENUM('Completed', 'Pending');--> statement-breakpoint
CREATE TYPE "public"."transactions_type" AS ENUM('Fixed_income', 'Variable_income', 'Fixed_expense', 'Variable_expense', 'Transfer');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"emoji" varchar,
	"color" varchar,
	"initial_balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"annual_interest_rate" numeric(5, 2),
	"interest_payment_rate" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_annual_interest_rate_range" CHECK ("accounts"."annual_interest_rate" IS NULL OR ("accounts"."annual_interest_rate" >= 0 AND "accounts"."annual_interest_rate" <= 100)),
	CONSTRAINT "accounts_interest_payment_rate_range" CHECK ("accounts"."interest_payment_rate" IS NULL OR ("accounts"."interest_payment_rate" >= 0 AND "accounts"."interest_payment_rate" <= 100))
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text,
	"monthly_limit" numeric(12, 2) NOT NULL,
	"about_type" "transactions_type",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_monthly_limit_positive" CHECK ("budgets"."monthly_limit" > 0)
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text,
	"capital" numeric(12, 2),
	"interests" numeric(12, 2),
	"time_limit" timestamp with time zone DEFAULT now(),
	"quota" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debts_capital_non_negative" CHECK ("debts"."capital" IS NULL OR "debts"."capital" >= 0),
	CONSTRAINT "debts_interests_non_negative" CHECK ("debts"."interests" IS NULL OR "debts"."interests" >= 0),
	CONSTRAINT "debts_quota_non_negative" CHECK ("debts"."quota" IS NULL OR "debts"."quota" >= 0)
);
--> statement-breakpoint
CREATE TABLE "savings" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text,
	"current_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"target_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "savings_current_amount_non_negative" CHECK ("savings"."current_amount" >= 0),
	CONSTRAINT "savings_target_amount_non_negative" CHECK ("savings"."target_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "transactions_type" NOT NULL,
	"description" text,
	"amount" numeric(12, 2) NOT NULL,
	"from" uuid NOT NULL,
	"cycle" timestamp with time zone DEFAULT now(),
	"is_active" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_amount_non_zero" CHECK ("transactions"."amount" <> 0)
);
--> statement-breakpoint
CREATE TABLE "transactions_splits" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"state" "state" DEFAULT 'Pending' NOT NULL,
	CONSTRAINT "transactions_splits_amount_non_zero" CHECK ("transactions_splits"."amount" <> 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"email" varchar NOT NULL,
	"username" varchar NOT NULL,
	"password" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "savings" ADD CONSTRAINT "savings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "savings" ADD CONSTRAINT "savings_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_from_accounts_id_fk" FOREIGN KEY ("from") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "transactions_splits" ADD CONSTRAINT "transactions_splits_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "transactions_splits" ADD CONSTRAINT "transactions_splits_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "budgets_user_id_idx" ON "budgets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "debts_user_id_idx" ON "debts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "debts_account_id_idx" ON "debts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "savings_user_id_idx" ON "savings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "savings_account_id_idx" ON "savings" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_from_idx" ON "transactions" USING btree ("from");--> statement-breakpoint
CREATE INDEX "transactions_splits_transaction_id_idx" ON "transactions_splits" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "transactions_splits_account_id_idx" ON "transactions_splits" USING btree ("account_id");