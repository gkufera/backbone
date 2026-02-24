-- Step 1: Rename OWNER rows to ADMIN (they already share the same semantics)
UPDATE "production_members" SET "role" = 'ADMIN' WHERE "role" = 'OWNER';

-- Step 2: Recreate MemberRole enum without OWNER, with DECIDER
-- Rename old enum
ALTER TYPE "MemberRole" RENAME TO "MemberRole_old";

-- Create new enum with desired values
CREATE TYPE "MemberRole" AS ENUM ('ADMIN', 'DECIDER', 'MEMBER');

-- Alter column to use new enum
ALTER TABLE "production_members"
  ALTER COLUMN "role" TYPE "MemberRole" USING ("role"::text::"MemberRole"),
  ALTER COLUMN "role" SET DEFAULT 'MEMBER'::"MemberRole";

-- Drop old enum
DROP TYPE "MemberRole_old";

-- Step 3: Add tentative column to approvals
ALTER TABLE "approvals" ADD COLUMN "tentative" BOOLEAN NOT NULL DEFAULT false;

-- Step 4: Add new notification types
ALTER TYPE "NotificationType" ADD VALUE 'TENTATIVE_APPROVAL';
ALTER TYPE "NotificationType" ADD VALUE 'TENTATIVE_CONFIRMED';
