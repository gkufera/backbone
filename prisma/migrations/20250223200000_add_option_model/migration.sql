-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'PDF', 'LINK');

-- CreateEnum
CREATE TYPE "OptionStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "options" (
    "id" TEXT NOT NULL,
    "element_id" TEXT NOT NULL,
    "media_type" "MediaType" NOT NULL,
    "description" TEXT,
    "s3_key" TEXT,
    "file_name" TEXT,
    "external_url" TEXT,
    "thumbnail_s3_key" TEXT,
    "status" "OptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "ready_for_review" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "options_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "options" ADD CONSTRAINT "options_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "elements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "options" ADD CONSTRAINT "options_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
