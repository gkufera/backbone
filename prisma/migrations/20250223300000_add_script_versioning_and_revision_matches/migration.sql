-- CreateEnum
CREATE TYPE "RevisionMatchStatus" AS ENUM ('EXACT', 'FUZZY', 'NEW', 'MISSING');

-- AlterEnum
ALTER TYPE "ScriptStatus" ADD VALUE 'RECONCILING';

-- AlterTable
ALTER TABLE "scripts" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "parent_script_id" TEXT;

-- CreateTable
CREATE TABLE "revision_matches" (
    "id" TEXT NOT NULL,
    "new_script_id" TEXT NOT NULL,
    "detected_name" TEXT NOT NULL,
    "detected_type" "ElementType" NOT NULL,
    "detected_pages" INTEGER[],
    "match_status" "RevisionMatchStatus" NOT NULL,
    "old_element_id" TEXT,
    "similarity" DOUBLE PRECISION,
    "user_decision" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_matches_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_parent_script_id_fkey" FOREIGN KEY ("parent_script_id") REFERENCES "scripts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_matches" ADD CONSTRAINT "revision_matches_new_script_id_fkey" FOREIGN KEY ("new_script_id") REFERENCES "scripts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_matches" ADD CONSTRAINT "revision_matches_old_element_id_fkey" FOREIGN KEY ("old_element_id") REFERENCES "elements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
