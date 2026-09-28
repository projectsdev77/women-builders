import { route } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { listReports } from '@/lib/services/admin/reports';

export const GET = route(async (req) => {
  await apiAdmin();
  const s = req.nextUrl.searchParams.get('status');
  const status = s === 'RESOLVED' || s === 'DISMISSED' || s === 'ALL' ? s : 'OPEN';
  return { reports: await listReports(status) };
});
