import { SemiFranchiseService } from '../services/semi-franchise.service.js';
import { getBusinessInfo } from '../services/business-info.js';
import { resolveSemiFranchiseBusinessAccess, resolveSemiFranchiseCommunityAccess } from '../services/semi-franchise-community-access.js';

const sf = { id: 'immutable-business-id', key: 'pharmacy', status: 'active' };
function executor(allowed: boolean) {
  return { query: jest.fn(async (sql: string, _params: unknown[]) => {
    if (sql.includes('SELECT sf.key, sf.name')) return [{ key: sf.key, name: '사업', communityKey: null }];
    if (sql.includes('SELECT id, key, status')) return [sf];
    if (sql.includes('WHERE EXISTS')) return allowed ? [{ ok: 1 }] : [];
    throw new Error('Unexpected query');
  }) };
}

describe('business access independently of forum configuration', () => {
  it('uses exactly the existing participant approval predicate with the immutable business id', async () => {
    const byBusiness = executor(true);
    const byForum = executor(true);
    expect(await resolveSemiFranchiseBusinessAccess(byBusiness, 'owner', 'pharmacy')).toEqual(
      await resolveSemiFranchiseCommunityAccess(byForum, 'owner', 'configured-forum'));
    expect(byBusiness.query.mock.calls[1]).toEqual(byForum.query.mock.calls[1]);
    expect(byBusiness.query.mock.calls[1][1]).toEqual([sf.id, 'owner']);
    expect(byBusiness.query.mock.calls[0][0]).toContain('WHERE key = $1');
    expect(byForum.query.mock.calls[0][0]).toContain('WHERE community_key = $1');
  });
  it('anonymous and inactive access stay denied for the native business namespace', async () => {
    const exec = executor(true);
    expect(await resolveSemiFranchiseBusinessAccess(exec, undefined, 'pharmacy')).toMatchObject({ allowed: false });
    expect(exec.query).toHaveBeenCalledTimes(1);
    const inactive = { query: jest.fn(async () => [{ ...sf, status: 'closed' }]) };
    expect(await resolveSemiFranchiseBusinessAccess(inactive, 'owner', 'pharmacy')).toMatchObject({ allowed: false });
    expect(inactive.query).toHaveBeenCalledTimes(1);
  });
  it('no forum configuration is needed for metadata and the read does not create resources', async () => {
    const exec = executor(true);
    expect(await getBusinessInfo(exec, 'pharmacy')).toMatchObject({ communityKey: 'business:pharmacy' });
    expect(exec.query.mock.calls.every(([sql]) => !/\b(INSERT|UPDATE|DELETE)\b/i.test(sql))).toBe(true);
  });
});


it('the store participant entry gets a usable address without changing membership or persisted configuration', async () => {
  const rows = [
    { key: 'pharmacy', communityKey: null, membershipStatus: 'active' },
    { key: 'other', communityKey: 'existing-forum', membershipStatus: 'pending' },
  ];
  const query = jest.fn(async () => rows);
  const result = await new SemiFranchiseService({ query } as never).listForPharmacy('owned-organization');
  expect(result).toEqual([
    { ...rows[0], communityKey: 'business:pharmacy' },
    rows[1],
  ]);
  expect(rows[0].communityKey).toBeNull();
  expect(query).toHaveBeenCalledWith(expect.any(String), ['owned-organization']);
  expect(query).toHaveBeenCalledTimes(1);
});
