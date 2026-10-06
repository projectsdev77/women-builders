import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { markAttendance } from '@/lib/services/admin/gatherings';

const schema = z.object({
  entries: z.array(z.object({ seatId: z.string(), attendance: z.enum(['ATTENDED', 'NO_SHOW']).nullable() })).max(500),
});

export const POST = route(async (req, { params }) => {
  const admin = await apiAdmin();
  const { entries } = await parseBody(req, schema);
  await markAttendance(admin.id, params.id!, entries);
  return { ok: true };
});
