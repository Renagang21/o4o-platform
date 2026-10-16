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
      memberEntitlement: 'not-connected', features: [{ allowed: null }, { allowed: null }],
    });
    await expect(service.require('free-staff', 'approved-store', 'tablet')).rejects.toMatchObject({ httpStatus: 503, code: 'MEMBER_ENTITLEMENT_NOT_CONNECTED' });
  });

  it('resolves the member grant for the actor, not the store owner, and unions the sources', async () => {
    const query = jest.fn().mockResolvedValue([{ key: 'a', name: 'A', features: ['tablet'] }]);
    const member = jest.fn().mockResolvedValue({ type: 'member', key: 'paid', name: '회원 이용권', features: ['tablet', 'multilingual-content'] });
    const service = new PharmacyServiceFeatureService({ query }, member);
    const result = await service.resolve('staff-id', 'invited-store');
    expect(member).toHaveBeenCalledWith('staff-id');
    expect(query.mock.calls[0][1]).toEqual(['invited-store']);
    expect(result.features[0]).toMatchObject({ allowed: true, sources: [{ type: 'semi-franchise' }, { type: 'member' }] });
    expect(result.features[1].allowed).toBe(true);
    query.mockResolvedValue([]);
    expect((await service.resolve('staff-id', 'invited-store')).features[0].allowed).toBe(true);
  });

  it('returns an unavailable error on database, member source or persisted configuration failures', async () => {
    const query = jest.fn().mockRejectedValue(new Error('private database details'));
    const service = new PharmacyServiceFeatureService({ query });
    await expect(service.resolve('u', 's')).rejects.toMatchObject({ httpStatus: 503, code: 'FEATURE_ACCESS_UNAVAILABLE' });
    query.mockResolvedValue([{ key: 'a', name: 'A', features: ['unknown'] }]);
    await expect(service.resolve('u', 's')).rejects.toMatchObject({ code: 'FEATURE_ACCESS_UNAVAILABLE' });
    query.mockResolvedValue([]);
    await expect(new PharmacyServiceFeatureService({ query }, async () => { throw new Error('private'); }).resolve('u', 's'))
      .rejects.toMatchObject({ code: 'FEATURE_ACCESS_UNAVAILABLE' });
  });

  it('denies a missing feature only after all entitlement sources have been checked', async () => {
    const service = new PharmacyServiceFeatureService({ query: jest.fn().mockResolvedValue([]) }, async () => null);
    await expect(service.require('u', 's', 'tablet')).rejects.toMatchObject({ httpStatus: 403, code: 'SERVICE_FEATURE_REQUIRED' });
  });
});
