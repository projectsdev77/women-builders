/** Removes everything the end-to-end tests created (e2e- accounts, requests, gatherings, wins, emails). */
import { cleanup, disconnect, prisma } from './fixtures';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL to the database to clean.');
  const before = await prisma.user.count({ where: { email: { startsWith: 'e2e-' } } });
  await cleanup();
  console.log(`Removed ${before} test account(s) and everything they made.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(disconnect);
