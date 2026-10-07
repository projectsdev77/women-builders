import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { APP_NAME, appUrl } from '@/lib/config';
import { getSessionUser } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';
import { publicGatherings, publicNumbers } from '@/lib/services/public-site';
import { RequestInviteForm } from '@/components/public/request-invite-form';
import { PublicFooter, PublicHeader } from '@/components/public/site-chrome';

const DESCRIPTION = 'A curated network where women founders, operators, investors and builders find each other, get warm introductions and meet at small gatherings.';

export function generateMetadata(): Metadata {
  return {
    title: { absolute: `${APP_NAME}: where women who build find each other` },
    description: DESCRIPTION,
    alternates: { canonical: appUrl() },
    openGraph: { title: APP_NAME, description: DESCRIPTION, url: appUrl(), siteName: APP_NAME, type: 'website' },
  };
}

const ROLES = [
  { title: 'Founders', gets: 'Investors at your stage, operators who have scaled before, and builders to build with.', brings: 'The companies everyone here wants to back and join.' },
  { title: 'Operators', gets: 'Peers who have solved your problem already, and founders who need your experience.', brings: 'The know-how that turns a plan into a working company.' },
  { title: 'Investors', gets: 'Warm deal flow from founders vouched for by people you trust.', brings: 'Capital, judgment and the doors only you can open.' },
  { title: 'Builders', gets: 'Projects and teams worth your craft, and people who value it.', brings: 'The skills that make ideas real.' },
];
const BENEFITS = [
  { title: 'Warm introductions', text: 'Ask someone who knows you both to make the introduction. Nobody is ever told who said no.' },
  { title: 'The Capital view', text: 'Investors who are actively writing checks at your stage, and founders who are raising now.' },
  { title: 'Gatherings', text: 'Small dinners and working sessions, in person and online, so the network becomes real.' },
  { title: 'Matching on needs and offers', text: 'Tell us what you need and what you can offer. We suggest the people who fit, and say why.' },
];
const STEPS = ['Request an invitation', 'Our team reads it', 'You hear back within three weeks, either way', 'Join with your invitation'];

export default async function HomePage({ searchParams }: { searchParams: { deleted?: string; deactivated?: string } }) {
  const user = await getSessionUser();
  if (user && user.accountStatus === 'ACTIVE' && !searchParams.deleted) redirect(homeFor(user));
  const [numbers, gatherings] = await Promise.all([publicNumbers(), publicGatherings()]);

  return (
    <>
      <PublicHeader />
      <main id="main">
        {(searchParams.deleted || searchParams.deactivated) && (
          <div className="mx-auto max-w-5xl px-4 pt-6">
            <p role="status" className="rounded-md bg-green-50 p-3 text-green-900">
              {searchParams.deleted ? 'Your account has been deleted.' : 'Your account is deactivated. Log in any time to reactivate it.'}
            </p>
          </div>
        )}

        <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Where women who build find each other</h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-700">
            {APP_NAME} connects women founders, operators, investors and builders through warm introductions, small gatherings and matches based on what you need and what you can offer.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#request" className="inline-flex min-h-[44px] items-center rounded-md bg-brand-600 px-5 font-medium text-white">Request an invitation</Link>
            <Link href="/login" className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 bg-white px-5 font-medium">Log in</Link>
          </div>
        </section>

        <section aria-labelledby="who" className="bg-white py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 id="who" className="text-2xl font-semibold">Who it&apos;s for</h2>
            <p className="mt-2 text-gray-600">Four roles, equally important. Many members hold more than one.</p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ROLES.map((r) => (
                <li key={r.title} className="rounded-lg border border-gray-200 p-5">
                  <h3 className="font-semibold">{r.title}</h3>
                  <p className="mt-2 text-sm text-gray-700"><span className="font-medium">You get: </span>{r.gets}</p>
                  <p className="mt-2 text-sm text-gray-700"><span className="font-medium">You bring: </span>{r.brings}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="benefits" className="py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 id="benefits" className="text-2xl font-semibold">What membership gives you</h2>
            <ul className="mt-6 grid gap-6 sm:grid-cols-2">
              {BENEFITS.map((b) => (
                <li key={b.title}>
                  <h3 className="font-semibold">{b.title}</h3>
                  <p className="mt-1 text-gray-700">{b.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="how" className="bg-white py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 id="how" className="text-2xl font-semibold">How joining works</h2>
            <ol className="mt-6 grid gap-4 sm:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s} className="rounded-lg border border-gray-200 p-4">
                  <span className="text-sm font-semibold text-brand-700">{i + 1}</span>
                  <p className="mt-1 text-sm">{s}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-gray-600">One reply from a human, either way.</p>
          </div>
        </section>

        {numbers.length > 0 && (
          <section aria-labelledby="numbers" className="py-12">
            <div className="mx-auto max-w-5xl px-4">
              <h2 id="numbers" className="sr-only">The network today</h2>
              <dl className="flex flex-wrap gap-10">
                {numbers.map((n) => (
                  <div key={n.key}>
                    <dt className="text-sm text-gray-600">{n.label}</dt>
                    <dd className="text-3xl font-semibold">{n.value.toLocaleString('en-US')}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        {gatherings.length > 0 && (
          <section aria-labelledby="gatherings" className="py-12">
            <div className="mx-auto max-w-5xl px-4">
              <h2 id="gatherings" className="text-2xl font-semibold">Upcoming gatherings</h2>
              <ul className="mt-6 grid gap-4 sm:grid-cols-3">
                {gatherings.map((g) => (
                  <li key={g.id} className="rounded-lg border border-gray-200 bg-white p-5">
                    <p className="text-xs font-medium uppercase text-brand-700">{g.type}</p>
                    <h3 className="mt-1 font-semibold">{g.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{g.place} · {g.month}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-gray-600">Gatherings are for members.</p>
            </div>
          </section>
        )}

        <section id="request" aria-labelledby="request-heading" className="bg-white py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 id="request-heading" className="text-2xl font-semibold">Request an invitation</h2>
            <p className="mt-2 text-gray-600">Tell us a little about you. Our team reads every request and answers within three weeks.</p>
            <div className="mt-6"><RequestInviteForm compact /></div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
