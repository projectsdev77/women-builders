-- CreateEnum
CREATE TYPE "InviteRequestStatus" AS ENUM ('OPEN', 'INVITED', 'DECLINED', 'SPAM');

-- AlterEnum
ALTER TYPE "OutreachStatus" ADD VALUE 'REQUESTED';

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "charterAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "charterNoticeVersion" INTEGER,
ADD COLUMN     "charterVersion" INTEGER;

-- CreateTable
CREATE TABLE "InvitationRequest" (
    "id" TEXT NOT NULL,
    "potentialMemberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "linkedInUrl" TEXT,
    "primaryRole" "RoleType" NOT NULL,
    "city" TEXT,
    "country" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "referrer" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "status" "InviteRequestStatus" NOT NULL DEFAULT 'OPEN',
    "slaStartsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicSubmission" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvitationRequest_status_slaStartsAt_idx" ON "InvitationRequest"("status", "slaStartsAt");

-- CreateIndex
CREATE INDEX "InvitationRequest_potentialMemberId_idx" ON "InvitationRequest"("potentialMemberId");

-- CreateIndex
CREATE INDEX "PublicSubmission_kind_ipHash_createdAt_idx" ON "PublicSubmission"("kind", "ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "PublicSubmission_kind_email_createdAt_idx" ON "PublicSubmission"("kind", "email", "createdAt");

-- AddForeignKey
ALTER TABLE "InvitationRequest" ADD CONSTRAINT "InvitationRequest_potentialMemberId_fkey" FOREIGN KEY ("potentialMemberId") REFERENCES "PotentialMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

