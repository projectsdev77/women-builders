import { route, parseBody } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { kickOutbox } from '@/lib/email/outbox';
import { askIntroduction, askSchema, listIntroductions, type IntroTab } from '@/lib/services/introductions';

export const GET = route(async (req) => {
  const user = await apiActiveUser();
  const t = req.nextUrl.searchParams.get('tab');
  const tab: IntroTab = t === 'asked' || t === 'for-me' ? t : 'mine';
  return { introductions: await listIntroductions(user.id, tab) };
});

export const POST = route(async (req) => {
  const user = await apiActiveUser();
  const res = await askIntroduction(user.id, await parseBody(req, askSchema));
  kickOutbox();
  return res;
});
