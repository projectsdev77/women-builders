import { NextResponse, type NextRequest } from 'next/server';
import { log } from '@/lib/log';

/** Cron routes require `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this). */
export function cronRoute(name: string, job: () => Promise<unknown>) {
  return async (req: NextRequest) => {
    // Trimmed: a stray space or line break pasted into the dashboard must not lock the jobs out.
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret || req.headers.get('authorization')?.trim() !== `Bearer ${secret}`) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }
    try {
      const result = await job();
      log.info('cron job finished', { job: name, result });
      return NextResponse.json({ ok: true, result });
    } catch (err) {
      log.error('cron job failed', err, { job: name });
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  };
}
