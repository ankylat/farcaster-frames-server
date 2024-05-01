-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "prompt" TEXT,
    "fid" INTEGER NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
