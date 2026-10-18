import { readHomeParticipation } from '../home-participation.service.js';
import { resolveSemiFranchiseBusinessAccess } from '../../../neture-pharmacy/services/semi-franchise-community-access.js';
jest.mock('../../../neture-pharmacy/services/semi-franchise-community-access.js', () => ({ resolveSemiFranchiseBusinessAccess: jest.fn() }));
const access = jest.mocked(resolveSemiFranchiseBusinessAccess);

it('reads business access without the general community catalog and scopes cooperatives to the caller', async () => {
  const query = jest.fn(async (sql: string, params?: unknown[]) => {
    if (sql.includes('FROM cooperative_memberships')) {
      expect(params).toEqual(['member']);
      expect(sql).toContain("c.status = 'active' AND sf.status = 'active'");
      return [{ id: 'coop', slug: 'sample', name: '합성 조합', status: 'pending' }];
    }
    return [{ key: 'carepharm', name: '합성 사업' }];
  });
  access.mockResolvedValue({ semiFranchise: true, allowed: false, semiFranchiseKey: 'carepharm' });
  const db = { query } as any;
  const first = await readHomeParticipation(db, 'member');
  expect(first.businesses[0].canParticipate).toBe(false);
  expect(first.cooperatives[0].status).toBe('pending');
  access.mockResolvedValue({ semiFranchise: true, allowed: true, semiFranchiseKey: 'carepharm' });
  expect((await readHomeParticipation(db, 'member')).businesses[0].canParticipate).toBe(true);
  expect(access).toHaveBeenLastCalledWith(db, 'member', 'carepharm');
  expect(query.mock.calls.every(([sql]) => !/INSERT|UPDATE|DELETE/.test(sql))).toBe(true);
});

it('propagates a ledger failure instead of returning an empty membership list', async () => {
  const query = jest.fn().mockRejectedValue(new Error('database unavailable'));
  await expect(readHomeParticipation({ query } as any, 'member')).rejects.toThrow('database unavailable');
});
