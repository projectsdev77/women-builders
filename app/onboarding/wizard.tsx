'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import {
  CompletenessMeter,
  ProfileSections,
  SaveStatus,
  useProfileEditor,
  type EditableProfile,
  type Section,
} from '@/components/profile/profile-editor';
import { api } from '@/lib/client/api';

const STEPS: Array<{ title: string; intro: string; sections: Section[] }> = [
  { title: 'The basics', intro: 'How members will recognize you.', sections: ['basics'] },
  { title: 'Your roles', intro: 'Details that help the right people find you.', sections: ['roles'] },
  { title: 'Expertise and focus', intro: 'What you know and what you’re working on.', sections: ['about'] },
  { title: 'Needs and offerings', intro: 'This is what powers your recommendations.', sections: ['needs', 'privacy'] },
];

export function OnboardingWizard({ initial }: { initial: EditableProfile }) {
  const router = useRouter();
  const editor = useProfileEditor(initial);
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;
  const last = step === STEPS.length - 1;

  async function next() {
    if (!(await editor.save())) return;
    if (!last) {
      setStep(step + 1);
      window.scrollTo(0, 0);
      return;
    }
    const res = await api<{ redirectTo: string }>('/api/me/onboarding', { body: {} });
    if (res.ok) {
      router.replace(res.data.redirectTo);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Step {step + 1} of {STEPS.length}</p>
        <h1 className="text-2xl font-semibold">{current.title}</h1>
        <p className="text-gray-600">{current.intro}</p>
      </div>
      <ol className="flex gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.title} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brand-600' : 'bg-gray-200'}`}>
            <span className="sr-only">{s.title}{i < step ? ' (done)' : i === step ? ' (current)' : ''}</span>
          </li>
        ))}
      </ol>
      <CompletenessMeter profile={editor.profile} />
      <Card className="p-6">
        <ProfileSections profile={editor.profile} setProfile={editor.setProfile} error={editor.error} sections={current.sections} />
      </Card>
      <SaveStatus saving={editor.saving} savedAt={null} error={editor.error} />
      <div className="flex justify-between">
        <Button variant="secondary" disabled={step === 0 || editor.saving} onClick={() => setStep(step - 1)}>
          Back
        </Button>
        <div className="flex gap-2">
          {last && (
            <Button variant="ghost" disabled={editor.saving} onClick={next}>
              Skip for now
            </Button>
          )}
          <Button disabled={editor.saving} onClick={next}>
            {last ? 'Finish' : 'Save and continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
