import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { dismissRecommendation, undoDismissRecommendation } from '@/lib/services/discovery';

export const POST = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  await dismissRecommendation(user.id, params.id!);
  return { ok: true };
});

/** The toast's Undo. */
export const DELETE = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  await undoDismissRecommendation(user.id, params.id!);
  return { ok: true };
});
