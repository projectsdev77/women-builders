-- CreateEnum
CREATE TYPE "IntroductionStatus" AS ENUM ('ASKED', 'FORWARDED', 'ACCEPTED', 'DECLINED_BY_INTRODUCER', 'DECLINED_BY_TARGET', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "introductions" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "allowIntroRequests" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "preferIntroductions" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Introduction" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "introducerId" TEXT,
    "viaTeam" BOOLEAN NOT NULL DEFAULT false,
    "targetId" TEXT NOT NULL,
    "noteToIntroducer" TEXT NOT NULL,
    "noteToTarget" TEXT,
    "introducerNote" TEXT,
    "status" "IntroductionStatus" NOT NULL DEFAULT 'ASKED',
    "introducerDueAt" TIMESTAMP(3) NOT NULL,
    "targetDueAt" TIMESTAMP(3),
    "forwardedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Introduction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Introduction_requesterId_status_idx" ON "Introduction"("requesterId", "status");

-- CreateIndex
CREATE INDEX "Introduction_introducerId_status_idx" ON "Introduction"("introducerId", "status");

-- CreateIndex
CREATE INDEX "Introduction_targetId_status_idx" ON "Introduction"("targetId", "status");

-- CreateIndex
CREATE INDEX "Introduction_viaTeam_status_idx" ON "Introduction"("viaTeam", "status");

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_introducerId_fkey" FOREIGN KEY ("introducerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

