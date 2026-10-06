-- CreateEnum
CREATE TYPE "GatheringType" AS ENUM ('DINNER', 'WORKING_SESSION', 'OTHER');

-- CreateEnum
CREATE TYPE "GatheringAudience" AS ENUM ('ALL', 'ROLES', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "SeatMode" AS ENUM ('CURATED', 'OPEN');

-- CreateEnum
CREATE TYPE "GatheringStatus" AS ENUM ('SCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SeatStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'WAITLISTED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Attendance" AS ENUM ('ATTENDED', 'NO_SHOW');

-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "gatheringsNearMe" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Gathering" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "GatheringType" NOT NULL,
    "description" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "timeZone" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "online" BOOLEAN NOT NULL DEFAULT false,
    "city" TEXT,
    "country" TEXT,
    "venue" TEXT,
    "capacity" INTEGER NOT NULL,
    "audience" "GatheringAudience" NOT NULL DEFAULT 'ALL',
    "audienceRoles" "RoleType"[],
    "seatMode" "SeatMode" NOT NULL DEFAULT 'CURATED',
    "requestsCloseAt" TIMESTAMP(3) NOT NULL,
    "teamHosted" BOOLEAN NOT NULL DEFAULT true,
    "showOnPublicSite" BOOLEAN NOT NULL DEFAULT false,
    "status" "GatheringStatus" NOT NULL DEFAULT 'SCHEDULED',
    "cancelReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nearbyNotifiedAt" TIMESTAMP(3),
    "reminder2dSentAt" TIMESTAMP(3),
    "reminderDaySentAt" TIMESTAMP(3),

    CONSTRAINT "Gathering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatheringHost" (
    "gatheringId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "GatheringHost_pkey" PRIMARY KEY ("gatheringId","userId")
);

-- CreateTable
CREATE TABLE "GatheringInvite" (
    "gatheringId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "GatheringInvite_pkey" PRIMARY KEY ("gatheringId","userId")
);

-- CreateTable
CREATE TABLE "SeatRequest" (
    "id" TEXT NOT NULL,
    "gatheringId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT,
    "status" "SeatStatus" NOT NULL DEFAULT 'REQUESTED',
    "lateCancel" BOOLEAN NOT NULL DEFAULT false,
    "attendance" "Attendance",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "SeatRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Gathering_status_startsAt_idx" ON "Gathering"("status", "startsAt");

-- CreateIndex
CREATE INDEX "SeatRequest_userId_status_idx" ON "SeatRequest"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SeatRequest_gatheringId_userId_key" ON "SeatRequest"("gatheringId", "userId");

-- AddForeignKey
ALTER TABLE "GatheringHost" ADD CONSTRAINT "GatheringHost_gatheringId_fkey" FOREIGN KEY ("gatheringId") REFERENCES "Gathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatheringHost" ADD CONSTRAINT "GatheringHost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatheringInvite" ADD CONSTRAINT "GatheringInvite_gatheringId_fkey" FOREIGN KEY ("gatheringId") REFERENCES "Gathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatheringInvite" ADD CONSTRAINT "GatheringInvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatRequest" ADD CONSTRAINT "SeatRequest_gatheringId_fkey" FOREIGN KEY ("gatheringId") REFERENCES "Gathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatRequest" ADD CONSTRAINT "SeatRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

