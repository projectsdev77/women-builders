import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { setAdmin } from '@/lib/services/admin/members';

export const PUT = route(async (req, { params }) => {
  const admin = await apiAdmin();
  const { isAdmin } = await parseBody(req, z.object({ isAdmin: z.boolean() }));
  await setAdmin(admin.id, params.id!, isAdmin);
  return { ok: true };
});
