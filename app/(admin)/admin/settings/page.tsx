import type { Metadata } from 'next';
import { pageAdmin } from '@/lib/auth/guards';
import { getSiteSettings } from '@/lib/services/site-settings';
import { rawPublicNumbers } from '@/lib/services/public-site';
import { SettingsForm } from './settings-form';

export const metadata: Metadata = { title: 'Site settings' };

export default async function SiteSettingsPage() {
  await pageAdmin();
  const [settings, current] = await Promise.all([getSiteSettings(), rawPublicNumbers()]);
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Site settings</h1>
      <p className="text-sm text-gray-600">Every change is recorded in the audit log.</p>
      <SettingsForm initial={settings} current={current} />
    </div>
  );
}
