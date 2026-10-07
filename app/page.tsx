import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { APP_NAME, appUrl } from '@/lib/config';
import { getSessionUser } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';
import { publicGatherings, publicNumbers } from '@/lib/services/public-site';
import { getSiteSettings } from '@/lib/services/site-settings';
import { publicQuotes, publicShowcase } from '@/lib/services/showcase';
import { PublicFooter, PublicHeader } from '@/components/public/site-chrome';
import { RequestPanel } from '@/components/public/request-panel';
import { ROLE_COLOR } from '@/components/ui/roles';
import { buttonClass } from '@/components/ui';
import { ArrowLeftRight, CalendarHeart, CircleDollarSign, Handshake, Mail } from 'lucide-react';

export const dynamic = 'force-dynamic';

const DESCRIPTION =
  'A small, invitation-only network where women founders, operators, investors and builders find each other through warm introductions, small dinners and matches on needs and offers.';

export function generateMetadata(): Metadata {
  return {
    title: { absolute: `${APP_NAME}: where women who build find each other` },
    description: DESCRIPTION,
    alternates: { canonical: appUrl() },
    openGraph: { title: APP_NAME, description: DESCRIPTION, url: appUrl(), siteName: APP_NAME, type: 'website' },
  };
}

const ROLES = [
  { key: 'FOUNDER', name: 'Founders', tilt: '-1.2deg', get: 'Investors at your stage, operators who have scaled before, and builders to build with.', bring: 'The companies everyone here wants to back and join.' },
  { key: 'OPERATOR', name: 'Operators', tilt: '0.8deg', get: 'Peers who have solved your problem already, and founders who need your experience.', bring: 'The know-how that turns a plan into a working company.' },
  { key: 'INVESTOR', name: 'Investors', tilt: '-0.6deg', get: 'Warm deal flow from founders vouched for by people you trust.', bring: 'Capital, judgment and the doors only you can open.' },
  { key: 'BUILDER', name: 'Builders', tilt: '1.4deg', get: 'Projects and teams worth your craft, and people who value it.', bring: 'The skills that make ideas real.' },
] as const;

const BENEFITS = [
  { icon: Handshake, bg: '#F4B8C8', title: 'Warm introductions', body: 'Ask someone who knows you both to make the introduction. Nobody is ever told who said no.' },
  { icon: CircleDollarSign, bg: '#F2D774', title: 'The Capital view', body: 'Investors who are actively writing checks at your stage, and founders who are raising now.' },
  { icon: CalendarHeart, bg: '#D9CCF5', title: 'Gatherings', body: 'Small dinners and working sessions, in person and online, so the network becomes real.' },
  { icon: ArrowLeftRight, bg: '#C9D9A8', title: 'Matching on needs and offers', body: 'Tell us what you need and what you can offer. We suggest the people who fit, and say why.' },
];

const STEPS = [
  ['Request an invitation', 'A short form. Five minutes.', '#F4B8C8'],
  ['Our team reads it', 'Every request, by a person.', '#D9CCF5'],
  ['You hear back', 'Within three weeks, either way.', '#F2D774'],
  ['Join with your invitation', 'Your link opens a short Join page.', '#C9D9A8'],
] as const;

const NUMBER_COLORS = ['#F4B8C8', '#D9CCF5', '#F2D774', '#C9D9A8', '#F4B8C8'];
const TILTS = ['-6deg', '4deg', '-3deg', '5deg', '-4deg'];
const MARQUEE = [['Warm introductions', '#F4B8C8'], ['Small dinners', '#D9CCF5'], ['Needs, matched to offers', '#F2D774'], ['Private by default', '#C9D9A8']] as const;

const SECTION = 'mx-auto max-w-[1240px] px-[clamp(20px,4vw,48px)]';
const SECTION_Y = 'py-[clamp(64px,9vw,120px)]';
const H2 = 'text-[clamp(40px,5.4vw,68px)] leading-none tracking-[-0.02em]';

