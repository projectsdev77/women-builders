import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { readProfilePhoto } from '@/lib/services/photos';

export const dynamic = 'force-dynamic';

/** Member photos are never public: only active members who aren't blocked can load them (R3 F6). */
export async function GET(_req: NextRequest, { params }: { params: { userId: string; size: string } }) {
  const viewer = await getSessionUser();
  const size = params.size === '512' ? 512 : params.size === '128' ? 128 : null;
  if (!viewer || viewer.accountStatus !== 'ACTIVE' || !size) return new NextResponse(null, { status: 404 });
  const image = await readProfilePhoto({ id: viewer.id, isAdmin: viewer.isAdmin }, params.userId, size);
  if (!image) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(image), {
    headers: {
      'Content-Type': 'image/webp',
      // URLs carry the photo version, so a cached copy is never stale; keep it private to this browser.
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
