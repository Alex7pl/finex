ALTER TABLE "user_tokens" ADD COLUMN "family_id" uuid;--> statement-breakpoint
UPDATE "user_tokens" SET "family_id" = "id" WHERE "family_id" IS NULL;--> statement-breakpoint
ALTER TABLE "user_tokens" ALTER COLUMN "family_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_tokens_token_hash_unique" ON "user_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "user_tokens_family_id_idx" ON "user_tokens" USING btree ("family_id");
