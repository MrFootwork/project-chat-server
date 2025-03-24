/*
  Warnings:

  - You are about to drop the column `UsersHistory` on the `Room` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Room" DROP COLUMN "UsersHistory";

-- AlterTable
ALTER TABLE "RoomConfig" ADD COLUMN     "userLeft" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;
