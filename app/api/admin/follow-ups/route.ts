import { route } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { followUpQueue } from '@/lib/services/admin/prospects';

export const GET = route(async (req) => {
  await apiAdmin();
  const days = Math.min(30, Math.max(0, Number(req.nextUrl.searchParams.get('withinDays') ?? 0) || 0));
  return { followUps: await followUpQueue({ withinDays: days }) };
});
