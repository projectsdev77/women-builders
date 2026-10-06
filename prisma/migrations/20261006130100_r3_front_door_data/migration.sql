-- R3 front door: move legacy self-registration data into the invitation-request pipeline.

-- 1. "Applied" is retired; those prospects asked to join, which is now "Requested".
UPDATE "PotentialMember" SET "outreachStatus" = 'REQUESTED' WHERE "outreachStatus" = 'APPLIED';
UPDATE "PotentialMemberStatusChange" SET "toStatus" = 'REQUESTED' WHERE "toStatus" = 'APPLIED';
UPDATE "PotentialMemberStatusChange" SET "fromStatus" = 'REQUESTED' WHERE "fromStatus" = 'APPLIED';

-- 2. Pending applicants become open requests (with a prospect record); their unused accounts are removed.
CREATE TEMP TABLE legacy_pending AS
SELECT u."id" AS user_id, u."email", u."name", u."applicationStatement", u."createdAt",
       COALESCE(p."primaryRole", 'FOUNDER'::"RoleType") AS primary_role, p."city", p."country"
FROM "User" u LEFT JOIN "Profile" p ON p."userId" = u."id"
WHERE u."accountStatus" = 'PENDING';

INSERT INTO "PotentialMember" ("id", "email", "name", "role", "discoverySource", "lawfulBasisNote", "outreachStatus", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, lp."email", lp."name", initcap(lp.primary_role::text), 'Application (before invitation-only)',
       'Applied to join on ' || to_char(lp."createdAt", 'YYYY-MM-DD') || '; moved to invitation requests in R3.',
       'REQUESTED', lp."createdAt", now()
FROM legacy_pending lp
WHERE NOT EXISTS (SELECT 1 FROM "PotentialMember" pm WHERE pm."email" = lp."email");

UPDATE "PotentialMember" pm SET "outreachStatus" = 'REQUESTED', "userId" = NULL, "updatedAt" = now()
FROM legacy_pending lp
WHERE pm."email" = lp."email" AND pm."outreachStatus" <> 'DO_NOT_CONTACT';

INSERT INTO "InvitationRequest" ("id", "potentialMemberId", "name", "email", "primaryRole", "city", "country", "statement", "consentAt", "status", "slaStartsAt", "createdAt")
SELECT gen_random_uuid()::text, pm."id", lp."name", lp."email", lp.primary_role, lp."city", COALESCE(lp."country", ''),
       COALESCE(lp."applicationStatement", ''), lp."createdAt", 'OPEN', now(), lp."createdAt"
FROM legacy_pending lp JOIN "PotentialMember" pm ON pm."email" = lp."email"
WHERE pm."outreachStatus" <> 'DO_NOT_CONTACT';

INSERT INTO "PotentialMemberStatusChange" ("id", "potentialMemberId", "fromStatus", "toStatus", "createdAt")
SELECT gen_random_uuid()::text, pm."id", NULL, 'REQUESTED', now()
FROM legacy_pending lp JOIN "PotentialMember" pm ON pm."email" = lp."email"
WHERE pm."outreachStatus" = 'REQUESTED';

DELETE FROM "User" WHERE "id" IN (SELECT user_id FROM legacy_pending);

-- 3. Rejected applicants become "Not a fit" prospects; their accounts are removed.
CREATE TEMP TABLE legacy_rejected AS
SELECT u."id" AS user_id, u."email", u."name", u."createdAt" FROM "User" u WHERE u."accountStatus" = 'REJECTED';

INSERT INTO "PotentialMember" ("id", "email", "name", "discoverySource", "outreachStatus", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, lr."email", lr."name", 'Application (before invitation-only)', 'NOT_A_FIT', lr."createdAt", now()
FROM legacy_rejected lr
WHERE NOT EXISTS (SELECT 1 FROM "PotentialMember" pm WHERE pm."email" = lr."email");

UPDATE "PotentialMember" pm SET "userId" = NULL FROM legacy_rejected lr WHERE pm."email" = lr."email";

DELETE FROM "User" WHERE "id" IN (SELECT user_id FROM legacy_rejected);

DROP TABLE legacy_pending;
DROP TABLE legacy_rejected;
