import { PharmacyServiceFeatureService, resolveServiceFeatureGrants, validateServiceFeatures } from '../services/service-features.js';

describe('service feature grants', () => {
  it('merges two businesses without duplicating a feature and retains another grant after removal', () => {
    const a = { type: 'semi-franchise' as const, key: 'a', name: 'A', features: ['tablet' as const] };
    const b = { ...a, key: 'b', name: 'B' };
    expect(resolveServiceFeatureGrants([a, b])[0]).toMatchObject({ allowed: true, sources: [{ key: 'a' }, { key: 'b' }] });
    expect(resolveServiceFeatureGrants([b])[0].allowed).toBe(true);
    expect(resolveServiceFeatureGrants([])[0].allowed).toBe(false);
  });

  it.each([null, {}, ['staff-consultation'], ['tablet', 1], 'tablet'])('rejects unsupported settings %j', value => {
    expect(() => validateServiceFeatures(value)).toThrow();
  });

  it('accepts explicit clearing and normalizes duplicate selections', () => {
    expect(validateServiceFeatures([])).toEqual([]);
    expect(validateServiceFeatures(['tablet', 'tablet'])).toEqual(['tablet']);
  });

  it('does not interpret an unconnected paid source as a non-member', async () => {
    const service = new PharmacyServiceFeatureService({ query: jest.fn().mockResolvedValue([]) });
    expect(await service.resolve('free-staff', 'approved-store')).toMatchObject({
      memberEntitlement: 'not-connected', features: [{ allowed: null }, { allowed: null }, { allowed: null }],
    });
    await expect(service.require('free-staff', 'approved-store', 'tablet')).rejects.toMatchObject({ httpStatus: 503, code: 'MEMBER_ENTITLEMENT_NOT_CONNECTED' });
  });

  it('grants free invited staff the paid owner features and unions business grants', async () => {
    const query = jest.fn().mockResolvedValueOnce([{ key: 'a', name: 'A', features: ['tablet'] }])
      .mockResolvedValueOnce([{ ownerUserId: 'paid-owner' }]);
    const member = jest.fn().mockResolvedValue({ type: 'member', key: 'paid', name: '회원 이용권', features: ['tablet', 'multilingual-content'] });
    const result = await new PharmacyServiceFeatureService({ query }, member).resolve('free-staff', 'invited-store');
    expect(member).toHaveBeenCalledWith('paid-owner');
    expect(query.mock.calls.map(call => call[1])).toEqual([['invited-store'], ['invited-store']]);
    expect(result.features[0]).toMatchObject({ allowed: true, sources: [{ type: 'semi-franchise' }, { type: 'member' }] });
    expect(result.features[1].allowed).toBe(true);
  });

  it('does not use paid staff status or another pharmacy owner status', async () => {
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ ownerUserId: 'free-owner' }])
      .mockResolvedValueOnce([]).mockResolvedValueOnce([{ ownerUserId: 'paid-owner' }]);
    const member = jest.fn(async (id: string) => id === 'free-owner' ? null :
      ({ type: 'member' as const, key: 'paid', name: '회원 이용권', features: ['tablet' as const] }));
    const service = new PharmacyServiceFeatureService({ query }, member);
    expect((await service.resolve('paid-staff', 'free-owner-store')).features[0].allowed).toBe(false);
    expect((await service.resolve('free-staff', 'paid-owner-store')).features[0].allowed).toBe(true);
    expect(member.mock.calls).toEqual([['free-owner'], ['paid-owner']]);
  });

  it.each([{ owners: [] }, { owners: [{ ownerUserId: 'a' }, { ownerUserId: 'b' }] }])('fails when current ownership is unresolved: %j', async ({ owners }) => {
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(owners);
    const member = jest.fn();
    await expect(new PharmacyServiceFeatureService({ query }, member).resolve('staff', 'store'))
      .rejects.toMatchObject({ httpStatus: 503, code: 'FEATURE_ACCESS_UNAVAILABLE' });
    expect(member).not.toHaveBeenCalled();
  });

  it('returns an unavailable error on database, member source or persisted configuration failures', async () => {
    const query = jest.fn().mockRejectedValue(new Error('private database details'));
    const service = new PharmacyServiceFeatureService({ query });
    await expect(service.resolve('u', 's')).rejects.toMatchObject({ httpStatus: 503, code: 'FEATURE_ACCESS_UNAVAILABLE' });
    query.mockResolvedValue([{ key: 'a', name: 'A', features: ['unknown'] }]);
    await expect(service.resolve('u', 's')).rejects.toMatchObject({ code: 'FEATURE_ACCESS_UNAVAILABLE' });
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ ownerUserId: 'owner' }]);
    await expect(new PharmacyServiceFeatureService({ query }, async () => { throw new Error('private'); }).resolve('u', 's'))
      .rejects.toMatchObject({ code: 'FEATURE_ACCESS_UNAVAILABLE' });
  });

  it('denies a missing feature only after all entitlement sources have been checked', async () => {
    const service = new PharmacyServiceFeatureService({ query: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ ownerUserId: 'owner' }]) }, async () => null);
    await expect(service.require('u', 's', 'tablet')).rejects.toMatchObject({ httpStatus: 403, code: 'SERVICE_FEATURE_REQUIRED' });
  });
});
