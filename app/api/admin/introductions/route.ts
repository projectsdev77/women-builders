import { route } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { listTeamIntroductions } from '@/lib/services/introductions';

export const GET = route(async (req) => {
  await apiAdmin();
  const status = req.nextUrl.searchParams.get('status') === 'HANDLED' ? 'HANDLED' : 'ASKED';
  return { introductions: await listTeamIntroductions(status) };
});
