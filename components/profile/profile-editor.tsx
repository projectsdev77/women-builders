'use client';

import { useMemo, useState } from 'react';
import { Button, Field, Input, Notice, Select, Textarea, cx } from '@/components/ui';
import { api, firstError, type ApiError } from '@/lib/client/api';
import {
  COMPLETENESS_THRESHOLD_CLIENT,
  FIELD_LABELS,
  OPTIONS,
  ROLE_LABELS,
  calculateCompleteness,
  missingFields,
  missingRequiredFields,
} from '@/lib/client/profile-rules';
import { TagInput } from './tag-input';

export type Role = 'FOUNDER' | 'OPERATOR' | 'INVESTOR' | 'BUILDER';
const ROLES: Role[] = ['FOUNDER', 'OPERATOR', 'INVESTOR', 'BUILDER'];

export interface EditableProfile {
  name: string;
  primaryRole: Role;
  secondaryRoles: Role[];
  headline: string;
  professionalBackground: string;
  expertiseAreas: string[];
  currentFocus: string;
  needs: string;
  offerings: string;
  location: string;
  linkedInUrl: string;
  websiteUrl: string;
  companyName: string;
  companyStage: string;
  industry: string;
  fundingStatus: string;
  functionalExpertise: string;
  seniorityLevel: string;
  operationalFocus: string[];
  investmentStages: string[];
  checkSizeMin: string;
  checkSizeMax: string;
  sectorPreferences: string[];
  technicalSkills: string[];
  projectTypes: string[];
  collaborationInterests: string;
  hiddenFields: string[];
}

export type Section = 'basics' | 'roles' | 'about' | 'needs' | 'privacy';

const HIDEABLE: Array<{ field: string; label: string }> = [
  { field: 'location', label: 'Location' },
  { field: 'professionalBackground', label: 'Professional background' },
  { field: 'currentFocus', label: 'Current focus' },
  { field: 'needs', label: 'What I need' },
  { field: 'offerings', label: 'What I can offer' },
  { field: 'companyName', label: 'Company name' },
  { field: 'fundingStatus', label: 'Funding status' },
  { field: 'checkSize', label: 'Check size' },
  { field: 'linkedInUrl', label: 'LinkedIn' },
  { field: 'websiteUrl', label: 'Website' },
];

function toPayload(p: EditableProfile) {
  const num = (v: string) => (v.trim() === '' ? null : Number(v));
  return { ...p, checkSizeMin: num(p.checkSizeMin), checkSizeMax: num(p.checkSizeMax) };
}

export function CompletenessMeter({ profile }: { profile: EditableProfile }) {
  const payload = toPayload(profile);
  const score = calculateCompleteness(payload);
  const missing = missingFields(payload);
  const required = missingRequiredFields(payload);
  const ready = score >= COMPLETENESS_THRESHOLD_CLIENT && required.length === 0;
  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-4" aria-live="polite">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Profile {score}% complete</span>
        <span className={ready ? 'text-green-700' : 'text-yellow-700'}>
          {ready ? '✓ You can send connection requests' : `Reach ${COMPLETENESS_THRESHOLD_CLIENT}% to connect`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness">
        <div className={cx('h-full', ready ? 'bg-green-600' : 'bg-yellow-500')} style={{ width: `${score}%` }} />
      </div>
      {required.length > 0 && (
        <p className="text-xs text-gray-600">
          Required for your role: {required.map((f) => FIELD_LABELS[f]).join(', ')}
        </p>
      )}
      {missing.length > 0 && (
        <p className="text-xs text-gray-500">Still empty: {missing.map((f) => FIELD_LABELS[f]).join(', ')}</p>
      )}
    </div>
  );
}

export function useProfileEditor(initial: EditableProfile) {
  const [profile, setProfile] = useState(initial);
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function save(): Promise<boolean> {
    setSaving(true);
    setError(null);
    const res = await api('/api/me/profile', { method: 'PATCH', body: toPayload(profile) });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    setSavedAt(new Date());
    return true;
  }

  return { profile, setProfile, error, saving, savedAt, save };
}

