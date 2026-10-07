import { route } from '@/lib/api';
import { publicGatherings } from '@/lib/services/public-site';

export const dynamic = 'force-dynamic';
export const GET = route(async () => ({ gatherings: await publicGatherings() }));
