jest.mock('../funding-access.js', () => ({ isFundingCreator: jest.fn() }));
import { isFundingCreator } from '../funding-access.js';
import { MarketTrial, TrialStatus } from '@o4o/market-trial';
import { FundingWorkspaceService, FundingError } from '../funding-workspace.service.js';
import { fundingReview, fundingForumCode, fundingForumSlug, isFundingPublic } from '../funding-review.js';

const ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', CREATOR = 'creator', REVIEWER = 'reviewer';
function harness(initial: Partial<MarketTrial> = {}, failForum = false) {
  let stored = { id: ID, supplierId: CREATOR, supplierName: '공급자', title: '펀딩', status: TrialStatus.SUBMITTED, statusHistory: [], ...initial } as MarketTrial;
  let forum: { id: string; slug: string } | undefined;
  const queries: { sql: string; args: unknown[] }[] = [];
  const locks: any[] = [];
  const ds: any = { transaction: async (fn: any) => {
    let working = structuredClone(stored), pendingForum = forum;
    const manager = {
      getRepository: (entity: any) => {
        expect(entity).toBe(MarketTrial);
        return { findOne: async (options: any) => { locks.push(options); return working; }, save: async (trial: MarketTrial) => { working = structuredClone(trial); return working; } };
      },
      query: async (sql: string, args: unknown[] = []) => {
        queries.push({ sql, args });
        if (sql.startsWith('SELECT id, slug FROM forum_category_requests')) return pendingForum ? [pendingForum] : [];
        if (sql.startsWith('INSERT INTO forum_category_requests')) {
          if (failForum) throw new Error('Forum storage unavailable');
          pendingForum = { id: 'board', slug: String(args[6]) }; return [pendingForum];
        }
        return [];
      },
    };
    const result = await fn(manager);
    stored = working; forum = pendingForum;
    return result;
  } };
  return { service: new FundingWorkspaceService(ds), read: () => stored, queries, locks };
}

beforeEach(() => (isFundingCreator as jest.Mock).mockResolvedValue(true));

