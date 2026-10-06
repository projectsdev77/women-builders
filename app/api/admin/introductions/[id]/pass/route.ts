import { route } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { teamPass } from '@/lib/services/introductions';

export const POST = route(async (_req, { params }) => {
  const admin = await apiAdmin();
  await teamPass(admin.id, params.id!);
  return { ok: true };
});