function Collage() {
  return (
    <div aria-hidden className="relative min-h-[420px] sm:min-h-[520px]">
      <div className="absolute inset-[6%_4%_4%_10%] rounded-[36px]" style={{ background: 'repeating-linear-gradient(90deg,#F4B8C8 0 14px,#FBE3EA 14px 28px)' }} />
      <div className="absolute left-[2%] top-[4%] w-[62%] -rotate-3 rounded-3xl bg-white p-5 shadow-collage">
        <p className="font-mono text-[11px] uppercase tracking-[.1em] text-ink-subtle">A table for 12</p>
        <p className="mt-2 font-display text-[26px] leading-tight">Dinner</p>
        <p className="mt-1 text-[15px] text-ink-muted">Small enough that everyone gets to talk.</p>
        <p className="mt-3 inline-block rounded-full bg-cream px-3 py-1 text-[12.5px] font-bold">Seats chosen for a good mix</p>
      </div>
      <div className="absolute right-[0%] top-[30%] w-[58%] rotate-2 rounded-3xl bg-builder p-5 shadow-collage">
        <p className="font-mono text-[11px] uppercase tracking-[.1em]">What you need</p>
        <p className="mt-2 text-[17px] leading-snug"><s className="opacity-60">help</s> → <b>intros to seed fintech investors</b></p>
        <p className="mt-2 text-[14px]">Be specific. We match on it.</p>
      </div>
      <div className="absolute bottom-[9%] right-[3%] w-[62%] -rotate-2 rounded-3xl bg-white p-5 shadow-collage">
        <p className="font-mono text-[11px] uppercase tracking-[.1em] text-ink-subtle">A warm introduction</p>
        <div className="mt-3 flex items-center gap-4">
          <span className="flex">
            <i className="h-9 w-7 rounded-full bg-founder" />
            <i className="-ml-3 h-9 w-7 rounded-full bg-operator" />
            <i className="-ml-3 h-9 w-7 rounded-full bg-investor" />
          </span>
          <p className="text-[15px] font-semibold leading-snug">You, someone you both know, and her.</p>
        </div>
        <p className="mt-3 text-[13.5px] text-ink-subtle">Nobody is ever told who said no.</p>
      </div>
      <div className="absolute bottom-[4%] left-[0%] flex h-[130px] w-[130px] items-center justify-center rounded-full bg-investor">
        <svg viewBox="0 0 130 130" className="absolute inset-0 animate-spin-slow" role="presentation">
          <defs><path id="wb-circle" d="M65,65 m-47,0 a47,47 0 1,1 94,0 a47,47 0 1,1 -94,0" /></defs>
          <text fontFamily="Geist Mono, monospace" fontSize="11" letterSpacing="2.4" fill="#1F3D2B"><textPath href="#wb-circle">BY INVITATION · BY INVITATION · </textPath></text>
        </svg>
        <Mail size={26} strokeWidth={1.75} />
      </div>
    </div>
  );
}

