-- AlterEnum
ALTER TYPE "ScriptStatus" ADD VALUE 'REVIEWING' BEFORE 'READY';

-- AlterTable
ALTER TABLE "departments" ADD COLUMN "color" TEXT;

-- AlterTable
ALTER TABLE "scripts" ADD COLUMN "scene_data" JSONB;
