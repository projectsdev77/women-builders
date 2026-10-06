import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { gatheringCalendar } from '@/lib/services/gatherings';

export const GET = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  const { filename, body } = await gatheringCalendar(user.id, params.id!);
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
