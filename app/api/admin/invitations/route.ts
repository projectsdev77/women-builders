import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { createInvitation, listInvitations } from '@/lib/services/admin/invitations';
import { kickOutbox } from '@/lib/email/outbox';

export const GET = route(async () => {
  await apiAdmin();
  return { invitations: await listInvitations() };
});

export const POST = route(async (req) => {
  const admin = await apiAdmin();
  const body = await parseBody(
    req,
    z
      .object({ email: z.string().trim().email('Enter a valid email address').optional(), potentialMemberId: z.string().max(50).optional() })
      .refine((v) => v.email || v.potentialMemberId, { message: 'Enter an email address', path: ['email'] }),
  );
  const result = await createInvitation(admin.id, body);
  kickOutbox();
  return result;
});
