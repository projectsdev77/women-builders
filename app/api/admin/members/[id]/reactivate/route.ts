import { route } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { reactivateMember } from '@/lib/services/admin/members';

export const POST = route(async (_req, { params }) => {
  const admin = await apiAdmin();
  await reactivateMember(admin.id, params.id!);
  return { ok: true };
});
