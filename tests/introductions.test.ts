import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import {
  acceptIntroduction,
  askIntroduction,
  askSchema,
  cancelIntroduction,
  declineIntroduction,
  expireIntroductions,
  introduce,
  introductionForPair,
  introductionOptions,
  introductionsAwaiting,
  listIntroductions,
  passIntroduction,
  teamIntroduce,
} from '@/lib/services/introductions';
import { sendConnectionRequest } from '@/lib/services/connections';
import { blockMember } from '@/lib/services/safety';
import { getConversation } from '@/lib/services/messaging';
import { activeConnection, pair } from '@/lib/services/relationships';
import { resetDb } from './helpers';
import { COMPLETE_FOUNDER, createMember as baseCreate, type MemberOverrides } from './factories';

// Requesters must pass the completeness gate, so test members start complete.
const createMember = (o: MemberOverrides = {}) => baseCreate({ ...o, profile: o.profile === null ? null : { ...COMPLETE_FOUNDER, ...o.profile } });

beforeEach(resetDb);
const DAY = 86_400_000;
const connectPair = (a: string, b: string) => prisma.connection.create({ data: pair(a, b) });
const ask = (o: Record<string, unknown>) =>
  askSchema.parse({ noteToIntroducer: 'We both work on payments in West Africa.', noteToTarget: 'Would love to compare notes.', ...o });

/** A and C each know B. */
async function trio() {
  const a = await createMember({ name: 'Ada Asker' });
  const b = await createMember({ name: 'Bea Bridge' });
  const c = await createMember({ name: 'Cleo Target' });
  await connectPair(a.id, b.id);
  await connectPair(b.id, c.id);
  return { a, b, c };
}