export default async function HomePage({ searchParams }: { searchParams: { deleted?: string; deactivated?: string } }) {
  const user = await getSessionUser();
  if (user && user.accountStatus === 'ACTIVE' && !searchParams.deleted) redirect(homeFor(user));
  const [numbers, gatherings, settings, featured, quotes] = await Promise.all([publicNumbers(), publicGatherings(), getSiteSettings(), publicShowcase(), publicQuotes()]);
  const waitlist = settings.applicationsOpen ? null : { nextReview: settings.nextReview };

  return (
    <>
      <PublicHeader waitlist={!!waitlist} />
      <main id="main">
        {(searchParams.deleted || searchParams.deactivated) && (
          <div className={`${SECTION} pt-6`}>
            <p role="status" className="rounded-2xl bg-success-bg px-4 py-3 font-medium text-success">
              {searchParams.deleted ? 'Your account has been deleted.' : 'Your account is deactivated. Log in any time to reactivate it.'}
            </p>
          </div>
        )}

        <section className={`${SECTION} grid items-center gap-12 py-[clamp(40px,6vw,88px)] lg:grid-cols-[1.15fr_1fr]`}>
          <div className="space-y-7">
            <ul className="flex flex-wrap gap-2" aria-label="Who it's for">
              {ROLES.map((r) => (
                <li key={r.key} className={`${ROLE_COLOR[r.key].solidClass} rounded-full px-4 py-1.5 text-[13px] font-bold`}>{r.name}</li>
              ))}
            </ul>
            <h1 className="text-[clamp(48px,7.2vw,96px)] leading-[0.98] tracking-[-0.03em] [text-wrap:balance]">Where women who build find each other.</h1>
            <p className="max-w-[560px] text-[clamp(17px,1.6vw,21px)] leading-relaxed text-ink-muted">
              A small, invitation-only network. We connect you through warm introductions, small dinners and matches based on what you need and what you can offer.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="#request" className={buttonClass('primary', 'lg')}>{waitlist ? 'Join the waitlist' : 'Request an invitation'}</Link>
              <Link href="/login" className={buttonClass('secondary', 'lg')}>Log in</Link>
            </div>
            <p className="text-[15px] text-ink-subtle">One reply from a human, either way.</p>
          </div>
          <Collage />
        </section>

        <div aria-hidden className="overflow-hidden bg-forest py-[18px] text-cream">
          <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-display text-[26px]">
            {[0, 1, 2, 3].flatMap((rep) =>
              MARQUEE.flatMap(([text, color]) => [
                <span key={`${rep}-${text}`}>{text}</span>,
                <span key={`${rep}-${text}-s`} style={{ color }}>✦</span>,
              ]),
            )}
          </div>
        </div>

        <section aria-labelledby="who" className={`${SECTION} ${SECTION_Y} flex flex-col gap-10`}>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 id="who" className={`${H2} max-w-[640px]`}>Four roles. Equally important.</h2>
            <p className="max-w-[360px] text-[17px] leading-relaxed text-ink-muted">Many members hold more than one. A founder who angel-invests is both.</p>
          </div>
          <ul className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr))]">
            {ROLES.map((r, i) => (
              <li key={r.key}>
                <article className={`${ROLE_COLOR[r.key].solidClass} flex min-h-[380px] flex-col gap-[22px] rounded-[28px] px-6 py-7`} style={{ transform: `rotate(${r.tilt})` }}>
                  <div className="flex items-start justify-between">
                    <h3 className="text-[36px] leading-none">{r.name}</h3>
                    <span className="font-mono text-[12px]">0{i + 1}</span>
                  </div>
                  <div aria-hidden className="h-2.5 rounded-full opacity-35" style={{ background: 'repeating-linear-gradient(90deg,#1F3D2B 0 2px,transparent 2px 8px)' }} />
                  <div className="flex flex-col gap-1.5">
                    <span className="font-mono text-[11px] uppercase tracking-[.1em]">You get</span>
                    <span className="text-[16px] leading-normal">{r.get}</span>
                  </div>
                  <div className="mt-auto flex flex-col gap-1.5 rounded-2xl bg-white/55 p-3.5">
                    <span className="font-mono text-[11px] uppercase tracking-[.1em]">You bring</span>
                    <span className="text-[16px] leading-normal">{r.bring}</span>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="benefits" className="rounded-t-[48px] bg-white">
          <div className={`${SECTION} ${SECTION_Y} flex flex-col gap-12`}>
            <h2 id="benefits" className={`${H2} max-w-[720px]`}>What membership gives you.</h2>
            <ul>
              {BENEFITS.map((b) => {
                const Icon = b.icon;
                return (
                  <li key={b.title} className="grid items-start gap-[clamp(16px,3vw,40px)] border-t-[1.5px] border-forest py-8 [grid-template-columns:minmax(64px,120px)_minmax(0,1.2fr)_minmax(0,1fr)] max-sm:[grid-template-columns:56px_1fr]">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: b.bg }}><Icon size={24} strokeWidth={1.75} /></span>
                    <h3 className="text-[clamp(26px,3vw,38px)] leading-[1.1]">{b.title}</h3>
                    <p className="text-[17px] leading-relaxed text-ink-muted max-sm:col-span-2">{b.body}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section aria-labelledby="how" className="bg-forest text-cream">
          <div className={`${SECTION} ${SECTION_Y} flex flex-col gap-12`}>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 id="how" className={H2}>How joining works.</h2>
              <span className="-rotate-3 rounded-full bg-investor px-[18px] py-2.5 text-[15px] font-bold text-forest">One reply from a human, either way.</span>
            </div>
            <ol className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr))]">
              {STEPS.map(([title, body, color], i) => (
                <li key={title} className="flex min-h-[220px] flex-col gap-7 rounded-3xl border-[1.5px] border-cream/30 p-6">
                  <span className="font-display text-[56px] leading-none" style={{ color }}>{i + 1}</span>
                  <div className="mt-auto flex flex-col gap-2">
                    <span className="font-display text-[24px] leading-[1.15]">{title}</span>
                    <span className="text-[15px] leading-normal text-[#D6E0D2]">{body}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {numbers.length > 0 && (
          <section aria-labelledby="numbers" className={`${SECTION} py-[clamp(56px,8vw,104px)]`}>
            <h2 id="numbers" className="sr-only">The network today</h2>
            {numbers.length === 1 ? (
              <p className="flex flex-wrap items-center justify-center gap-[clamp(24px,4vw,48px)] text-center font-display text-[clamp(40px,5vw,64px)] leading-none">
                {numbers[0]!.key === 'countries' && <span>Members in</span>}
                <span className="flex h-[clamp(140px,16vw,190px)] w-[clamp(140px,16vw,190px)] -rotate-6 items-center justify-center rounded-full text-[clamp(64px,8vw,104px)]" style={{ background: NUMBER_COLORS[0] }}>
                  {numbers[0]!.value.toLocaleString('en-US')}
                </span>
                <span>{numbers[0]!.label.toLowerCase()}.</span>
              </p>
            ) : (
              <dl className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
                {numbers.map((n, i) => (
                  <div key={n.key} className="flex flex-col items-center gap-3.5 text-center">
                    <dd className="order-1 flex h-40 w-40 items-center justify-center rounded-full font-display text-[60px]" style={{ background: NUMBER_COLORS[i], transform: `rotate(${TILTS[i]})` }}>{n.value.toLocaleString('en-US')}</dd>
                    <dt className="order-2 text-[17px] font-semibold">{n.label}</dt>
                  </div>
                ))}
              </dl>
            )}
          </section>
        )}

        {gatherings.length > 0 && (
          <section aria-labelledby="gatherings" className={`${SECTION} pb-[clamp(64px,9vw,120px)]`}>
            <div className="grid items-center gap-10 rounded-[40px] bg-butter-tint p-[clamp(28px,5vw,64px)] md:grid-cols-2">
              <div className="flex flex-col gap-[18px]">
                <h2 id="gatherings" className="text-[clamp(36px,4.6vw,56px)] leading-[1.02]">Where the network becomes real.</h2>
                <p className="max-w-[440px] text-[17px] leading-relaxed text-ink-muted">Dinners for 12 and working sessions for 20, in person and online. Seats are limited so everyone gets to talk.</p>
              </div>
              <ul className="flex flex-col gap-3">
                {gatherings.map((g, i) => (
                  <li key={g.id} className="flex items-center gap-[18px] rounded-[22px] bg-white px-[22px] py-5" style={{ transform: `rotate(${i % 2 ? '1deg' : '-1.2deg'})` }}>
                    <span className={`flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-[18px] ${g.type === 'Dinner' ? 'bg-founder' : g.type === 'Working session' ? 'bg-operator' : 'bg-builder'}`}>
                      <span className="font-mono text-[11px] uppercase tracking-[.1em]">{g.month.split(' ')[0]!.slice(0, 3)}</span>
                      <CalendarHeart size={22} strokeWidth={1.75} />
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="text-[13px] font-bold text-ink-subtle">{g.type} · {g.place}</span>
                      <span className="font-display text-[24px] leading-[1.15]">{g.title}</span>
                    </span>
                  </li>
                ))}
                <li className="list-none pl-1 text-[13px] text-ink-subtle">Members see dates, venues and who&apos;s coming.</li>
              </ul>
            </div>
          </section>
        )}

        {(featured.length > 0 || quotes.length > 0) && (
          <section aria-labelledby="members" className={`${SECTION} flex flex-col gap-9 pb-[clamp(64px,9vw,120px)]`}>
            <h2 id="members" className={H2}>Some of the members.</h2>
            <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
              {featured.map((m, i) => (
                <figure key={m.name} className="flex flex-col gap-3.5 rounded-[22px] bg-white p-3.5 pb-5 shadow-[0_18px_40px_rgba(31,61,43,.10)]" style={{ transform: `rotate(${['-1.4deg', '1deg', '-0.6deg'][i % 3]})` }}>
                  {m.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- opted-in showcase photo, served by our own route
                    <img src={m.photoUrl} alt="" className="aspect-square w-full rounded-[14px] object-cover" />
                  ) : (
                    <div aria-hidden className={`${ROLE_COLOR[m.roleKey].solidClass} flex aspect-square items-center justify-center rounded-[14px] font-display text-[88px]`}>
                      {m.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </div>
                  )}
                  <figcaption className="flex flex-col gap-1 px-1.5">
                    <b className="text-[18px]">{m.name}</b>
                    <span className="text-[15px] leading-snug">{m.headline}</span>
                    <span className="text-[13px] font-semibold text-ink-subtle">{[m.role, m.city].filter(Boolean).join(' · ')}</span>
                  </figcaption>
                </figure>
              ))}
              {quotes.slice(0, 2).map((q) => (
                <blockquote key={q.id} className="flex min-w-0 flex-col gap-5 rounded-[28px] bg-operator p-[clamp(28px,4vw,40px)] md:col-span-2">
                  <span aria-hidden className="h-9 font-display text-[80px] leading-[.5]">“</span>
                  <p className="font-display text-[clamp(28px,3.4vw,42px)] leading-[1.15] [text-wrap:balance]">{q.text}</p>
                  <span className="text-[15px] font-bold">{q.name}{q.role ? `, ${q.role}` : ''}</span>
                </blockquote>
              ))}
            </div>
          </section>
        )}

        <section id="request" aria-labelledby="request-heading" className={`${SECTION} pb-[clamp(64px,9vw,120px)]`}>
          <RequestPanel waitlist={waitlist} />
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
