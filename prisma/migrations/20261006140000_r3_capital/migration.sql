-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "investingCheckins" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "investingCheckSentAt" TIMESTAMP(3);

