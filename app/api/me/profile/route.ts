import { route, parseBody } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { getOwnProfile, profileUpdateSchema, updateOwnProfile } from '@/lib/services/profiles';
import { canSendConnectionRequests, missingFields, missingRequiredFields } from '@/lib/services/profile-fields';

async function view(userId: string) {
  const p = await getOwnProfile(userId);
  const { user, ...profile } = p;
  return {
    name: user.name,
    email: user.email,
    profile,
    completeness: {
      score: profile.completenessScore,
      missing: missingFields(profile),
      missingRequired: missingRequiredFields(profile),
      canSendConnectionRequests: canSendConnectionRequests(profile),
    },
  };
}

export const GET = route(async () => {
  const user = await apiActiveUser();
  return view(user.id);
});

export const PATCH = route(async (req) => {
  const user = await apiActiveUser();
  const input = await parseBody(req, profileUpdateSchema);
  await updateOwnProfile(user.id, input);
  return view(user.id);
});
