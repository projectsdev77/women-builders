import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { setReviewer } from '@/lib/services/admin/members';

export const POST = route(async (req, { params }) => {
  const admin = await apiAdmin();
  const { isReviewer } = await parseBody(req, z.object({ isReviewer: z.boolean() }));
  await setReviewer(admin.id, params.id!, isReviewer);
  return { ok: true };
});
