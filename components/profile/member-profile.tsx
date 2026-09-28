import type { ReactNode } from 'react';
import type { MemberView } from '@/lib/services/privacy';
import { ROLE_LABELS } from '@/lib/services/profile-fields';
import { Avatar, Badge, Card } from '@/components/ui';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      <div className="whitespace-pre-line text-gray-800">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:gap-2">
      <dt className="w-44 shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{Array.isArray(value) ? value.join(', ') : value}</dd>
    </div>
  );
}

export function formatCheckSize(min: number | null, max: number | null) {
  if (min == null || max == null) return null;
  const f = (k: number) => (k >= 1000 ? `$${(k / 1000).toLocaleString()}M` : `$${k}K`);
  return `${f(min)}–${f(max)}`;
}

export function RoleBadges({ primary, secondary }: { primary: MemberView['primaryRole']; secondary: MemberView['secondaryRoles'] }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Badge tone="brand">{ROLE_LABELS[primary]}</Badge>
      {secondary.map((r) => (
        <Badge key={r}>{ROLE_LABELS[r]}</Badge>
      ))}
    </div>
  );
}

export function MemberProfile({ member, actions }: { member: MemberView; actions?: ReactNode }) {
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={member.name} size={72} />
          <div className="flex-1 space-y-2">
            <h1 className="text-2xl font-semibold">{member.name}</h1>
            {member.headline && <p className="text-gray-700">{member.headline}</p>}
            <RoleBadges primary={member.primaryRole} secondary={member.secondaryRoles} />
            <p className="text-sm text-gray-500">
              {member.location && <span>{member.location} · </span>}
              {member.memberSince && <span>Member since {new Date(member.memberSince).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>}
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              {member.linkedInUrl && <a className="text-brand-700 underline" href={member.linkedInUrl} target="_blank" rel="noopener noreferrer nofollow">LinkedIn</a>}
              {member.websiteUrl && <a className="text-brand-700 underline" href={member.websiteUrl} target="_blank" rel="noopener noreferrer nofollow">Website</a>}
            </div>
          </div>
          {actions && <div className="flex flex-col gap-2 sm:items-end">{actions}</div>}
        </div>
        {member.hasHiddenFields && (
          <p className="mt-4 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
            🔒 {member.name.split(' ')[0]} shares some details only with connections.
          </p>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-5 p-6 md:col-span-2">
          {member.currentFocus && <Block title="Current focus">{member.currentFocus}</Block>}
          {member.needs && <Block title="Looking for">{member.needs}</Block>}
          {member.offerings && <Block title="Can help with">{member.offerings}</Block>}
          {member.professionalBackground && <Block title="Background">{member.professionalBackground}</Block>}
          {!member.currentFocus && !member.needs && !member.offerings && !member.professionalBackground && (
            <p className="text-sm text-gray-500">No details shared yet.</p>
          )}
        </Card>
        <div className="space-y-4">
          {member.expertiseAreas.length > 0 && (
            <Card className="space-y-2 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Expertise</h2>
              <div className="flex flex-wrap gap-1">
                {member.expertiseAreas.map((t) => <Badge key={t}>{t}</Badge>)}
              </div>
            </Card>
          )}
          {member.founder && (
            <Card className="space-y-2 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Founder</h2>
              <dl className="space-y-1">
                <Row label="Company" value={member.founder.companyName} />
                <Row label="Stage" value={member.founder.companyStage} />
                <Row label="Industry" value={member.founder.industry} />
                <Row label="Funding" value={member.founder.fundingStatus} />
              </dl>
            </Card>
          )}
          {member.operator && (
            <Card className="space-y-2 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Operator</h2>
              <dl className="space-y-1">
                <Row label="Function" value={member.operator.functionalExpertise} />
                <Row label="Seniority" value={member.operator.seniorityLevel} />
                <Row label="Focus areas" value={member.operator.operationalFocus} />
              </dl>
            </Card>
          )}
          {member.investor && (
            <Card className="space-y-2 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Investor</h2>
              <dl className="space-y-1">
                <Row label="Stages" value={member.investor.investmentStages} />
                <Row label="Check size" value={formatCheckSize(member.investor.checkSizeMin, member.investor.checkSizeMax)} />
                <Row label="Sectors" value={member.investor.sectorPreferences} />
              </dl>
            </Card>
          )}
          {member.builder && (
            <Card className="space-y-2 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Builder</h2>
              <dl className="space-y-1">
                <Row label="Skills" value={member.builder.technicalSkills} />
                <Row label="Project types" value={member.builder.projectTypes} />
                <Row label="Collaboration" value={member.builder.collaborationInterests} />
              </dl>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
