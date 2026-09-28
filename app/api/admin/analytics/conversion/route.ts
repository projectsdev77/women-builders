import { route } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { dashboardMetrics, defaultRange } from '@/lib/services/admin/dashboard';
import { addDays, parseDateOnly } from '@/lib/services/admin/dates';

export const GET = route(async (req) => {
  await apiAdmin();
  const d = defaultRange();
  const from = parseDateOnly(req.nextUrl.searchParams.get('from')) ?? d.from;
  const toInclusive = parseDateOnly(req.nextUrl.searchParams.get('to'));
  const m = await dashboardMetrics({ from, to: toInclusive ? addDays(toInclusive, 1) : d.to });
  return { range: m.range, conversion: m.conversion };
});
