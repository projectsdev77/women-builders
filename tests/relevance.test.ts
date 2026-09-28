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
    expect(roleMatch(['FOUNDER'], ['INVESTOR']).score).toBe(100);
  });
  it('considers secondary roles on both sides', () => {
    expect(roleMatch(['OPERATOR'], ['INVESTOR']).score).toBe(30);
    expect(roleMatch(['OPERATOR', 'FOUNDER'], ['INVESTOR']).score).toBe(100);
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
    const target = m({ roles: ['INVESTOR'], offerings: 'Fintech expertise and investor intros', expertiseAreas: ['fintech'] });
    const r = calculateRelevance(viewer, target, { now, mutualConnections: 2 });
    const text = r.reasons.map((x) => x.description).join(' | ');
    expect(text).toContain('Can help with what you need: Fintech');
    expect(text).toContain('Investor: a natural fit');
    expect(text).toContain('Shared expertise: fintech');
    expect(text).toContain('2 mutual connections');
  });

  it('weights sum as documented', () => {
    const r = calculateRelevance(m({ roles: ['FOUNDER'] }), m({ roles: ['INVESTOR'] }), { now });
    // roleMatch 100·0.3 + recency 100·0.1
    expect(r.total).toBe(40);
  });
});
