-- CreateEnum
CREATE TYPE "WinType" AS ENUM ('INVESTMENT', 'HIRE', 'ADVISOR', 'CUSTOMER', 'COFOUNDER', 'SPEAKING', 'OTHER');

-- CreateEnum
CREATE TYPE "WinSource" AS ENUM ('INTRODUCTION', 'CONNECTION', 'GATHERING', 'OTHER');

-- CreateEnum
CREATE TYPE "WinVisibility" AS ENUM ('ANONYMOUS', 'MEMBERS', 'QUOTABLE');

-- CreateEnum
CREATE TYPE "WinParticipantStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED');

-- CreateEnum
CREATE TYPE "WinPromptKind" AS ENUM ('INTRODUCTION', 'GATHERING');

-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "winConfirmations" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "winPrompts" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Win" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "WinType" NOT NULL,
    "source" "WinSource" NOT NULL DEFAULT 'OTHER',
    "introductionId" TEXT,
    "gatheringId" TEXT,
    "outsideNetwork" BOOLEAN NOT NULL DEFAULT false,
    "month" TEXT NOT NULL,
    "amountK" INTEGER,
    "story" TEXT,
    "visibility" "WinVisibility" NOT NULL DEFAULT 'ANONYMOUS',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Win_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WinParticipant" (
    "winId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "WinParticipantStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "WinParticipant_pkey" PRIMARY KEY ("winId","userId")
);

-- CreateTable
CREATE TABLE "WinPrompt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "WinPromptKind" NOT NULL,
    "refId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WinPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Win_authorId_createdAt_idx" ON "Win"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "Win_createdAt_idx" ON "Win"("createdAt");

-- CreateIndex
CREATE INDEX "WinParticipant_userId_status_idx" ON "WinParticipant"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WinPrompt_userId_kind_refId_key" ON "WinPrompt"("userId", "kind", "refId");

-- AddForeignKey
ALTER TABLE "Win" ADD CONSTRAINT "Win_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Win" ADD CONSTRAINT "Win_introductionId_fkey" FOREIGN KEY ("introductionId") REFERENCES "Introduction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Win" ADD CONSTRAINT "Win_gatheringId_fkey" FOREIGN KEY ("gatheringId") REFERENCES "Gathering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WinParticipant" ADD CONSTRAINT "WinParticipant_winId_fkey" FOREIGN KEY ("winId") REFERENCES "Win"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WinParticipant" ADD CONSTRAINT "WinParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WinPrompt" ADD CONSTRAINT "WinPrompt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

