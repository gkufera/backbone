-- CreateEnum
CREATE TYPE "ScopeFilter" AS ENUM ('ALL', 'MY_DEPARTMENT');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'OPTION_ADDED';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "email_sent_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "option_emails" BOOLEAN NOT NULL DEFAULT true,
    "note_emails" BOOLEAN NOT NULL DEFAULT true,
    "approval_emails" BOOLEAN NOT NULL DEFAULT true,
    "script_emails" BOOLEAN NOT NULL DEFAULT true,
    "member_emails" BOOLEAN NOT NULL DEFAULT true,
    "scope_filter" "ScopeFilter" NOT NULL DEFAULT 'ALL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_production_id_key" ON "notification_preferences"("user_id", "production_id");

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
