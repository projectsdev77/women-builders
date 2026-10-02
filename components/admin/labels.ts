export const STATUS_LABELS: Record<string, string> = {
  IDENTIFIED: 'Identified',
  REVIEWED: 'Reviewed',
  CONTACTED: 'Contacted',
  FOLLOW_UP_NEEDED: 'Follow-up needed',
  INTERESTED: 'Interested',
  INVITED: 'Invited',
  APPLIED: 'Applied',
  APPROVED: 'Approved',
  NOT_INTERESTED: 'Not interested',
  NOT_A_FIT: 'Not a fit',
  DO_NOT_CONTACT: 'Do not contact',
};

export const STATUS_TONE: Record<string, 'gray' | 'brand' | 'green' | 'yellow' | 'red'> = {
  IDENTIFIED: 'gray',
  REVIEWED: 'gray',
  CONTACTED: 'brand',
  FOLLOW_UP_NEEDED: 'yellow',
  INTERESTED: 'brand',
  INVITED: 'brand',
  APPLIED: 'brand',
  APPROVED: 'green',
  NOT_INTERESTED: 'gray',
  NOT_A_FIT: 'gray',
  DO_NOT_CONTACT: 'red',
};

export const ACCOUNT_TONE: Record<string, 'gray' | 'green' | 'yellow' | 'red'> = {
  ACTIVE: 'green',
  PENDING: 'yellow',
  REJECTED: 'gray',
  DEACTIVATED: 'red',
  DELETED: 'gray',
};

export const REPORT_REASON_LABELS: Record<string, string> = {
  HARASSMENT: 'Harassment',
  SPAM: 'Spam',
  FAKE_PROFILE: 'Fake profile',
  INAPPROPRIATE_CONTENT: 'Inappropriate content',
  OTHER: 'Other',
};

export const fmtDate = (iso: string | Date | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

/** Date-only values (YYYY-MM-DD) must not shift across timezones when displayed. */
export const fmtDay = (ymd: string | null | undefined) =>
  ymd ? new Date(`${ymd}T12:00:00Z`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) : '—';
