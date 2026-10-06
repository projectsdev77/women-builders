import type { Metadata } from 'next';
import { pageActiveMember } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { listBlocked } from '@/lib/services/safety';
import { Card } from '@/components/ui';
import { NotificationSettings } from './notification-settings';
import { PasswordSettings } from './password-settings';
import { BlockedList } from './blocked-list';
import { AccountSettings } from './account-settings';
import { IntroductionSettings } from './introduction-settings';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const user = await pageActiveMember();
  const [prefs, blocked, intro] = await Promise.all([
    prisma.notificationPreference.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} }),
    listBlocked(user.id),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { allowIntroRequests: true, preferIntroductions: true } }),
  ]);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Email notifications</h2>
        <p className="text-sm text-gray-600">
          Emails go to <strong>{user.email}</strong>. Account and security emails are always sent.
        </p>
        <NotificationSettings
          initial={{
            connectionRequest: prefs.connectionRequest,
            connectionAccepted: prefs.connectionAccepted,
            newMessage: prefs.newMessage,
            investingCheckins: prefs.investingCheckins,
            introductions: prefs.introductions,
          }}
          isInvestor={user.profile?.primaryRole === 'INVESTOR' || !!user.profile?.secondaryRoles.includes('INVESTOR')}
        />
      </Card>
      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Introductions</h2>
        <IntroductionSettings initial={intro} />
      </Card>
      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Password</h2>
        <PasswordSettings />
      </Card>
      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Blocked members</h2>
        <BlockedList initial={blocked} />
      </Card>
      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Your account and data</h2>
        <AccountSettings />
      </Card>
    </div>
  );
}
