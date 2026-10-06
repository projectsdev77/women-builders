import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { kickOutbox } from '@/lib/email/outbox';
import { decideSeats } from '@/lib/services/admin/gatherings';

const schema = z.object({ seatIds: z.array(z.string()).min(1).max(200), decision: z.enum(['CONFIRMED', 'WAITLISTED', 'DECLINED']) });

/** Confirm, waitlist or decline one or many seat requests (bulk confirm). */
export const POST = route(async (req) => {
  const admin = await apiAdmin();
  const { seatIds, decision } = await parseBody(req, schema);
  const res = await decideSeats(admin.id, seatIds, decision);
  kickOutbox();
  return res;
});
