-- DropForeignKey
ALTER TABLE "phone_verification_codes" DROP CONSTRAINT "phone_verification_codes_user_id_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "phone",
DROP COLUMN "phone_verified";

-- DropTable
DROP TABLE "phone_verification_codes";
