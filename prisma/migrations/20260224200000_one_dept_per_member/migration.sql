-- AlterTable: Add department_id column to production_members
ALTER TABLE "production_members" ADD COLUMN "department_id" TEXT;

-- Migrate data: Copy first department assignment from department_members join table
UPDATE "production_members" pm
SET "department_id" = (
  SELECT dm."department_id"
  FROM "department_members" dm
  WHERE dm."production_member_id" = pm."id"
  LIMIT 1
);

-- AddForeignKey
ALTER TABLE "production_members" ADD CONSTRAINT "production_members_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropTable
DROP TABLE "department_members";
