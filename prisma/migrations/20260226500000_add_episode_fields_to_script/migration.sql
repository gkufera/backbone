-- AlterTable
ALTER TABLE "scripts" ADD COLUMN "episode_number" INTEGER,
ADD COLUMN "episode_title" TEXT;

-- CreateIndex
CREATE INDEX "scripts_production_id_episode_number_idx" ON "scripts"("production_id", "episode_number");
