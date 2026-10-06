import { cronRoute } from '@/lib/cron';
import { sendInvitationReminders } from '@/lib/services/admin/invitations';
import { sendCharterNotices } from '@/lib/services/charter';
import { sendInvestingCheckins } from '@/lib/services/investing';

export const dynamic = 'force-dynamic';
// Daily housekeeping. Later R3 steps add their daily jobs here.
export const GET = cronRoute('daily', async () => ({
  invitationReminders: await sendInvitationReminders(),
  charterNotices: await sendCharterNotices(),
  investingCheckins: await sendInvestingCheckins(),
}));
