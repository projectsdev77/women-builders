import { route } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { revokeInvitation } from '@/lib/services/admin/invitations';

export const DELETE = route(async (_req, { params }) => {
  const admin = await apiAdmin();
  await revokeInvitation(admin.id, params.id!);
  return { ok: true };
});
