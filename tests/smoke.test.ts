import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/db';
import { resetDb } from './helpers';

describe('test database', () => {
  it('connects to the test database and can be reset', async () => {
    expect(process.env.DATABASE_URL).toContain('womenbuilders_test');
    await resetDb();
    expect(await prisma.user.count()).toBe(0);
  });
});
