jest.mock('../funding-access.js', () => ({ isFundingCreator: jest.fn() }));
import { MarketTrial, TrialStatus } from '@o4o/market-trial';
import { isFundingCreator } from '../funding-access.js';
import { FundingForumMembershipService } from '../funding-forum-membership.service.js';
const ID = 'funding', BOARD = 'board', ACTOR = 'creator';
function harness(status = TrialStatus.RECRUITING, failMembership = false) {
  let store = { pending: true, member: false };
  const queries: string[] = [];
  const ds: any = { transaction: async (run: any) => {
    const working = { ...store };
    const result = await run({
      getRepository: (entity: any) => {
        expect(entity).toBe(MarketTrial);
        return { findOne: async (options: any) => { expect(options.lock.mode).toBe('pessimistic_write'); return { id: ID, supplierId: ACTOR, status, statusHistory: [] }; } };
      },
      query: async (sql: string, args: any[]) => {
        queries.push(sql);
        if (sql.includes('FROM users u')) return [{ account_status: 'active', account_active: true, email_verified: true }];
        if (sql.startsWith('SELECT id FROM forum_category_requests')) { expect(args).toEqual([BOARD, `funding-${ID}`, `funding:${ID}`]); return [{}]; }
        if (sql.startsWith('SELECT id, user_id FROM forum_join_requests')) { expect(sql).toContain('FOR UPDATE'); return working.pending ? [{ id: 'request', user_id: 'participant' }] : []; }
        if (sql.startsWith('SELECT id FROM market_trial_participants')) return [{}];
        if (sql.startsWith('UPDATE forum_join_requests')) { working.pending = false; return []; }
        if (sql.startsWith('INSERT INTO forum_category_members')) { if (failMembership) throw new Error('storage unavailable'); working.member = true; return []; }
        if (sql.startsWith('DELETE FROM forum_category_members')) { expect(sql).toContain("role <> 'owner'"); if (args[1] === ACTOR) return []; working.member = false; return [{}]; }
        return [];
      },
    });
    store = working; return result;
  } };
  return { service: new FundingForumMembershipService(ds), state: () => store, queries };
}
beforeEach(() => (isFundingCreator as jest.Mock).mockResolvedValue(true));
it.each([true, false])('reviews a pending request once; membership is created only on approval=%s', async approve => {
  const h = harness();
  expect(await h.service.review(ID, BOARD, 'request', ACTOR, approve)).toMatchObject({ status: approve ? 'approved' : 'rejected' });
  expect(h.state()).toEqual({ pending: false, member: approve });
  await expect(h.service.review(ID, BOARD, 'request', ACTOR, !approve)).rejects.toMatchObject({ code: 'REQUEST_CONFLICT' });
  expect(h.queries.some(sql => /UPDATE market_trial_participants|payment|settlement/.test(sql))).toBe(false);
});
it('rolls review back if membership insertion fails', async () => {
  const h = harness(undefined, true);
  await expect(h.service.review(ID, BOARD, 'request', ACTOR, true)).rejects.toThrow('storage unavailable');
  expect(h.state()).toEqual({ pending: true, member: false });
});
it.each([TrialStatus.DRAFT, TrialStatus.SUBMITTED, TrialStatus.CLOSED])('blocks membership writes to %s projects', async status => {
  const h = harness(status);
  await expect(h.service.request(ID, BOARD, 'participant')).rejects.toMatchObject({ status: 409 });
  expect(h.queries).toHaveLength(0);
});
it('restricts review to the current creator and never removes the owner', async () => {
  const h = harness();
  (isFundingCreator as jest.Mock).mockResolvedValue(false);
  await expect(h.service.review(ID, BOARD, 'request', 'other', true)).rejects.toMatchObject({ status: 403 });
  (isFundingCreator as jest.Mock).mockResolvedValue(true);
  await expect(h.service.remove(ID, BOARD, ACTOR, ACTOR)).rejects.toMatchObject({ code: 'MEMBER_NOT_REMOVABLE' });
  expect(await h.service.remove(ID, BOARD, 'participant', ACTOR)).toEqual({ removed: true, userId: 'participant' });
});
