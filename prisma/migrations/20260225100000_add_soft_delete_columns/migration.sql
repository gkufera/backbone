-- AlterTable
ALTER TABLE "production_members" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "elements" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "departments" ADD COLUMN "deleted_at" TIMESTAMP(3);
