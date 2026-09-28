import { cronRoute } from '@/lib/cron';
import { archiveOldProspects } from '@/lib/jobs/archive';

export const dynamic = 'force-dynamic';
export const GET = cronRoute('archive', archiveOldProspects);
