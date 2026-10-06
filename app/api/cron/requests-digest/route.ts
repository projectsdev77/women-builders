import { cronRoute } from '@/lib/cron';
import { sendOverdueRequestsDigest } from '@/lib/services/invite-requests';

export const dynamic = 'force-dynamic';
export const GET = cronRoute('requests-digest', sendOverdueRequestsDigest);
