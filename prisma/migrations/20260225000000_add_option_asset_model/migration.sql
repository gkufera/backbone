-- CreateTable
CREATE TABLE "option_assets" (
    "id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "thumbnail_s3_key" TEXT,
    "media_type" "MediaType" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "option_assets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "option_assets" ADD CONSTRAINT "option_assets_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- BackfillOptionAssets: Copy existing file data from options to option_assets
INSERT INTO "option_assets" ("id", "option_id", "s3_key", "file_name", "thumbnail_s3_key", "media_type", "sort_order", "created_at")
SELECT
    gen_random_uuid(),
    "id",
    "s3_key",
    COALESCE("file_name", 'unknown'),
    "thumbnail_s3_key",
    "media_type",
    0,
    "created_at"
FROM "options"
WHERE "s3_key" IS NOT NULL;

-- DropColumns: Remove migrated file columns from options
ALTER TABLE "options" DROP COLUMN "s3_key";
ALTER TABLE "options" DROP COLUMN "file_name";
ALTER TABLE "options" DROP COLUMN "thumbnail_s3_key";
