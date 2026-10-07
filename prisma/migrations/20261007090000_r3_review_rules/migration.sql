-- CreateEnum
CREATE TYPE "VoteChoice" AS ENUM ('APPROVE', 'DECLINE');

-- AlterTable
ALTER TABLE "InvitationRequest" ADD COLUMN     "waitlisted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isReviewer" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RequestVote" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "choice" "VoteChoice" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequestVote_requestId_voterId_key" ON "RequestVote"("requestId", "voterId");

-- AddForeignKey
ALTER TABLE "RequestVote" ADD CONSTRAINT "RequestVote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "InvitationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestVote" ADD CONSTRAINT "RequestVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

