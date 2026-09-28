import { route } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { listAuditLog } from '@/lib/services/admin/dashboard';

export const GET = route(async (req) => {
  await apiAdmin();
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? 1) || 1);
  return listAuditLog(page);
});
