import { route } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { findDuplicates } from '@/lib/services/admin/prospects';
import { canonicalLinkedInUrl, normalizeEmail } from '@/lib/validation/common';

/** Live duplicate check while typing an email or LinkedIn URL (Req 6.4). */
export const GET = route(async (req) => {
  await apiAdmin();
  const email = req.nextUrl.searchParams.get('email');
  const linkedIn = req.nextUrl.searchParams.get('linkedInUrl');
  return findDuplicates(prisma, email ? normalizeEmail(email) : null, linkedIn ? canonicalLinkedInUrl(linkedIn) : null);
});
