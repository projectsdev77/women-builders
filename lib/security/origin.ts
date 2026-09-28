/**
 * Exact-origin check for state-changing API requests (G4).
 * Requires an Origin header (or Referer fallback) whose origin equals APP_URL's origin.
 */
export function isAllowedOrigin(
  originHeader: string | null,
  refererHeader: string | null,
  appUrl: string,
): boolean {
  let expected: string;
  try {
    expected = new URL(appUrl).origin;
  } catch {
    return false;
  }
  const candidate = originHeader && originHeader !== 'null' ? originHeader : refererHeader;
  if (!candidate) return false;
  try {
    return new URL(candidate).origin === expected;
  } catch {
    return false;
  }
}
