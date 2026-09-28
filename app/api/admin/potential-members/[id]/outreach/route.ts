import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { logOutreachAttempt, outreachAttemptSchema } from '@/lib/services/admin/prospects';

export const POST = route(async (req, { params }) => {
  const admin = await apiAdmin();
  return logOutreachAttempt(admin.id, params.id!, await parseBody(req, outreachAttemptSchema));
});
