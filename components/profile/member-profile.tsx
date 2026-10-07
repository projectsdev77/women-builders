import type { ReactNode } from 'react';
import type { MemberView } from '@/lib/services/privacy';
import { ROLE_LABELS } from '@/lib/services/profile-fields';
import { CornerUpRight, Lock } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { ROLE_COLOR } from '@/components/ui/roles';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1">
      <h2 className="font-mono text-[12px] uppercase tracking-[.1em] text-ink-subtle">{title}</h2>
      <div className="whitespace-pre-line text-[16px] leading-relaxed">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="grid grid-cols-[96px_1fr] gap-2 text-[14px]">
      <dt className="text-ink-subtle">{label}</dt>
      <dd className="font-medium">{Array.isArray(value) ? value.join(', ') : value}</dd>
    </div>
  );
}

/** USD thousands → "$250K" / "$1.5M". */
export function formatThousands(k: number) {
  return k >= 1000 ? `$${(k / 1000).toLocaleString('en-US')}M` : `$${k}K`;
}

export function formatCheckSize(min: number | null, max: number | null) {
  if (min == null || max == null) return null;
  return `${formatThousands(min)}–${formatThousands(max)}`;
}

export function formatMonth(ym: string | null) {
  if (!ym) return null;
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, 15)).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const INVESTING_LABEL = { active: 'Currently investing', unconfirmed: 'Status not confirmed', paused: 'Paused' } as const;

