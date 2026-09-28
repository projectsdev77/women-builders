import { cronRoute } from '@/lib/cron';
import { expireConnectionRequests } from '@/lib/services/connections';

export const dynamic = 'force-dynamic';
export const GET = cronRoute('expire-requests', expireConnectionRequests);
