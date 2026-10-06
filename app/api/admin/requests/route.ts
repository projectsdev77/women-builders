import { route } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { listInviteRequests } from '@/lib/services/invite-requests';

export const GET = route(async (req) => {
  await apiAdmin();
  const s = req.nextUrl.searchParams.get('status');
  const status = s === 'INVITED' || s === 'DECLINED' || s === 'SPAM' || s === 'ALL' ? s : 'OPEN';
  return { requests: await listInviteRequests(status) };
});
