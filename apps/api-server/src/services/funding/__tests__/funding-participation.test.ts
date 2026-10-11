import { MarketTrial, TrialStatus } from '@o4o/market-trial';
import { FundingWorkspaceService } from '../funding-workspace.service.js';
function harness(overrides: any = {}, failInsert = false) {
  let state = { status: TrialStatus.RECRUITING, fundingStartAt: new Date(Date.now() - 60000), fundingEndAt: new Date(Date.now() + 60000), maxParticipants: 1, currentParticipants: 0, rewardOptions: ['cash', 'product'], ...overrides };
  const rows: any[] = [], saved = jest.fn();
  const ds: any = { transaction: async (run: any) => {
    const working = structuredClone(state), added: any[] = [];
    const result = await run({
      query: async () => [{ account_status: 'active', account_active: true, email_verified: true }],
      getRepository: (entity: any) => entity === MarketTrial ? {
        findOne: async (options: any) => { expect(options.lock).toEqual({ mode: 'pessimistic_write' }); return working; },
        save: async (trial: any) => { saved(trial); return trial; },
      } : {
        findOne: async () => rows[0] ?? null,
        create: (payload: any) => payload,
        save: async (payload: any) => { if (failInsert) throw new Error('insert unavailable'); added.push(payload); return payload; },
      },
    });
    state = working; rows.push(...added); return result;
  } };
  return { service: new FundingWorkspaceService(ds), state: () => state, rows, saved };
}
it('locks capacity and preserves interest-only participation with no payment or forum grant', async () => {
  const h = harness(); const result = await h.service.join('project', 'participant', 'cash');
  expect(result.participant).toEqual({ marketTrialId: 'project', participantId: 'participant', participantType: 'store_owner', contributionAmount: 0, rewardType: 'cash', rewardStatus: 'pending' });
  expect(h.state().currentParticipants).toBe(1);
  await expect(h.service.join('project', 'another', 'cash')).rejects.toMatchObject({ code: 'FUNDING_FULL' });
  expect(h.rows).toHaveLength(1);
});
it.each([
  [{ status: TrialStatus.SUBMITTED }, 'FUNDING_NOT_RECRUITING'],
  [{ fundingEndAt: new Date(Date.now() - 60000) }, 'FUNDING_NOT_RECRUITING'],
  [{ fundingStartAt: new Date(Date.now() + 60000) }, 'FUNDING_NOT_RECRUITING'],
  [{ rewardOptions: ['product'] }, 'INVALID_REWARD'],
])('rejects unavailable recruitment conditions without inserting: %p', async (override, code) => {
  const h = harness(override); await expect(h.service.join('project', 'participant', 'cash')).rejects.toMatchObject({ code }); expect(h.rows).toHaveLength(0);
});
it('a failed insert cannot advance capacity', async () => {
  const h = harness({}, true); await expect(h.service.join('project', 'participant', 'cash')).rejects.toThrow('insert unavailable');
  expect(h.state().currentParticipants).toBe(0); expect(h.saved).not.toHaveBeenCalled();
});
