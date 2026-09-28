import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { blockMember, unblockMember } from '@/lib/services/safety';

export const POST = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  await blockMember(user.id, params.id!);
  return { ok: true };
});

export const DELETE = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  await unblockMember(user.id, params.id!);
  return { ok: true };
});
