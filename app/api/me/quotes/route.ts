import { route, parseBody } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { quoteSchema, submitQuote } from '@/lib/services/showcase';

export const POST = route(async (req) => {
  const user = await apiActiveUser();
  const { text } = await parseBody(req, quoteSchema);
  return submitQuote(user.id, text);
});
