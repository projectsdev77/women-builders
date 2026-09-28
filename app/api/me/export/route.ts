import { NextResponse } from 'next/server';
import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { exportMemberData } from '@/lib/services/data-rights';

export const GET = route(async () => {
  const user = await apiActiveUser();
  const data = await exportMemberData(user.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="women-builders-data-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
});
