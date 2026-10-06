import type { Metadata } from 'next';
import { pageAdmin } from '@/lib/auth/guards';
import { appTimezone } from '@/lib/config';
import { countryOptions } from '@/lib/countries';
import { GatheringForm } from '@/components/admin/gathering-form';

export const metadata: Metadata = { title: 'New gathering' };

export default async function NewGatheringPage() {
  await pageAdmin();
  const tz = appTimezone();
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">New gathering</h1>
      <GatheringForm
        timeZones={Intl.supportedValuesOf('timeZone')}
        countries={countryOptions()}
        initial={{
          title: '', type: 'DINNER', description: '', startsAtLocal: '', timeZone: tz, durationMinutes: 150, online: false,
          city: '', country: '', venue: '', capacity: 12, audience: 'ALL', audienceRoles: [], seatMode: 'CURATED',
          requestsCloseAtLocal: '', teamHosted: true, hosts: [], invites: [], showOnPublicSite: false,
        }}
      />
    </div>
  );
}
