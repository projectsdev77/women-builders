import { route } from '@/lib/api';
import { apiUser, homeFor } from '@/lib/auth/guards';

export const GET = route(async () => {
  const user = await apiUser();
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    accountStatus: user.accountStatus,
    emailVerified: !!user.emailVerifiedAt,
    home: homeFor(user),
  };
});
