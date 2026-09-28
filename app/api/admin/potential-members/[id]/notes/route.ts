import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { addProspectNote } from '@/lib/services/admin/prospects';

export const POST = route(async (req, { params }) => {
  const admin = await apiAdmin();
  const { content } = await parseBody(req, z.object({ content: z.string().max(5000) }));
  return addProspectNote(admin.id, params.id!, content);
});
