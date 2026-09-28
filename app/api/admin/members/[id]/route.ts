import { route } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { getMemberDetail } from '@/lib/services/admin/members';

export const GET = route(async (_req, { params }) => {
  await apiAdmin();
  return getMemberDetail(params.id!);
});
