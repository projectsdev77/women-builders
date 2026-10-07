import { NextResponse, type NextRequest } from 'next/server';
import { isShowcased } from '@/lib/services/showcase';
import { readProfilePhoto } from '@/lib/services/photos';

export const dynamic = 'force-dynamic';

/**
 * The only public photo route: it serves a member's photo only while she is opted in to the
 * showcase and currently featured by the team (R3 F16). Everything else stays members-only.
 */
export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  if (!(await isShowcased(params.userId))) return new NextResponse(null, { status: 404 });
  const image = await readProfilePhoto({ id: params.userId, isAdmin: false }, params.userId, 512);
  if (!image) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(image), {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' },
  });
}
