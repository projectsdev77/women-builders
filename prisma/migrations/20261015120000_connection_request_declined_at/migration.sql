-- Remember declines after the sender withdraws, so resending stays blocked until the original expiry.
ALTER TABLE "ConnectionRequest" ADD COLUMN "declinedAt" TIMESTAMP(3);
UPDATE "ConnectionRequest" SET "declinedAt" = "respondedAt" WHERE "status" = 'DECLINED';
