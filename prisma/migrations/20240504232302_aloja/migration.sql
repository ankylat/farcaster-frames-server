/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `fid` on the `CastRepliedToUser` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `fid` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "CastRepliedToUser" DROP CONSTRAINT "CastRepliedToUser_fid_fkey";

-- AlterTable
ALTER TABLE "CastRepliedToUser" DROP COLUMN "fid",
ADD COLUMN     "fid" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ADD COLUMN     "fetchedUserData" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "fid",
ADD COLUMN     "fid" INTEGER NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("fid");

-- CreateIndex
CREATE UNIQUE INDEX "User_fid_key" ON "User"("fid");

-- AddForeignKey
ALTER TABLE "CastRepliedToUser" ADD CONSTRAINT "CastRepliedToUser_fid_fkey" FOREIGN KEY ("fid") REFERENCES "User"("fid") ON DELETE RESTRICT ON UPDATE CASCADE;
