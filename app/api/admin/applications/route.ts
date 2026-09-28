import { route } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { listApplications } from '@/lib/services/admin/members';

export const GET = route(async () => {
  await apiAdmin();
  return { applications: await listApplications() };
});
