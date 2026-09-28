// Central product constants. Values trace to gap-resolutions.md (G#).

export const APP_NAME = 'Women Builders';

export const LIMITS = {
  connectionRequestsPer24h: 20, // G1
  messagesPer24h: 200, // G1
  unansweredMessagesPerConversation: 20, // G1
  connectionRequestMessageMax: 500,
  messageMax: 5000, // G12
  reportDetailsMax: 2000,
  recommendationsMax: 20, // G13
  recommendationsMinBeforeEmptyState: 5,
  candidateCap: 2000, // G13/G14
  searchPageSizeDefault: 20,
  searchPageSizeMax: 50,
  csvMaxBytes: 1_000_000, // G16
  csvMaxRows: 2000,
} as const;

export const DURATIONS_MS = {
  session: 30 * 24 * 60 * 60 * 1000,
  lastActiveThrottle: 5 * 60 * 1000,
  connectionRequestExpiry: 30 * 24 * 60 * 60 * 1000,
  dismissCooldown: 30 * 24 * 60 * 60 * 1000,
  emailVerification: 24 * 60 * 60 * 1000,
  passwordReset: 60 * 60 * 1000,
  invitation: 14 * 24 * 60 * 60 * 1000,
  loginWindow: 15 * 60 * 1000,
  loginBlock: 15 * 60 * 1000,
  globalLoginWindow: 60 * 60 * 1000,
  reapplyAfterRejection: 90 * 24 * 60 * 60 * 1000,
  messageEmailCoalesce: 30 * 60 * 1000,
  prospectRetention: 2 * 365 * 24 * 60 * 60 * 1000,
} as const;

export const LOGIN = {
  maxFailuresPerEmailIp: 5, // G7
  maxFailuresPerEmailGlobal: 50, // G7
} as const;

export const COMPLETENESS_THRESHOLD = 60; // G15

// Shown on the application form (G10). Policy, not code; edit freely.
export const ELIGIBILITY_STATEMENT =
  'Women Builders is a community for women and non-binary founders, operators, investors and builders.';

export function appUrl(): string {
  return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function appTimezone(): string {
  return process.env.APP_TIMEZONE ?? 'America/New_York';
}
