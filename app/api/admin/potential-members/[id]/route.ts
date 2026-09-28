import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { getProspect, prospectUpdateSchema, updateProspect } from '@/lib/services/admin/prospects';

export const GET = route(async (_req, { params }) => {
  await apiAdmin();
  return getProspect(params.id!);
});

export const PATCH = route(async (req, { params }) => {
  const admin = await apiAdmin();
  return updateProspect(admin.id, params.id!, await parseBody(req, prospectUpdateSchema));
});
