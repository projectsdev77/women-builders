import { route, parseBody, parseQuery } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { createProspect, listProspects, prospectCreateSchema, prospectListSchema } from '@/lib/services/admin/prospects';

export const GET = route(async (req) => {
  const admin = await apiAdmin();
  return listProspects(admin.id, parseQuery(req, prospectListSchema));
});

export const POST = route(async (req) => {
  const admin = await apiAdmin();
  return createProspect(admin.id, await parseBody(req, prospectCreateSchema));
});
