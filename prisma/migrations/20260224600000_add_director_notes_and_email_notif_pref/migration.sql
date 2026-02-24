-- AlterTable
ALTER TABLE "users" ADD COLUMN "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "director_notes" (
    "id" TEXT NOT NULL,
    "script_id" TEXT NOT NULL,
    "scene_number" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "director_notes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "director_notes" ADD CONSTRAINT "director_notes_script_id_fkey" FOREIGN KEY ("script_id") REFERENCES "scripts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "director_notes" ADD CONSTRAINT "director_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
