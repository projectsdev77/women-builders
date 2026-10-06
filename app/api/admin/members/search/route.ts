import { route } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { searchMembersForPicker } from '@/lib/services/admin/gatherings';

export const GET = route(async (req) => {
  await apiAdmin();
  return { members: await searchMembersForPicker(req.nextUrl.searchParams.get('q') ?? '') };
});
