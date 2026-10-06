import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { kickOutbox } from '@/lib/email/outbox';
import { messageAttendees } from '@/lib/services/admin/gatherings';

const schema = z.object({ subject: z.string().trim().min(2).max(120), body: z.string().trim().min(2).max(5000) });

export const POST = route(async (req, { params }) => {
  const admin = await apiAdmin();
  const { subject, body } = await parseBody(req, schema);
  const res = await messageAttendees(admin.id, params.id!, subject, body);
  kickOutbox();
  return res;
});
