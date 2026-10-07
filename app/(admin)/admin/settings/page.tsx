import type { Metadata } from 'next';
import { pageAdmin } from '@/lib/auth/guards';
import { getSiteSettings } from '@/lib/services/site-settings';
import { rawPublicNumbers } from '@/lib/services/public-site';
import { SettingsForm } from './settings-form';
import { ShowcasePicker } from './showcase-picker';
import { listQuotes, showcaseCandidates } from '@/lib/services/showcase';
import { Card, EmptyState } from '@/components/ui';
import { ActionButton } from '@/components/admin/action-button';

export const metadata: Metadata = { title: 'Site settings' };

export default async function SiteSettingsPage() {
  await pageAdmin();
  const [settings, current, candidates, pending, approved] = await Promise.all([
    getSiteSettings(),
    rawPublicNumbers(),
    showcaseCandidates(),
    listQuotes('PENDING'),
    listQuotes('APPROVED'),
  ]);
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Site settings</h1>
      <p className="text-sm text-gray-600">Every change is recorded in the audit log.</p>
      <SettingsForm initial={settings} current={current} />

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Homepage showcase</h2>
        <p className="text-sm text-gray-600">Only members who chose &ldquo;Feature me on the public website&rdquo; can be picked. The homepage shows name, photo, headline, role and city.</p>
        <ShowcasePicker candidates={candidates} selected={settings.showcase} />
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Quotes waiting for approval</h2>
        {pending.length === 0 ? <EmptyState title="No quotes waiting" /> : (
          <ul className="space-y-3">
            {pending.map((q) => (
              <li key={q.id} className="space-y-2 rounded-md border border-gray-200 p-3">
                <blockquote className="text-sm">“{q.text}”</blockquote>
                <p className="text-xs text-gray-600">{q.author.name}{q.author.role ? `, ${q.author.role}` : ''}{q.fromWin ? ' · from a win marked quotable' : ''}</p>
                <div className="flex gap-2">
                  <ActionButton label="Approve" variant="primary" path={`/api/admin/quotes/${q.id}`} body={{ approve: true }} />
                  <ActionButton label="Don't use" variant="ghost" path={`/api/admin/quotes/${q.id}`} body={{ approve: false }} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {approved.length > 0 && (
          <>
            <h3 className="pt-2 font-medium">On the website</h3>
            <ul className="space-y-2">
              {approved.map((q) => (
                <li key={q.id} className="flex flex-wrap items-start justify-between gap-2 text-sm">
                  <span className="min-w-0 flex-1">“{q.text}” <span className="text-xs text-gray-600">— {q.author.name}</span></span>
                  <ActionButton label="Remove" variant="ghost" path={`/api/admin/quotes/${q.id}`} body={{ approve: false }} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
