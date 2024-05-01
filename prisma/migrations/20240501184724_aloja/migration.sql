/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `prompt` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fid]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "id",
DROP COLUMN "prompt",
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("fid");

-- CreateTable
CREATE TABLE "WritingSession" (
    "id" SERIAL NOT NULL,
    "userFid" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_fid_key" ON "User"("fid");

-- AddForeignKey
ALTER TABLE "WritingSession" ADD CONSTRAINT "WritingSession_userFid_fkey" FOREIGN KEY ("userFid") REFERENCES "User"("fid") ON DELETE RESTRICT ON UPDATE CASCADE;
