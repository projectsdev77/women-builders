import { cronRoute } from '@/lib/cron';
import { processOutbox } from '@/lib/email/outbox';

export const dynamic = 'force-dynamic';
export const GET = cronRoute('outbox', () => processOutbox(100));
