import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import {
  calculateCompleteness,
  canSendConnectionRequests,
  missingRequiredFields,
  normalizeTag,
} from '@/lib/services/profile-fields';
import { getMemberProfile, profileUpdateSchema, updateOwnProfile } from '@/lib/services/profiles';
import { pair } from '@/lib/services/relationships';
import { resetDb } from './helpers';
import { COMPLETE_FOUNDER, createMember } from './factories';

beforeEach(resetDb);

describe('completeness formula (G15)', () => {
  it('is filled / applicable over core + all held roles', () => {
    // 7 core + 4 founder = 11 applicable; headline + companyName filled = 2
    expect(calculateCompleteness({ primaryRole: 'FOUNDER', secondaryRoles: [], headline: 'x', companyName: 'Acme' })).toBe(18);
    // adding the investor role adds 3 applicable fields
    expect(
      calculateCompleteness({ primaryRole: 'FOUNDER', secondaryRoles: ['INVESTOR'], headline: 'x', companyName: 'Acme' }),
    ).toBe(14);
  });

  it('gates connection requests on 60% and primary-role required fields', () => {
    expect(canSendConnectionRequests({ ...COMPLETE_FOUNDER, secondaryRoles: [] })).toBe(true);
    const noStage = { ...COMPLETE_FOUNDER, secondaryRoles: [], companyStage: undefined };
    expect(missingRequiredFields(noStage)).toEqual(['companyStage']);
    expect(canSendConnectionRequests(noStage)).toBe(false);
  });

  it('treats check size as filled only when both bounds exist', () => {
    const base = { primaryRole: 'INVESTOR' as const, secondaryRoles: [], investmentStages: ['Seed'], checkSizeMin: 25 };
    expect(missingRequiredFields(base)).toEqual(['checkSize']);
    expect(missingRequiredFields({ ...base, checkSizeMax: 100 })).toEqual([]);
  });

  it('normalizes tags', () => {
    expect(normalizeTag('  Machine Learning ')).toBe('machine-learning');
    expect(normalizeTag('machine_learning')).toBe('machine-learning');
    expect(normalizeTag('C++')).toBe('c++');
  });
});

describe('profile updates', () => {
  it('drops the primary role from secondary roles, filters hidden fields and recomputes completeness', async () => {
    const u = await createMember({ profile: { primaryRole: 'FOUNDER' } });
    const input = profileUpdateSchema.parse({
      secondaryRoles: ['FOUNDER', 'INVESTOR'],
      hiddenFields: ['location', 'name', 'email', 'needs'],
      expertiseAreas: ['Machine Learning', 'machine-learning', 'AI'],
      linkedInUrl: 'linkedin.com/in/Jane',
    });
    const p = await updateOwnProfile(u.id, input);
    expect(p.secondaryRoles).toEqual(['INVESTOR']);
    expect(p.hiddenFields).toEqual(['location', 'needs']);
    expect(p.expertiseAreas).toEqual(['machine-learning', 'ai']);
    expect(p.linkedInUrl).toBe('https://www.linkedin.com/in/jane');
    expect(p.completenessScore).toBe(calculateCompleteness(p));
  });

  it('rejects an inverted check size range', () => {
    expect(profileUpdateSchema.safeParse({ checkSizeMin: 500, checkSizeMax: 100 }).success).toBe(false);
  });
});

describe('privacy (G5, Req 9)', () => {
  it('hides hidden fields from non-connections but shows them to connections; never exposes email', async () => {
    const owner = await createMember({
      profile: { ...COMPLETE_FOUNDER, hiddenFields: ['location', 'needs', 'companyName'] },
    });
    const stranger = await createMember();
    const friend = await createMember();
    await prisma.connection.create({ data: pair(owner.id, friend.id) });

    const s = await getMemberProfile(stranger.id, owner.id);
    expect(s.location).toBeNull();
    expect(s.needs).toBeNull();
    expect(s.founder?.companyName).toBeNull();
    expect(s.offerings).toBe(COMPLETE_FOUNDER.offerings);
    expect(s.hasHiddenFields).toBe(true);
    expect(JSON.stringify(s)).not.toContain(owner.email);

    const f = await getMemberProfile(friend.id, owner.id);
    expect(f.location).toBe(COMPLETE_FOUNDER.location);
    expect(f.needs).toBe(COMPLETE_FOUNDER.needs);
    expect(f.connectionStatus).toBe('connected');
  });

  it('returns 404 for blocked, pending, deactivated and profile-less users', async () => {
    const viewer = await createMember();
    const blocker = await createMember();
    await prisma.block.create({ data: { blockerId: blocker.id, blockedId: viewer.id } });
    const pending = await createMember({ accountStatus: 'PENDING' });
    const gone = await createMember({ accountStatus: 'DEACTIVATED' });
    const admin = await createMember({ isAdmin: true, profile: null });
    for (const target of [blocker, pending, gone, admin]) {
      await expect(getMemberProfile(viewer.id, target.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    }
  });

  it('shows a declined request as still pending to the sender (silent decline, G6)', async () => {
    const a = await createMember();
    const b = await createMember();
    await prisma.connectionRequest.create({
      data: { senderId: a.id, receiverId: b.id, status: 'DECLINED', expiresAt: new Date(Date.now() + 86400000) },
    });
    expect((await getMemberProfile(a.id, b.id)).connectionStatus).toBe('pending_sent');
    expect((await getMemberProfile(b.id, a.id)).connectionStatus).toBe('none');
  });
});
