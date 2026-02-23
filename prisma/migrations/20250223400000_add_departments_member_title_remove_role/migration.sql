-- AlterTable: Remove role and departmentId from users
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
ALTER TABLE "users" DROP COLUMN IF EXISTS "department_id";

-- AlterTable: Add title to production_members
ALTER TABLE "production_members" ADD COLUMN "title" TEXT;

-- CreateTable: departments
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: department_members
CREATE TABLE "department_members" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "production_member_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_production_id_name_key" ON "departments"("production_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "department_members_department_id_production_member_id_key" ON "department_members"("department_id", "production_member_id");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_production_member_id_fkey" FOREIGN KEY ("production_member_id") REFERENCES "production_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropEnum (if exists)
DROP TYPE IF EXISTS "Role";
