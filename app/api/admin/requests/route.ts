import { route } from '@/lib/api';
import { apiStaff } from '@/lib/auth/guards';
import { listInviteRequests } from '@/lib/services/invite-requests';

export const GET = route(async (req) => {
  const user = await apiStaff();
  const s = req.nextUrl.searchParams.get('status');
  const status = s === 'INVITED' || s === 'DECLINED' || s === 'SPAM' || s === 'ALL' || s === 'WAITLIST' ? s : 'OPEN';
  return { requests: await listInviteRequests(status, { id: user.id, isAdmin: user.isAdmin }) };
});
