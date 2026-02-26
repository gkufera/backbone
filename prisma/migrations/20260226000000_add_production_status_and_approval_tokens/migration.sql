-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('PENDING', 'ACTIVE');

-- AlterTable: add new columns to productions
ALTER TABLE "productions" ADD COLUMN "status" "ProductionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "studio_name" TEXT,
ADD COLUMN "budget" TEXT,
ADD COLUMN "contact_name" TEXT,
ADD COLUMN "contact_email" TEXT;

-- Set existing productions to ACTIVE (they were created before gating)
UPDATE "productions" SET "status" = 'ACTIVE';

-- CreateTable: production_approval_tokens
CREATE TABLE "production_approval_tokens" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_approval_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "production_approval_tokens_token_key" ON "production_approval_tokens"("token");

-- AddForeignKey
ALTER TABLE "production_approval_tokens" ADD CONSTRAINT "production_approval_tokens_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
