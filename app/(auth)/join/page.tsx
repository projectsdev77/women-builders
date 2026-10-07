import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Lock, Mail, TimerOff } from 'lucide-react';
import { getSessionUser } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';
import { previewInvitation } from '@/lib/services/accounts';
import { buttonClass } from '@/components/ui';
import { AuthShell, AuthTitle } from '@/components/public/auth-shell';
import { JoinForm } from './join-form';

export const metadata: Metadata = { title: 'Join Women Builders' };
export const dynamic = 'force-dynamic';

function Sorry({ icon, title, body, cta }: { icon: React.ReactNode; title: string; body: string; cta: string }) {
  return (
    <AuthShell art="sage" kicker="Joining is by invitation" line="One reply from a human, either way.">
      <div className="space-y-6">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-builder">{icon}</span>
        <AuthTitle title={title} lede={body} />
        <Link href="/request-invite" className={buttonClass('primary', 'lg')}>{cta}</Link>
      </div>
    </AuthShell>
  );
}

export default async function JoinPage({ searchParams }: { searchParams: { invite?: string } }) {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user));
  const token = searchParams.invite ?? '';
  const preview = token ? await previewInvitation(token) : null;

  if (!token) {
    return (
      <Sorry
        icon={<Mail size={30} strokeWidth={1.75} />}
        title="Women Builders is invitation-only."
        body="To join, ask for an invitation. Our team reads every request, and you'll hear back within three weeks."
        cta="Request an invitation"
      />
    );
  }
  if (!preview) {
    return (
      <Sorry
        icon={<TimerOff size={30} strokeWidth={1.75} />}
        title="This invitation has expired."
        body="Invitation links work once and expire after 14 days. If you still want to join, ask for a new one and we'll match it to your earlier request."
        cta="Request a new invitation"
      />
    );
  }
  return (
    <AuthShell art="butter" kicker="You're in" line="Your account is active the moment you finish this page.">
      <AuthTitle
        pill={<span className="inline-flex items-center gap-1.5 rounded-full bg-butter px-3 py-1 text-[13px] font-bold"><Mail size={14} strokeWidth={2} /> You&apos;re invited</span>}
        title="Welcome to Women Builders."
        lede="You were invited, so your account is active as soon as you finish this page."
      />
      <JoinForm token={token} preview={preview} lockIcon={<Lock size={16} strokeWidth={1.75} />} />
    </AuthShell>
  );
}
