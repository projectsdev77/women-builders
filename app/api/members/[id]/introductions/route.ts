import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { introductionOptions } from '@/lib/services/introductions';
import { getMemberProfile } from '@/lib/services/profiles';

/** Who can introduce me to this member, and whether "Ask the team" is available (R3 F12). */
export const GET = route(async (_req, { params }) => {
  const user = await apiActiveUser();
  await getMemberProfile(user.id, params.id!); // 404 when blocked, inactive or unknown
  return introductionOptions(user.id, params.id!);
});
