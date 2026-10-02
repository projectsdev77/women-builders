import { z } from 'zod';
import { route, parseQuery } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { listMembers } from '@/lib/services/admin/members';

const memberListSchema = z.object({
  q: z.string().max(200).optional(),
  status: z.enum(['ALL', 'PENDING', 'ACTIVE', 'REJECTED', 'DEACTIVATED', 'DELETED']).optional().default('ALL'),
  admins: z.enum(['1']).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const GET = route(async (req) => {
  await apiAdmin();
  const q = parseQuery(req, memberListSchema);
  return listMembers({ ...q, admins: q.admins === '1' });
});
