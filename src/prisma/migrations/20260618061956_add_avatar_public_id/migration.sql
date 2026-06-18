-- AlterTable: add avatarPublicId column for Cloudinary public ID tracking
ALTER TABLE "users" ADD COLUMN "avatarPublicId" TEXT;
