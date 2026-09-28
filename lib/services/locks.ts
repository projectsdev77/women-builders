import type { Tx } from '@/lib/db';

/**
 * Transaction-scoped Postgres advisory lock. Serializes check-then-write
 * sequences (rate limits, one-pending-request-per-pair) (G1, G6).
 */
export async function lock(tx: Tx, key: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}
