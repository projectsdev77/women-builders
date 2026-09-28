import { NextResponse, type NextRequest } from 'next/server';
import { appUrl } from '@/lib/config';
import { unsubscribe } from '@/lib/services/notifications';

// Link clicked from an email: unsubscribe, then show a confirmation page.
export async function GET(req: NextRequest) {
  const type = await unsubscribe(req.nextUrl.searchParams.get('token') ?? '');
  return NextResponse.redirect(`${appUrl()}/unsubscribed${type ? `?type=${type}` : '?invalid=1'}`, 303);
}

// RFC 8058 one-click unsubscribe from mail clients.
export async function POST(req: NextRequest) {
  const type = await unsubscribe(req.nextUrl.searchParams.get('token') ?? '');
  return NextResponse.json({ ok: !!type }, { status: type ? 200 : 400 });
}
