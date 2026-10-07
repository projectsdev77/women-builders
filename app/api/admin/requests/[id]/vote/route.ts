import { route, parseBody } from '@/lib/api';
import { apiStaff } from '@/lib/auth/guards';
import { kickOutbox } from '@/lib/email/outbox';
import { castVote, voteSchema } from '@/lib/services/invite-requests';

/** Admins and member reviewers vote Approve or Decline (R3 F21). */
export const POST = route(async (req, { params }) => {
  const user = await apiStaff();
  const { choice, note } = await parseBody(req, voteSchema);
  const outcome = await castVote(user, params.id!, choice, note);
  kickOutbox();
  return { outcome };
});
