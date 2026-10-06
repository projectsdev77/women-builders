import { cronRoute } from '@/lib/cron';
import { sendGatheringReminders } from '@/lib/services/gatherings';

export const dynamic = 'force-dynamic';
// Hourly so "morning of" reminders land in the morning in every time zone (R3 F14).
export const GET = cronRoute('hourly', async () => ({
  gatheringReminders: await sendGatheringReminders(),
}));
