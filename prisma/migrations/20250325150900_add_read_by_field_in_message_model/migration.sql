-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "readBy" TEXT[] DEFAULT ARRAY[]::TEXT[];
