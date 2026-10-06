import { route, parseBody } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { kickOutbox } from '@/lib/email/outbox';
import { cancelSeat, requestSeat, seatSchema } from '@/lib/services/gatherings';

/** Request a seat (curated) or take one (open). */
export const POST = route(async (req, { params }) => {
  const user = await apiActiveUser();
  const { note } = await parseBody(req, seatSchema);
  const res = await requestSeat(user.id, params.id!, note);
  kickOutbox();
  return res;
});

export const DELETE = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  const res = await cancelSeat(user.id, params.id!);
  kickOutbox();
  return res;
});
