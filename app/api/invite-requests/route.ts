import { route, parseBody, clientIp } from '@/lib/api';
import { inviteRequestSchema, submitInviteRequest } from '@/lib/services/invite-requests';
import { kickOutbox } from '@/lib/email/outbox';
import { log } from '@/lib/log';

/** Public "Request an invitation" form (R3 F3). Always answers the same way. */
export const POST = route(async (req, { requestId }) => {
  const input = await parseBody(req, inviteRequestSchema);
  const outcome = await submitInviteRequest(input, clientIp(req));
  log.info('invite request', { requestId, outcome });
  kickOutbox();
  return { ok: true };
});