describe('funding review and dedicated forum lifecycle', () => {
  it('preserves approval while a failed forum transaction cannot launch recruiting', async () => {
    const h = harness({}, true);
    await h.service.review(ID, REVIEWER, true);
    await expect(h.service.ensureForum(ID, REVIEWER)).rejects.toThrow('Forum storage unavailable');
    expect(h.read().status).toBe(TrialStatus.SUBMITTED);
    expect(fundingReview(h.read())).toMatchObject({ reviewStatus: 'approved', forumPending: true });
    await expect(h.service.review(ID, REVIEWER, false, '수정')).rejects.toMatchObject({ status: 409 });
  });
  it('creates the creator-owned closed board once and launches only after it is ready', async () => {
    const h = harness();
    await h.service.review(ID, REVIEWER, true);
    const first = await h.service.ensureForum(ID, REVIEWER);
    const second = await h.service.ensureForum(ID, REVIEWER);
    expect(first.created).toBe(true); expect(second.created).toBe(false);
    expect(h.read().status).toBe(TrialStatus.RECRUITING);
    const inserts = h.queries.filter(q => q.sql.startsWith('INSERT INTO forum_category_requests'));
    expect(inserts).toHaveLength(1);
    expect(inserts[0].args).toEqual(['펀딩', expect.any(String), fundingForumCode(ID), CREATOR, '공급자', REVIEWER, fundingForumSlug(ID), JSON.stringify({ fundingTrialId: ID })]);
    expect(inserts[0].sql).toContain("'closed', 'completed'");
    expect(h.queries.some(q => /INSERT INTO forum_post|market_trial_forums/.test(q.sql))).toBe(false);
    expect(h.locks.every(lock => lock.where.id === ID && lock.lock.mode === 'pessimistic_write')).toBe(true);
  });
  it.each([TrialStatus.DRAFT, TrialStatus.SUBMITTED, TrialStatus.CLOSED])('never opens a forum for unapproved %s', async status => {
    const h = harness({ status });
    await expect(h.service.ensureForum(ID, REVIEWER)).rejects.toMatchObject({ code: 'FUNDING_NOT_APPROVED' });
    expect(h.queries).toHaveLength(0);
  });
  it('rejects into editable draft and retains the reason and reviewer', async () => {
    const h = harness();
    await h.service.review(ID, REVIEWER, false, '내용 보완');
    expect(h.read().status).toBe(TrialStatus.DRAFT);
    expect(fundingReview(h.read())).toMatchObject({ reviewStatus: 'rejected', reviewReason: '내용 보완' });
    expect(h.read().statusHistory[0]).toMatchObject({ actorUserId: REVIEWER, from: 'submitted', to: 'draft' });
  });
  it.each(['', 'x'.repeat(1001)])('requires a bounded rejection reason', async reason => {
    const h = harness();
    await expect(h.service.review(ID, REVIEWER, false, reason)).rejects.toBeInstanceOf(FundingError);
    expect(h.locks).toHaveLength(0);
  });
  it('rejects stale approvals after another review', async () => {
    const h = harness();
    await h.service.review(ID, REVIEWER, true);
    await expect(h.service.review(ID, REVIEWER, true)).rejects.toMatchObject({ status: 409 });
  });
  it('enforces creator ownership and changes status plus existing participant choice state in one transaction', async () => {
    const h = harness({ status: TrialStatus.DEVELOPMENT });
    await expect(h.service.changeStatus(ID, 'other', TrialStatus.OUTCOME_CONFIRMING, true)).rejects.toMatchObject({ status: 403 });
    await h.service.changeStatus(ID, CREATOR, TrialStatus.OUTCOME_CONFIRMING, true);
    const cascade = h.queries.find(q => q.sql.startsWith('UPDATE market_trial_participants'));
    expect(cascade?.args).toEqual([ID]);
    expect(cascade?.sql).toContain("COALESCE(\"settlementStatus\", 'pending') = 'pending'");
    expect(h.read().statusHistory[0]).toMatchObject({ reason: 'creator_progress', to: 'outcome_confirming' });
    await expect(h.service.changeStatus(ID, CREATOR, TrialStatus.DEVELOPMENT, true)).rejects.toMatchObject({ status: 409 });
  });
  it.each([TrialStatus.DRAFT, TrialStatus.SUBMITTED])('public reads hide %s', status => {
    expect(isFundingPublic({ status, statusHistory: [], closeReason: null })).toBe(false);
  });
  it('hides historical ambiguous closed/rejected content, preserves proven published closure', () => {
    expect(isFundingPublic({ status: TrialStatus.CLOSED, statusHistory: [], closeReason: null })).toBe(false);
    expect(isFundingPublic({ status: TrialStatus.CLOSED, statusHistory: [], closeReason: 'auto_target_missed' })).toBe(true);
    expect(isFundingPublic({ status: TrialStatus.CLOSED, statusHistory: [{ from: 'fulfilled', to: 'closed', at: '', reason: 'creator_progress', auto: false }], closeReason: null })).toBe(true);
  });
});


it('rechecks the creator before approval and before launching the approved forum', async () => {
  const h = harness();
  (isFundingCreator as jest.Mock).mockResolvedValue(false);
  await expect(h.service.review(ID, REVIEWER, true)).rejects.toMatchObject({ code: 'CREATOR_NOT_ACTIVE' });
  expect(h.read().statusHistory).toHaveLength(0);
  (isFundingCreator as jest.Mock).mockResolvedValue(true);
  await h.service.review(ID, REVIEWER, true);
  (isFundingCreator as jest.Mock).mockResolvedValue(false);
  await expect(h.service.ensureForum(ID, REVIEWER)).rejects.toMatchObject({ code: 'CREATOR_NOT_ACTIVE' });
  expect(fundingReview(h.read()).forumPending).toBe(true);
});
