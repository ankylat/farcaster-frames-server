-- CreateEnum
CREATE TYPE "Rating" AS ENUM ('ONE', 'TWO', 'THREE');

-- CreateTable
CREATE TABLE "User" (
    "fid" TEXT NOT NULL,
    "casts" TEXT[],
    "followingBios" TEXT[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("fid")
);

-- CreateTable
CREATE TABLE "CastRepliedToUser" (
    "castHash" TEXT NOT NULL,
    "fid" TEXT NOT NULL,
    "originalCastText" TEXT NOT NULL,
    "replyCastText" TEXT NOT NULL,
    "userFeedbackCastText" TEXT NOT NULL,
    "ratingFromUser" INTEGER NOT NULL,
    "timestampOfReply" TIMESTAMP(3) NOT NULL,
    "timestampOfUserInteraction" TIMESTAMP(3) NOT NULL,
    "iceBreakerText" TEXT NOT NULL,

    CONSTRAINT "CastRepliedToUser_pkey" PRIMARY KEY ("castHash")
);

-- CreateTable
CREATE TABLE "IceBreaker" (
    "id" SERIAL NOT NULL,
    "initialIcebreaker" TEXT NOT NULL,
    "userConversationOne" TEXT NOT NULL,
    "botReplyOne" TEXT NOT NULL,
    "userConversationTwo" TEXT NOT NULL,
    "botReplyTwo" TEXT NOT NULL,
    "userConversationThree" TEXT NOT NULL,
    "botReplyThree" TEXT NOT NULL,
    "comeBackTomorrow" TEXT NOT NULL,

    CONSTRAINT "IceBreaker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_fid_key" ON "User"("fid");

-- CreateIndex
CREATE UNIQUE INDEX "CastRepliedToUser_castHash_key" ON "CastRepliedToUser"("castHash");

-- AddForeignKey
ALTER TABLE "CastRepliedToUser" ADD CONSTRAINT "CastRepliedToUser_fid_fkey" FOREIGN KEY ("fid") REFERENCES "User"("fid") ON DELETE RESTRICT ON UPDATE CASCADE;
