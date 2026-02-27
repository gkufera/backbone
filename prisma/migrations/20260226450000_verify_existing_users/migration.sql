-- Mark all existing users as email-verified.
-- These users were created before the email verification feature was added.
-- The email_verified column was added with DEFAULT false, leaving existing users unverified.
-- Since they signed up before email verification existed, they should be grandfathered in.
UPDATE "users" SET "email_verified" = true WHERE "email_verified" = false;
