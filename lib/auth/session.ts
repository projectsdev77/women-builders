import * as React from 'react';
import { cookies } from 'next/headers';
import type { AccountStatus, DeactivatedBy, RoleType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { DURATIONS_MS } from '@/lib/config';
import { randomToken, sha256 } from '@/lib/security/tokens';

export const SESSION_COOKIE = 'wb_session';

export interface SessionUser {
  id: string;
  sessionId: string;
  email: string;
  name: string;
  isAdmin: boolean;
  /** Member reviewer: may vote in the invitation requests queue (R3 F21). */
  isReviewer: boolean;
  accountStatus: AccountStatus;
  deactivatedBy: DeactivatedBy | null;
  emailVerifiedAt: Date | null;
  charterVersion: number | null;
  profile: {
    primaryRole: RoleType;
    secondaryRoles: RoleType[];
    completenessScore: number;
    onboardingCompletedAt: Date | null;
  } | null;
}

/** Creates a DB session and returns the raw token (only the hash is stored) (G3). */
export async function createSession(userId: string, userAgent?: string | null): Promise<string> {
  const token = randomToken();
  await prisma.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      expiresAt: new Date(Date.now() + DURATIONS_MS.session),
      userAgent: userAgent?.slice(0, 300) ?? null,
    },
  });
  return token;
}

/**
 * Loads the session together with the *current* user row. Status and admin flag
 * therefore always reflect the database, never a stale token (G3).
 */
export async function findSessionUser(token: string): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        include: {
          profile: {
            select: { primaryRole: true, secondaryRoles: true, completenessScore: true, onboardingCompletedAt: true },
          },
        },
      },
    },
  });
  if (!session) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  const u = session.user;
  // Throttled activity tracking for the relevance "recency" signal (G13).
  if (now - u.lastActiveAt.getTime() > DURATIONS_MS.lastActiveThrottle) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: u.id }, data: { lastActiveAt: new Date(now) } }),
      prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } }),
    ]);
  }
  return {
    id: u.id,
    sessionId: session.id,
    email: u.email,
    name: u.name,
    isAdmin: u.isAdmin,
    isReviewer: u.isReviewer,
    accountStatus: u.accountStatus,
    deactivatedBy: u.deactivatedBy,
    emailVerifiedAt: u.emailVerifiedAt,
    charterVersion: u.charterVersion,
    profile: u.profile,
  };
}

export async function deleteSessionByToken(token: string) {
  await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
}

/** Ends every session for a user, optionally keeping the current one. */
export async function deleteUserSessions(userId: string, exceptSessionId?: string) {
  await prisma.session.deleteMany({
    where: { userId, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
  });
}

// ---- Cookie helpers (request-scoped) ----

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DURATIONS_MS.session / 1000,
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

// React.cache exists in the Next.js server runtime; plain Node (tests) falls back to no memoization.
const cache: <F extends (...args: never[]) => unknown>(fn: F) => F =
  (React as unknown as { cache?: <F>(fn: F) => F }).cache ?? ((fn) => fn);

/** The current user for this request, memoized per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return findSessionUser(token);
});
