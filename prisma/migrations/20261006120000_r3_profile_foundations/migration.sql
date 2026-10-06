-- AlterEnum
ALTER TYPE "ReportReason" ADD VALUE 'INAPPROPRIATE_PHOTO';

-- AlterTable
-- Keep existing free-text locations: "location" becomes "city" (country starts empty; members are prompted).
ALTER TABLE "Profile" RENAME COLUMN "location" TO "city";

ALTER TABLE "Profile"
ADD COLUMN     "country" TEXT,
ADD COLUMN     "currentlyInvesting" BOOLEAN,
ADD COLUMN     "firmName" TEXT,
ADD COLUMN     "investingConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "investorType" TEXT,
ADD COLUMN     "lastCheckMonth" TEXT,
ADD COLUMN     "leadsRounds" TEXT,
ADD COLUMN     "openTo" TEXT[],
ADD COLUMN     "photoKey" TEXT,
ADD COLUMN     "photoVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "raiseAmount" INTEGER;

-- CreateIndex
CREATE INDEX "Profile_country_idx" ON "Profile"("country");

