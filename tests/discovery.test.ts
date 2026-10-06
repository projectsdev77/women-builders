import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { dismissRecommendation, getRecommendations, searchMembers, searchQuerySchema } from '@/lib/services/discovery';
import { pair } from '@/lib/services/relationships';
import { resetDb } from './helpers';
import { COMPLETE_FOUNDER, createMember } from './factories';

beforeEach(resetDb);
const q = (o: Record<string, unknown>) => searchQuerySchema.parse(o);

describe('search (G14, Req 2)', () => {
  it('ranks an exact name match first even when others are more "relevant"', async () => {
    const viewer = await createMember({ profile: COMPLETE_FOUNDER });
    await createMember({ name: 'Jane Smith', profile: { primaryRole: 'BUILDER' } });
    // A highly relevant investor who mentions "Jane Smith" only in her background.
    await createMember({
      name: 'Olivia Investor',
      profile: { primaryRole: 'INVESTOR', offerings: 'fundraising advice investor intros', professionalBackground: 'Worked with Jane Smith' },
    });
    const res = await searchMembers(viewer.id, q({ q: 'Jane Smith' }));
    expect(res.results[0]?.member.name).toBe('Jane Smith');
  });

  it('finds short names (Li, Ana)', async () => {
    const viewer = await createMember();
    await createMember({ name: 'Li Wei' });
    await createMember({ name: 'Ana Gomez' });
    expect((await searchMembers(viewer.id, q({ q: 'Li' }))).results.map((r) => r.member.name)).toEqual(['Li Wei']);
    expect((await searchMembers(viewer.id, q({ q: 'ana' }))).results.map((r) => r.member.name)).toEqual(['Ana Gomez']);
  });

  it('never matches hidden fields for non-connections (text or location filter)', async () => {
    const viewer = await createMember();
    const hidden = await createMember({
      name: 'Hidden Hannah',
      profile: { city: 'Austin', country: 'US', needs: 'stealth quantum project', hiddenFields: ['location', 'needs'] },
    });
    expect((await searchMembers(viewer.id, q({ q: 'quantum' }))).results).toHaveLength(0);
    expect((await searchMembers(viewer.id, q({ city: 'austin' }))).results).toHaveLength(0);
    expect((await searchMembers(viewer.id, q({ country: 'us' }))).results).toHaveLength(0);
    // Once connected, hidden fields are searchable.
    await prisma.connection.create({ data: pair(viewer.id, hidden.id) });
    expect((await searchMembers(viewer.id, q({ q: 'quantum' }))).results).toHaveLength(1);
    expect((await searchMembers(viewer.id, q({ city: 'austin' }))).results[0]?.member.location).toBe('Austin, United States');
    expect((await searchMembers(viewer.id, q({ country: 'US' }))).results).toHaveLength(1);
  });

  it('excludes self, blocked and non-active members', async () => {
    const viewer = await createMember({ name: 'Viewer Vee' });
    const blocked = await createMember({ name: 'Blocked Bea' });
    await prisma.block.create({ data: { blockerId: blocked.id, blockedId: viewer.id } });
    await createMember({ name: 'Pending Pat', accountStatus: 'PENDING' });
    await createMember({ name: 'Gone Gail', accountStatus: 'DEACTIVATED' });
    const visible = await createMember({ name: 'Visible Val' });
    const res = await searchMembers(viewer.id, q({}));
    expect(res.results.map((r) => r.member.id)).toEqual([visible.id]);
  });

  it('filters by role and normalized expertise and paginates', async () => {
    const viewer = await createMember();
    for (let i = 0; i < 3; i++) await createMember({ profile: { primaryRole: 'INVESTOR', expertiseAreas: ['machine-learning'] } });
    await createMember({ profile: { primaryRole: 'BUILDER', expertiseAreas: ['machine-learning'] } });
    const res = await searchMembers(viewer.id, q({ primaryRole: 'INVESTOR', expertise: 'Machine Learning', limit: 2 }));
    expect(res.pagination).toMatchObject({ total: 3, totalPages: 2 });
    expect(res.results).toHaveLength(2);
    expect(res.results.every((r) => r.member.primaryRole === 'INVESTOR')).toBe(true);
  });
});

describe('recommendations (Req 5, G13)', () => {
  it('excludes connections, pending requests, blocked, dismissed and self; flags small result sets', async () => {
    const viewer = await createMember({ profile: COMPLETE_FOUNDER });
    const connected = await createMember({ profile: { primaryRole: 'INVESTOR' } });
    await prisma.connection.create({ data: pair(viewer.id, connected.id) });
    const pending = await createMember({ profile: { primaryRole: 'INVESTOR' } });
    await prisma.connectionRequest.create({ data: { senderId: pending.id, receiverId: viewer.id, expiresAt: new Date(Date.now() + 1e9) } });
    const blocked = await createMember({ profile: { primaryRole: 'INVESTOR' } });
    await prisma.block.create({ data: { blockerId: viewer.id, blockedId: blocked.id } });
    const dismissed = await createMember({ profile: { primaryRole: 'INVESTOR' } });
    await dismissRecommendation(viewer.id, dismissed.id);
    const fresh = await createMember({ profile: { primaryRole: 'INVESTOR' } });

    const res = await getRecommendations(viewer.id);
    expect(res.recommendations.map((r) => r.member.id)).toEqual([fresh.id]);
    expect(res.fewerThanMinimum).toBe(true);
  });

  it('ranks complementary members with matching needs first and explains why', async () => {
    const viewer = await createMember({ profile: { ...COMPLETE_FOUNDER, needs: 'intros to fintech investors' } });
    const investor = await createMember({ profile: { primaryRole: 'INVESTOR', offerings: 'fintech investor intros', expertiseAreas: ['fintech'] } });
    for (let i = 0; i < 5; i++) await createMember({ profile: { primaryRole: 'FOUNDER' } });
    const res = await getRecommendations(viewer.id);
    expect(res.recommendations[0]?.member.id).toBe(investor.id);
    expect(res.recommendations[0]?.explanation).toMatch(/Can help with what you need/);
    expect(res.recommendations.length).toBeLessThanOrEqual(20);
  });

  it('does not use hidden offerings in explanations', async () => {
    const viewer = await createMember({ profile: { ...COMPLETE_FOUNDER, needs: 'secret sauce' } });
    await createMember({ profile: { primaryRole: 'INVESTOR', offerings: 'secret sauce', hiddenFields: ['offerings'] } });
    const res = await getRecommendations(viewer.id);
    expect(JSON.stringify(res)).not.toContain('sauce');
  });

  it('counts mutual connections', async () => {
    const viewer = await createMember();
    const friend = await createMember();
    const target = await createMember({ profile: { primaryRole: 'INVESTOR' } });
    await prisma.connection.create({ data: pair(viewer.id, friend.id) });
    await prisma.connection.create({ data: pair(friend.id, target.id) });
    const rec = (await getRecommendations(viewer.id)).recommendations.find((r) => r.member.id === target.id);
    expect(rec?.reasons.some((r) => r.type === 'mutual_connection')).toBe(true);
  });

  it('re-dismissing after the cooldown works (upsert)', async () => {
    const viewer = await createMember();
    const other = await createMember();
    await dismissRecommendation(viewer.id, other.id);
    await prisma.dismissedRecommendation.updateMany({ data: { showAgainAfter: new Date(Date.now() - 1000) } });
    await expect(dismissRecommendation(viewer.id, other.id)).resolves.toBeUndefined();
  });
});
