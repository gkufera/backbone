-- CreateEnum
CREATE TYPE "ScriptFormat" AS ENUM ('PDF', 'FDX');

-- AlterTable
ALTER TABLE "scripts" ADD COLUMN "format" "ScriptFormat" NOT NULL DEFAULT 'PDF',
ADD COLUMN "source_s3_key" TEXT;
