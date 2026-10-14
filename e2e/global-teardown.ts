export default async function globalTeardown() {
  if (process.env.E2E_KEEP_DATA) return; // leave test data in place for debugging
  const { cleanup, disconnect } = await import('./fixtures');
  await cleanup();
  await disconnect();
}
