import { route } from '@/lib/api';
import { publicNumbers } from '@/lib/services/public-site';

export const dynamic = 'force-dynamic';
export const GET = route(async () => ({ numbers: await publicNumbers() }));