export function ProfileSections({
  profile,
  setProfile,
  error,
  sections,
}: {
  profile: EditableProfile;
  setProfile: (updater: (p: EditableProfile) => EditableProfile) => void;
  error: ApiError | null;
  sections: Section[];
}) {
  const fe = error?.fieldErrors ?? {};
  const set = <K extends keyof EditableProfile>(k: K, v: EditableProfile[K]) => setProfile((p) => ({ ...p, [k]: v }));
  const onText = (k: keyof EditableProfile) => (e: { target: { value: string } }) => set(k, e.target.value as never);
  const held = useMemo(() => new Set<Role>([profile.primaryRole, ...profile.secondaryRoles]), [profile.primaryRole, profile.secondaryRoles]);
  const err = (k: string) => firstError(fe, k);
  const aria = (k: string) => (fe[k] ? { 'aria-invalid': true, 'aria-describedby': `${k}-error` } : {});
  const hiddenBadge = (field: string) =>
    profile.hiddenFields.includes(field) ? <span className="ml-2 text-xs font-normal text-gray-500">(connections only)</span> : null;

  return (
    <div className="space-y-8">
      {sections.includes('basics') && (
        <section aria-labelledby="sec-basics" className="space-y-4">
          <h2 id="sec-basics" className="text-lg font-semibold">Basics</h2>
          <Field id="name" label="Full name" required error={err('name')}>
            <Input id="name" value={profile.name} onChange={onText('name')} {...aria('name')} />
          </Field>
          <Field id="headline" label="Headline" hint='e.g. "Founder of Loop · B2B payments"' error={err('headline')}>
            <Input id="headline" maxLength={120} value={profile.headline} onChange={onText('headline')} {...aria('headline')} />
          </Field>
          <Field id="primaryRole" label="Primary role" required error={err('primaryRole')}>
            <Select
              id="primaryRole"
              value={profile.primaryRole}
              onChange={(e) => {
                const r = e.target.value as Role;
                setProfile((p) => ({ ...p, primaryRole: r, secondaryRoles: p.secondaryRoles.filter((s) => s !== r) }));
              }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </Select>
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-800">Other roles you hold</legend>
            <div className="flex flex-wrap gap-3">
              {ROLES.filter((r) => r !== profile.primaryRole).map((r) => (
                <label key={r} className="inline-flex min-h-[44px] items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={profile.secondaryRoles.includes(r)}
                    onChange={(e) =>
                      set('secondaryRoles', e.target.checked ? [...profile.secondaryRoles, r] : profile.secondaryRoles.filter((s) => s !== r))
                    }
                  />
                  {ROLE_LABELS[r]}
                </label>
              ))}
            </div>
          </fieldset>
          <Field id="location" label="Location" hint="City, country" error={err('location')}>
            <Input id="location" value={profile.location} onChange={onText('location')} {...aria('location')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="linkedInUrl" label="LinkedIn profile" error={err('linkedInUrl')}>
              <Input id="linkedInUrl" inputMode="url" placeholder="https://www.linkedin.com/in/your-name" value={profile.linkedInUrl} onChange={onText('linkedInUrl')} {...aria('linkedInUrl')} />
            </Field>
            <Field id="websiteUrl" label="Website" error={err('websiteUrl')}>
              <Input id="websiteUrl" inputMode="url" placeholder="https://" value={profile.websiteUrl} onChange={onText('websiteUrl')} {...aria('websiteUrl')} />
            </Field>
          </div>
        </section>
      )}

      {sections.includes('roles') && (
        <section aria-labelledby="sec-roles" className="space-y-6">
          <h2 id="sec-roles" className="text-lg font-semibold">About your roles</h2>
          {held.has('FOUNDER') && (
            <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
              <legend className="px-1 font-medium">Founder</legend>
              <Field id="companyName" label="Company name" required={profile.primaryRole === 'FOUNDER'} error={err('companyName')}>
                <Input id="companyName" value={profile.companyName} onChange={onText('companyName')} {...aria('companyName')} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="companyStage" label="Company stage" required={profile.primaryRole === 'FOUNDER'} error={err('companyStage')}>
                  <Select id="companyStage" value={profile.companyStage} onChange={onText('companyStage')}>
                    <option value="">Choose…</option>
                    {OPTIONS.companyStage.map((o) => <option key={o}>{o}</option>)}
                  </Select>
                </Field>
                <Field id="fundingStatus" label="Funding status" error={err('fundingStatus')}>
                  <Select id="fundingStatus" value={profile.fundingStatus} onChange={onText('fundingStatus')}>
                    <option value="">Choose…</option>
                    {OPTIONS.fundingStatus.map((o) => <option key={o}>{o}</option>)}
                  </Select>
                </Field>
              </div>
              <Field id="industry" label="Industry" hint="e.g. Fintech, Climate, Health" error={err('industry')}>
                <Input id="industry" value={profile.industry} onChange={onText('industry')} />
              </Field>
            </fieldset>
          )}
          {held.has('OPERATOR') && (
            <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
              <legend className="px-1 font-medium">Operator</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="functionalExpertise" label="Function" required={profile.primaryRole === 'OPERATOR'} error={err('functionalExpertise')}>
                  <Select id="functionalExpertise" value={profile.functionalExpertise} onChange={onText('functionalExpertise')}>
                    <option value="">Choose…</option>
                    {OPTIONS.functionalExpertise.map((o) => <option key={o}>{o}</option>)}
                  </Select>
                </Field>
                <Field id="seniorityLevel" label="Seniority" required={profile.primaryRole === 'OPERATOR'} error={err('seniorityLevel')}>
                  <Select id="seniorityLevel" value={profile.seniorityLevel} onChange={onText('seniorityLevel')}>
                    <option value="">Choose…</option>
                    {OPTIONS.seniorityLevel.map((o) => <option key={o}>{o}</option>)}
                  </Select>
                </Field>
              </div>
              <Field id="operationalFocus" label="Areas of operational focus" hint="Press Enter or comma after each">
                <TagInput id="operationalFocus" value={profile.operationalFocus} onChange={(v) => set('operationalFocus', v)} placeholder="e.g. hiring, GTM, fundraising ops" />
              </Field>
            </fieldset>
          )}
          {held.has('INVESTOR') && (
            <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
              <legend className="px-1 font-medium">Investor</legend>
              <fieldset>
                <legend className="text-sm font-medium text-gray-800">
                  Stages you invest in{profile.primaryRole === 'INVESTOR' && <span className="text-red-600"> *</span>}
                </legend>
                <div className="mt-1 flex flex-wrap gap-3">
                  {OPTIONS.investmentStages.map((s) => (
                    <label key={s} className="inline-flex min-h-[44px] items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={profile.investmentStages.includes(s)}
                        onChange={(e) =>
                          set('investmentStages', e.target.checked ? [...profile.investmentStages, s] : profile.investmentStages.filter((x) => x !== s))
                        }
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="checkSizeMin" label="Minimum check (USD thousands)" required={profile.primaryRole === 'INVESTOR'} error={err('checkSizeMin')}>
                  <Input id="checkSizeMin" type="number" min={0} inputMode="numeric" value={profile.checkSizeMin} onChange={onText('checkSizeMin')} />
                </Field>
                <Field id="checkSizeMax" label="Maximum check (USD thousands)" required={profile.primaryRole === 'INVESTOR'} error={err('checkSizeMax')}>
                  <Input id="checkSizeMax" type="number" min={0} inputMode="numeric" value={profile.checkSizeMax} onChange={onText('checkSizeMax')} {...aria('checkSizeMax')} />
                </Field>
              </div>
              <Field id="sectorPreferences" label="Sectors" hint="Press Enter or comma after each">
                <TagInput id="sectorPreferences" value={profile.sectorPreferences} onChange={(v) => set('sectorPreferences', v)} placeholder="e.g. fintech, climate" />
              </Field>
            </fieldset>
          )}
          {held.has('BUILDER') && (
            <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
              <legend className="px-1 font-medium">Builder</legend>
              <Field id="technicalSkills" label="Technical skills" required={profile.primaryRole === 'BUILDER'} hint="Press Enter or comma after each" error={err('technicalSkills')}>
                <TagInput id="technicalSkills" max={30} value={profile.technicalSkills} onChange={(v) => set('technicalSkills', v)} placeholder="e.g. React, Python, ML" />
              </Field>
              <Field id="projectTypes" label="Project types" hint="Press Enter or comma after each">
                <TagInput id="projectTypes" value={profile.projectTypes} onChange={(v) => set('projectTypes', v)} placeholder="e.g. SaaS, mobile apps, open source" />
              </Field>
              <Field id="collaborationInterests" label="Collaboration interests" error={err('collaborationInterests')}>
                <Textarea id="collaborationInterests" rows={3} value={profile.collaborationInterests} onChange={onText('collaborationInterests')} />
              </Field>
            </fieldset>
          )}
        </section>
      )}

      {sections.includes('about') && (
        <section aria-labelledby="sec-about" className="space-y-4">
          <h2 id="sec-about" className="text-lg font-semibold">Expertise and focus</h2>
          <Field id="expertiseAreas" label="Expertise areas" hint="Up to 20. Press Enter or comma after each" error={err('expertiseAreas')}>
            <TagInput id="expertiseAreas" value={profile.expertiseAreas} onChange={(v) => set('expertiseAreas', v)} placeholder="e.g. fundraising, B2B sales, AI" />
          </Field>
          <Field id="professionalBackground" label="Professional background" error={err('professionalBackground')}>
            <Textarea id="professionalBackground" rows={5} maxLength={5000} value={profile.professionalBackground} onChange={onText('professionalBackground')} />
          </Field>
          <Field id="currentFocus" label="What you're focused on right now" error={err('currentFocus')}>
            <Textarea id="currentFocus" rows={3} maxLength={1000} value={profile.currentFocus} onChange={onText('currentFocus')} />
          </Field>
        </section>
      )}

      {sections.includes('needs') && (
        <section aria-labelledby="sec-needs" className="space-y-4">
          <h2 id="sec-needs" className="text-lg font-semibold">Needs and offerings</h2>
          <p className="text-sm text-gray-600">These power your recommendations. Be specific: &quot;intros to seed fintech investors&quot; beats &quot;help&quot;.</p>
          <Field id="needs" label="What you need" error={err('needs')}>
            <Textarea id="needs" rows={3} maxLength={2000} value={profile.needs} onChange={onText('needs')} />
          </Field>
          <Field id="offerings" label="What you can offer" error={err('offerings')}>
            <Textarea id="offerings" rows={3} maxLength={2000} value={profile.offerings} onChange={onText('offerings')} />
          </Field>
        </section>
      )}

      {sections.includes('privacy') && (
        <section aria-labelledby="sec-privacy" className="space-y-3">
          <h2 id="sec-privacy" className="text-lg font-semibold">Privacy</h2>
          <p className="text-sm text-gray-600">
            Your name, headline, roles and expertise are always visible to members. Choose which other details only your connections can see. Your email is never shown.
          </p>
          <div className="grid gap-1 sm:grid-cols-2">
            {HIDEABLE.map(({ field, label }) => (
              <label key={field} className="inline-flex min-h-[44px] items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={profile.hiddenFields.includes(field)}
                  onChange={(e) =>
                    set('hiddenFields', e.target.checked ? [...profile.hiddenFields, field] : profile.hiddenFields.filter((f) => f !== field))
                  }
                />
                Only connections see: {label}
                {hiddenBadge(field)}
              </label>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function SaveStatus({ saving, savedAt, error }: { saving: boolean; savedAt: Date | null; error: ApiError | null }) {
  if (error) return <Notice tone="error">{error.message}</Notice>;
  if (saving) return <p className="text-sm text-gray-500" aria-live="polite">Saving…</p>;
  if (savedAt) return <p className="text-sm text-green-700" aria-live="polite">Saved</p>;
  return null;
}

export { Button };
