export const TYPE_LABEL = { DINNER: 'Dinner', WORKING_SESSION: 'Working session', OTHER: 'Gathering' } as const;
export const SEAT_LABEL = {
  REQUESTED: ['Requested', 'yellow'],
  CONFIRMED: ['Confirmed', 'green'],
  WAITLISTED: ['Waitlisted', 'yellow'],
  DECLINED: ['Not this time', 'gray'],
  CANCELLED: ['Cancelled', 'gray'],
} as const;
export const ROLE_LABEL = { FOUNDER: 'Founder', OPERATOR: 'Operator', INVESTOR: 'Investor', BUILDER: 'Builder' } as const;
