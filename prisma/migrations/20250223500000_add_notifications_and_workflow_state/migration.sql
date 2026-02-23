-- CreateEnum: ElementWorkflowState
CREATE TYPE "ElementWorkflowState" AS ENUM ('PENDING', 'OUTSTANDING', 'APPROVED');

-- CreateEnum: NotificationType
CREATE TYPE "NotificationType" AS ENUM ('OPTION_READY', 'OPTION_APPROVED', 'OPTION_REJECTED', 'OPTION_MAYBE', 'MEMBER_INVITED', 'SCRIPT_UPLOADED');

-- AlterTable: Add workflowState to elements
ALTER TABLE "elements" ADD COLUMN "workflow_state" "ElementWorkflowState" NOT NULL DEFAULT 'PENDING';

-- Data migration: Set workflow_state for existing elements
UPDATE "elements" SET "workflow_state" = 'APPROVED'
WHERE "id" IN (
  SELECT DISTINCT e."id" FROM "elements" e
  JOIN "options" o ON o."element_id" = e."id"
  JOIN "approvals" a ON a."option_id" = o."id"
  WHERE a."decision" = 'APPROVED' AND o."status" = 'ACTIVE' AND e."status" = 'ACTIVE'
);

UPDATE "elements" SET "workflow_state" = 'OUTSTANDING'
WHERE "workflow_state" = 'PENDING' AND "id" IN (
  SELECT DISTINCT e."id" FROM "elements" e
  JOIN "options" o ON o."element_id" = e."id"
  WHERE o."ready_for_review" = true AND o."status" = 'ACTIVE' AND e."status" = 'ACTIVE'
);

-- CreateTable: notifications
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "production_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_production_id_read_idx" ON "notifications"("user_id", "production_id", "read");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
