import { config as loadEnv } from 'dotenv';

export default async function globalSetup() {
  loadEnv({ path: '.env' });
  if (!process.env.DATABASE_URL) throw new Error('The end-to-end tests need DATABASE_URL (the database behind the site under test) to create and remove their test accounts.');
  const { setupFixtures, disconnect } = await import('./fixtures');
  await setupFixtures();
  await disconnect();
}
