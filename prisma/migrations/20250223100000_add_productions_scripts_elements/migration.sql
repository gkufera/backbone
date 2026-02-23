-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ScriptStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'ERROR');

-- CreateEnum
CREATE TYPE "ElementType" AS ENUM ('CHARACTER', 'LOCATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ElementStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ElementSource" AS ENUM ('AUTO', 'MANUAL');

-- CreateTable
CREATE TABLE "productions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_members" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scripts" (
    "id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "page_count" INTEGER,
    "status" "ScriptStatus" NOT NULL DEFAULT 'UPLOADING',
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elements" (
    "id" TEXT NOT NULL,
    "script_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ElementType" NOT NULL DEFAULT 'OTHER',
    "page_numbers" INTEGER[],
    "status" "ElementStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "ElementSource" NOT NULL DEFAULT 'AUTO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "elements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "production_members_production_id_user_id_key" ON "production_members"("production_id", "user_id");

-- AddForeignKey
ALTER TABLE "productions" ADD CONSTRAINT "productions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_members" ADD CONSTRAINT "production_members_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_members" ADD CONSTRAINT "production_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elements" ADD CONSTRAINT "elements_script_id_fkey" FOREIGN KEY ("script_id") REFERENCES "scripts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