export function InvestingBadge({ status }: { status: 'active' | 'unconfirmed' | 'paused' | null }) {
  if (!status) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[12.5px] font-bold ${status === 'active' ? 'bg-success-bg text-success' : 'border border-line bg-cream text-ink-muted'}`}>
      {status === 'active' && <span aria-hidden className="h-2 w-2 rounded-full bg-success" />}
      {INVESTING_LABEL[status]}
    </span>
  );
}

/** Primary role: solid fill, weight 700. Other roles: tint fill, 1px border in the role colour. */
export function RoleBadges({ primary, secondary }: { primary: MemberView['primaryRole']; secondary: MemberView['secondaryRoles'] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`${ROLE_COLOR[primary].solidClass} rounded-full px-3 py-1 text-[12.5px] font-bold`}>{ROLE_LABELS[primary]}</span>
      {secondary.map((r) => (
        <span key={r} className={`${ROLE_COLOR[r].tintClass} ${ROLE_COLOR[r].borderClass} rounded-full border px-3 py-1 text-[12.5px] font-semibold`}>{ROLE_LABELS[r]}</span>
      ))}
    </div>
  );
}

function SideCard({ role, title, children }: { role?: MemberView['primaryRole']; title: string; children: ReactNode }) {
  return (
    <section
      className="space-y-3 rounded-[24px] border border-line-soft bg-white p-5"
      style={role ? { borderTop: `8px solid ${ROLE_COLOR[role].solid}` } : undefined}
    >
      <h2 className="font-mono text-[12px] uppercase tracking-[.1em] text-ink-subtle">{title}</h2>
      {children}
    </section>
  );
}

export function MemberProfile({ member, actions }: { member: MemberView; actions?: ReactNode }) {
  const first = member.name.split(' ')[0];
  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-[32px] bg-white">
        <div className="grid lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:p-8">
            <div className="shrink-0 p-2"><Avatar name={member.name} size={128} photoUrl={member.photoUrlLarge} role={member.primaryRole} ring /></div>
            <div className="min-w-0 flex-1 space-y-3">
              <h1 className="!text-[clamp(36px,4vw,52px)]">{member.name}</h1>
              {member.headline && <p className="text-[18px] leading-snug text-ink-muted">{member.headline}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <RoleBadges primary={member.primaryRole} secondary={member.secondaryRoles} />
                {member.preferIntroductions && (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-forest px-3 py-1 text-[12.5px] font-bold"><CornerUpRight size={13} strokeWidth={2.25} /> Prefers introductions</span>
                )}
              </div>
              <p className="text-[14px] text-ink-subtle">
                {member.location && <span>{member.location}</span>}
                {member.location && member.memberSince && ' · '}
                {member.memberSince && <span>Member since {new Date(member.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>}
              </p>
              {member.openTo.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-bold">Open to</span>
                  {member.openTo.map((o) => <span key={o} className="rounded-full bg-builder-tint px-3 py-1 text-[13px] font-semibold">{o}</span>)}
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-[15px] font-semibold">
                {member.linkedInUrl && <a className="underline underline-offset-4" href={member.linkedInUrl} target="_blank" rel="noopener noreferrer nofollow">LinkedIn</a>}
                {member.websiteUrl && <a className="underline underline-offset-4" href={member.websiteUrl} target="_blank" rel="noopener noreferrer nofollow">Website</a>}
              </div>
            </div>
          </div>
          {actions && (
            <div className="flex flex-col gap-2.5 p-6 sm:p-8" style={{ background: ROLE_COLOR[member.primaryRole].tint }}>
              {actions}
            </div>
          )}
        </div>
        {member.hasHiddenFields && (
          <p className="flex items-center gap-2 border-t border-line bg-cream px-6 py-3 text-[14px] text-ink-muted sm:px-8">
            <Lock size={15} strokeWidth={1.75} aria-hidden /> {first} shares some details only with connections.
          </p>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {(member.needs || member.offerings) && (
            <div className="grid gap-4 md:grid-cols-2">
              {member.needs && (
                <section className="-rotate-1 rounded-[24px] bg-butter-tint p-6">
                  <h2 className="font-mono text-[12px] uppercase tracking-[.1em] text-ink-muted">Looking for</h2>
                  <p className="mt-2 whitespace-pre-line font-display text-[22px] leading-snug">{member.needs}</p>
                </section>
              )}
              {member.offerings && (
                <section className="rotate-1 rounded-[24px] bg-builder-tint p-6">
                  <h2 className="font-mono text-[12px] uppercase tracking-[.1em] text-ink-muted">Can help with</h2>
                  <p className="mt-2 whitespace-pre-line font-display text-[22px] leading-snug">{member.offerings}</p>
                </section>
              )}
            </div>
          )}
          {(member.currentFocus || member.professionalBackground) && (
            <section className="space-y-5 rounded-[24px] border border-line-soft bg-white p-6">
              {member.currentFocus && <Block title="Current focus">{member.currentFocus}</Block>}
              {member.professionalBackground && <Block title="Background">{member.professionalBackground}</Block>}
            </section>
          )}
          {!member.currentFocus && !member.needs && !member.offerings && !member.professionalBackground && (
            <p className="rounded-[24px] bg-white p-6 text-[15px] text-ink-subtle">No details shared yet.</p>
          )}
        </div>
        <div className="space-y-4">
          {member.expertiseAreas.length > 0 && (
            <SideCard title="Expertise">
              <ul className="flex flex-wrap gap-1.5">{member.expertiseAreas.map((t) => <li key={t} className="rounded-chip bg-cream px-2.5 py-1 text-[13px]">{t}</li>)}</ul>
            </SideCard>
          )}
          {member.founder && (
            <SideCard role="FOUNDER" title="Founder">
              <dl className="space-y-1.5">
                <Row label="Company" value={member.founder.companyName} />
                <Row label="Stage" value={member.founder.companyStage} />
                <Row label="Industry" value={member.founder.industry} />
                <Row label="Funding" value={member.founder.fundingStatus} />
                <Row label="Raising" value={member.founder.raiseAmount != null ? formatThousands(member.founder.raiseAmount) : null} />
              </dl>
            </SideCard>
          )}
          {member.operator && (
            <SideCard role="OPERATOR" title="Operator">
              <dl className="space-y-1.5">
                <Row label="Function" value={member.operator.functionalExpertise} />
                <Row label="Seniority" value={member.operator.seniorityLevel} />
                <Row label="Focus areas" value={member.operator.operationalFocus} />
              </dl>
            </SideCard>
          )}
          {member.investor && (
            <SideCard role="INVESTOR" title="Investor">
              <InvestingBadge status={member.investor.investing} />
              <dl className="space-y-1.5">
                <Row label="Type" value={member.investor.investorType} />
                <Row label="Firm" value={member.investor.firmName} />
                <Row label="Leads or follows" value={member.investor.leadsRounds} />
                <Row label="Last check" value={formatMonth(member.investor.lastCheckMonth)} />
                <Row label="Stages" value={member.investor.investmentStages} />
                <Row label="Check size" value={formatCheckSize(member.investor.checkSizeMin, member.investor.checkSizeMax)} />
                <Row label="Sectors" value={member.investor.sectorPreferences} />
              </dl>
            </SideCard>
          )}
          {member.builder && (
            <SideCard role="BUILDER" title="Builder">
              <dl className="space-y-1.5">
                <Row label="Skills" value={member.builder.technicalSkills} />
                <Row label="Project types" value={member.builder.projectTypes} />
                <Row label="Collaboration" value={member.builder.collaborationInterests} />
              </dl>
            </SideCard>
          )}
        </div>
      </div>
    </div>
  );
}
