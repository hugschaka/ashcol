-- Admin-created users with temp password + platform superadmin
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ALTER COLUMN "acceptedTerms" SET DEFAULT false;
ALTER TABLE "User" ALTER COLUMN "acceptedCookies" SET DEFAULT false;
