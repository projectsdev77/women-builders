import { describe, expect, it } from 'vitest';
import { calculateRelevance, cosine, roleMatch, stem, tokenize, tokenSet, type RelevanceInput } from '@/lib/services/relevance';

const now = new Date('2026-09-01T12:00:00Z');
function m(o: Partial<RelevanceInput>): RelevanceInput {
  return { roles: ['FOUNDER'], needs: null, offerings: null, expertiseAreas: [], lastActiveAt: now, ...o };
}

describe('tokenizer (G13)', () => {
  it('keeps short domain terms and drops stop words', () => {
    expect(tokenize('Need help with AI, ML and B2B GTM from a VC')).toEqual(['ai', 'ml', 'b2b', 'gtm', 'vc']);
  });
  it('stems common suffixes so variants match', () => {
    expect(stem('fundraising')).toBe(stem('fundraise'));
    expect(stem('investors')).toBe('investor');
    expect(stem('introductions')).toBe(stem('introduction'));
  });
});

describe('needs/offerings (cosine)', () => {
  it('matches bidirectionally', () => {
    const a = m({ needs: 'fundraising advice', offerings: 'technical expertise' });
    const b = m({ needs: 'technical expertise', offerings: 'fundraising advice' });
    expect(calculateRelevance(a, b, { now }).breakdown.needsOfferings).toBe(100);
  });

  it('penalizes keyword stuffing', () => {
    const need = tokenSet('fundraising');
    const honest = tokenSet('fundraising strategy');
    const stuffed = tokenSet(
      'fundraising marketing sales hiring design engineering legal finance operations product growth branding pr seo analytics',
    );
    expect(cosine(need, honest)).toBeGreaterThan(cosine(need, stuffed));
  });

  it('a one-word need does not match everyone at 100%', () => {
    const viewer = m({ needs: 'mentorship' });
    const target = m({ offerings: 'mentorship, hiring, fundraising, product, design, sales, legal, finance' });
    expect(calculateRelevance(viewer, target, { now }).breakdown.needsOfferings).toBeLessThan(50);
  });
});

describe('role matching (symmetric, all roles)', () => {
  it('is symmetric', () => {
    expect(roleMatch(['INVESTOR'], ['OPERATOR']).score).toBe(roleMatch(['OPERATOR'], ['INVESTOR']).score);
    expect(roleMatch(['FOUNDER'], ['INVESTOR']).score).toBe(roleMatch(['INVESTOR'], ['FOUNDER']).score);
  });
  it('considers secondary roles on both sides', () => {
    expect(roleMatch(['OPERATOR'], ['INVESTOR']).score).toBe(30);
    expect(roleMatch(['OPERATOR', 'FOUNDER'], ['INVESTOR']).score).toBe(70);
  });
});

describe('founder↔investor stage fit (R3 F10)', () => {
  const founder = (stage: string | null) => m({ roles: ['FOUNDER'], companyStage: stage });
  const investor = (stages: string[], active: boolean) => m({ roles: ['INVESTOR'], investmentStages: stages, investingActive: active });

  it('scores 100 only when the stage matches and she is investing, otherwise 70', () => {
    expect(roleMatch(founder('Seed'), investor(['Seed', 'Series A'], true))).toMatchObject({ score: 100, stageFit: true });
    expect(roleMatch(investor(['Seed'], true), founder('Seed'))).toMatchObject({ score: 100, stageFit: true });
    expect(roleMatch(founder('Series B'), investor(['Seed'], true)).score).toBe(70);
    expect(roleMatch(founder('Seed'), investor(['Seed'], false)).score).toBe(70);
    expect(roleMatch(founder('Bootstrapped'), investor(['Seed'], true)).score).toBe(70);
    // Idea-stage companies raise pre-seed; Series C+ raises growth.
    expect(roleMatch(founder('Idea'), investor(['Pre-seed'], true)).score).toBe(100);
    expect(roleMatch(founder('Series C+'), investor(['Growth'], true)).score).toBe(100);
  });

  it('explains the fit from either side', () => {
    const a = calculateRelevance(founder('Seed'), investor(['Seed'], true), { now }).reasons.map((r) => r.description);
    expect(a).toContain('Investing at your stage');
    const b = calculateRelevance(investor(['Seed'], true), founder('Seed'), { now }).reasons.map((r) => r.description);
    expect(b).toContain('Raising at a stage you invest in');
  });

  it('adds "Also in <city>" as a reason without changing the score', () => {
    const v = m({ city: 'Lagos', country: 'NG' });
    const same = calculateRelevance(v, m({ city: ' lagos ', country: 'NG' }), { now });
    const other = calculateRelevance(v, m({ city: 'Lagos', country: 'PT' }), { now });
    expect(same.reasons.map((r) => r.description)).toContain('Also in lagos');
    expect(other.reasons.some((r) => r.type === 'same_city')).toBe(false);
    expect(same.total).toBe(other.total);
  });
});

describe('overall score', () => {
  it('prefers active members', () => {
    const viewer = m({});
    const active = m({ roles: ['INVESTOR'] });
    const inactive = m({ roles: ['INVESTOR'], lastActiveAt: new Date(now.getTime() - 91 * 86400000) });
    expect(calculateRelevance(viewer, active, { now }).total).toBeGreaterThan(calculateRelevance(viewer, inactive, { now }).total);
  });

  it('builds readable reasons from original words, including mutual connections', () => {
    const viewer = m({ needs: 'Intros to fintech investors', expertiseAreas: ['fintech', 'payments'] });
    const target = m({ roles: ['OPERATOR'], offerings: 'Fintech expertise and investor intros', expertiseAreas: ['fintech'] });
    const r = calculateRelevance(viewer, target, { now, mutualConnections: 2 });
    const text = r.reasons.map((x) => x.description).join(' | ');
    expect(text).toContain('Can help with what you need: Fintech');
    expect(text).toContain('Operator: a natural fit');
    expect(text).toContain('Shared expertise: fintech');
    expect(text).toContain('2 mutual connections can introduce you');
  });

  it('weights sum as documented', () => {
    const r = calculateRelevance(m({ roles: ['FOUNDER'] }), m({ roles: ['BUILDER'] }), { now });
    // roleMatch 80·0.3 + recency 100·0.1
    expect(r.total).toBe(34);
  });
});
