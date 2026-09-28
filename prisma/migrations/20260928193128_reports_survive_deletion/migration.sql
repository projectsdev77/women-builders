-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_reportedUserId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_reporterId_fkey";

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "reportedUserName" TEXT,
ALTER COLUMN "reporterId" DROP NOT NULL,
ALTER COLUMN "reportedUserId" DROP NOT NULL;

-- Backfill the name snapshot, then require it
UPDATE "Report" r SET "reportedUserName" = u."name" FROM "User" u WHERE u."id" = r."reportedUserId";
UPDATE "Report" SET "reportedUserName" = 'Unknown member' WHERE "reportedUserName" IS NULL;
ALTER TABLE "Report" ALTER COLUMN "reportedUserName" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
