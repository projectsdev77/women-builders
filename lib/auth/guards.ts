import { redirect } from 'next/navigation';
import { Errors } from '@/lib/errors';
import { getSessionUser, type SessionUser } from './session';
import { CHARTER_VERSION } from '@/content/charter';

/** Members must accept the current charter before using the app (R3 F2). */
export function requireCurrentCharter(user: SessionUser) {
  if (user.charterVersion == null || user.charterVersion < CHARTER_VERSION) redirect('/charter/accept');
}

// ---- API guards: throw AppError ----

export async function apiUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw Errors.unauthorized();
  return user;
}

/** Active members only (Req 18.7: PENDING users are limited to /api/me and auth). */
export async function apiActiveUser(): Promise<SessionUser> {
  const user = await apiUser();
  if (user.accountStatus !== 'ACTIVE') throw Errors.notActive();
  return user;
}

export async function apiAdmin(): Promise<SessionUser> {
  const user = await apiActiveUser();
  if (!user.isAdmin) throw Errors.forbidden('Admin access required.');
  return user;
}

// ---- Page guards: redirect ----

/** Where a logged-in user belongs, based on status and onboarding. */
export function homeFor(user: SessionUser): string {
  if (user.accountStatus !== 'ACTIVE') return '/login';
  if (user.charterVersion == null || user.charterVersion < CHARTER_VERSION) return '/charter/accept';
  if (user.profile && !user.profile.onboardingCompletedAt) return '/onboarding';
  if (!user.profile && user.isAdmin) return '/admin';
  return '/dashboard';
}

export async function pageUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

export async function pageActiveMember(opts: { allowOnboarding?: boolean } = {}) {
  const user = await pageUser();
  if (user.accountStatus !== 'ACTIVE') redirect('/login');
  requireCurrentCharter(user);
  if (!user.profile) redirect(user.isAdmin ? '/admin' : '/login');
  if (!opts.allowOnboarding && !user.profile.onboardingCompletedAt) redirect('/onboarding');
  return user as SessionUser & { profile: NonNullable<SessionUser['profile']> };
}

export async function pageAdmin(): Promise<SessionUser> {
  const user = await pageUser();
  if (user.accountStatus !== 'ACTIVE' || !user.isAdmin) redirect(homeFor(user));
  requireCurrentCharter(user);
  return user;
}