describe('warm introductions (R3 F12)', () => {
  it('runs the happy path: ask → introduce → accept, connected with the notes', async () => {
    const { a, b, c } = await trio();
    const opts = await introductionOptions(a.id, c.id);
    expect(opts.introducers.map((i) => i.id)).toEqual([b.id]);
    expect(opts.teamAvailable).toBe(false);

    const { id } = await askIntroduction(a.id, ask({ targetId: c.id, introducerId: b.id }));
    expect(await prisma.emailOutbox.count({ where: { kind: 'introduction', to: b.email } })).toBe(1);
    expect(await introductionsAwaiting(b.id)).toBe(1);
    expect((await listIntroductions(a.id, 'mine'))[0]!.status).toBe('waiting_introducer');
    // C sees nothing until B introduces.
    expect(await listIntroductions(c.id, 'for-me')).toHaveLength(0);

    await introduce(b.id, id, 'Ada is brilliant, you two should talk.');
    expect((await listIntroductions(a.id, 'mine'))[0]!.status).toBe('waiting_target');
    const forC = await listIntroductions(c.id, 'for-me');
    expect(forC[0]).toMatchObject({ actionable: true, noteToTarget: 'Would love to compare notes.', introducerNote: 'Ada is brilliant, you two should talk.' });

    await acceptIntroduction(c.id, id);
    expect(await activeConnection(prisma, a.id, c.id)).toBeTruthy();
    expect((await listIntroductions(a.id, 'mine'))[0]!.status).toBe('connected');
    expect(await prisma.emailOutbox.count({ where: { kind: 'introduction', to: { in: [a.email, b.email] } } })).toBe(3);
    const conv = await getConversation(a.id, c.id);
    expect(conv.introduction).toMatchObject({ by: 'Bea Bridge', requesterNote: 'Would love to compare notes.' });
    expect(await introductionForPair(c.id, a.id)).not.toBeNull();
  });

  it('keeps every "no" silent until the deadline', async () => {
    const { a, b, c } = await trio();
    const first = await askIntroduction(a.id, ask({ targetId: c.id, introducerId: b.id }));
    await passIntroduction(b.id, first.id);
    expect((await listIntroductions(a.id, 'mine'))[0]!.status).toBe('waiting_introducer');
    // Still counts as open: no second request to the same person.
    await expect(askIntroduction(a.id, ask({ targetId: c.id, introducerId: b.id }))).rejects.toMatchObject({ code: 'CONFLICT' });
    await prisma.introduction.update({ where: { id: first.id }, data: { introducerDueAt: new Date(Date.now() - 1000) } });
    expect((await listIntroductions(a.id, 'mine'))[0]!.status).toBe('no_introduction');

    const d = await createMember({ name: 'Dee Target' });
    await connectPair(b.id, d.id);
    const second = await askIntroduction(a.id, ask({ targetId: d.id, introducerId: b.id }));
    await introduce(b.id, second.id, null);
    await declineIntroduction(d.id, second.id);
    expect((await listIntroductions(a.id, 'mine')).find((i) => i.id === second.id)!.status).toBe('waiting_target');
    expect(await prisma.emailOutbox.count({ where: { to: a.email } })).toBe(0);
  });

  it('requires a mutual connection who allows introduction requests', async () => {
    const { a, b, c } = await trio();
    await prisma.user.update({ where: { id: b.id }, data: { allowIntroRequests: false } });
    const opts = await introductionOptions(a.id, c.id);
    expect(opts.introducers).toHaveLength(0);
    expect(opts.teamAvailable).toBe(true);
    await expect(askIntroduction(a.id, ask({ targetId: c.id, introducerId: b.id }))).rejects.toMatchObject({ code: 'NOT_FOUND' });
    const stranger = await createMember();
    await expect(askIntroduction(a.id, ask({ targetId: c.id, introducerId: stranger.id }))).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('enforces the completeness gate, no double routes and the open limit', async () => {
    const { a, b, c } = await trio();
    const lowA = await baseCreate();
    await connectPair(lowA.id, b.id);
    await expect(askIntroduction(lowA.id, ask({ targetId: c.id, introducerId: b.id }))).rejects.toMatchObject({ code: 'PROFILE_INCOMPLETE' });

    await sendConnectionRequest(a.id, c.id);
    await expect(askIntroduction(a.id, ask({ targetId: c.id, introducerId: b.id }))).rejects.toMatchObject({ code: 'CONFLICT' });

    for (let i = 0; i < 5; i++) {
      const t = await createMember();
      await connectPair(b.id, t.id);
      await askIntroduction(a.id, ask({ targetId: t.id, introducerId: b.id }));
    }
    const t6 = await createMember();
    await connectPair(b.id, t6.id);
    await expect(askIntroduction(a.id, ask({ targetId: t6.id, introducerId: b.id }))).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('"Prefer introductions" blocks direct requests but not introductions', async () => {
    const { a, b, c } = await trio();
    await prisma.user.update({ where: { id: c.id }, data: { preferIntroductions: true } });
    await expect(sendConnectionRequest(a.id, c.id)).rejects.toMatchObject({ code: 'PREFERS_INTRODUCTIONS' });
    const { id } = await askIntroduction(a.id, ask({ targetId: c.id, introducerId: b.id }));
    await introduce(b.id, id, null);
    await acceptIntroduction(c.id, id);
    expect(await activeConnection(prisma, a.id, c.id)).toBeTruthy();
  });

  it('"Ask the team": only without introducers, 2 a month, handled by an admin', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    const a = await createMember();
    const targets = await Promise.all([createMember(), createMember(), createMember()]);
    const first = await askIntroduction(a.id, ask({ targetId: targets[0]!.id, introducerId: 'team' }));
    await askIntroduction(a.id, ask({ targetId: targets[1]!.id, introducerId: 'team' }));
    await expect(askIntroduction(a.id, ask({ targetId: targets[2]!.id, introducerId: 'team' }))).rejects.toMatchObject({ code: 'RATE_LIMITED' });

    await teamIntroduce(admin.id, first.id, 'We think you would get on.');
    const forC = await listIntroductions(targets[0]!.id, 'for-me');
    expect(forC[0]!.introducer?.name).toBe('The Women Builders team');
    await acceptIntroduction(targets[0]!.id, first.id);
    expect((await getConversation(a.id, targets[0]!.id)).introduction?.by).toBe('The Women Builders team');

    // Not offered when someone in her network can introduce her.
    const { a: a2, c } = await trio();
    await expect(askIntroduction(a2.id, ask({ targetId: c.id, introducerId: 'team' }))).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('blocking hides the pair and closes open introductions silently', async () => {
    const { a, b, c } = await trio();
    const { id } = await askIntroduction(a.id, ask({ targetId: c.id, introducerId: b.id }));
    await blockMember(c.id, a.id);
    expect(await listIntroductions(b.id, 'asked')).toHaveLength(0);
    await expect(introduce(b.id, id, null)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect((await prisma.introduction.findUniqueOrThrow({ where: { id } })).status).toBe('DECLINED_BY_INTRODUCER');
  });

  it('expires after 14 days and lets the requester withdraw', async () => {
    const { a, b, c } = await trio();
    const { id } = await askIntroduction(a.id, ask({ targetId: c.id, introducerId: b.id }));
    expect(await expireIntroductions(new Date(Date.now() + 15 * DAY))).toBe(1);
    expect((await prisma.introduction.findUniqueOrThrow({ where: { id } })).status).toBe('EXPIRED');

    const d = await createMember();
    await connectPair(b.id, d.id);
    const second = await askIntroduction(a.id, ask({ targetId: d.id, introducerId: b.id }));
    await cancelIntroduction(a.id, second.id);
    await expect(passIntroduction(b.id, second.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
