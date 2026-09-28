import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { resolveReport } from '@/lib/services/admin/reports';

export const POST = route(async (req, { params }) => {
  const admin = await apiAdmin();
  const { status, note } = await parseBody(req, z.object({ status: z.enum(['RESOLVED', 'DISMISSED']), note: z.string().max(2000).optional() }));
  await resolveReport(admin.id, params.id!, status, note);
  return { ok: true };
});
