import { route, parseBody } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { getSiteSettings, settingsPatchSchema, updateSiteSettings } from '@/lib/services/site-settings';

export const GET = route(async () => {
  await apiAdmin();
  return getSiteSettings();
});

export const PATCH = route(async (req) => {
  const admin = await apiAdmin();
  return updateSiteSettings(admin.id, await parseBody(req, settingsPatchSchema));
});
