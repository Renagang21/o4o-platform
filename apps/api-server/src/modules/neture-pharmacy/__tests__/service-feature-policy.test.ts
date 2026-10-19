import { PharmacyServicePolicyService } from '../services/service-feature-policy.js';
import { PharmacyServiceFeatureService } from '../services/service-features.js';
import { readStaffFeatures, saveStaffFeatures } from '../services/staff-feature-permissions.js';

it('preserves legacy defaults, distinguishes explicit clearing, and rejects malformed policies and read failures', async () => {
  const query = jest.fn().mockResolvedValue([]);
  const policy = new PharmacyServicePolicyService({ query });
  expect(await policy.read('default')).toEqual([]);
  expect(await policy.read('paid')).toEqual(['tablet', 'multilingual-content']);
  query.mockResolvedValue([{ value: { features: [] } }]);
  expect(await policy.read('paid')).toEqual([]);
  for (const value of [null, {}, { features: ['unknown'] }]) {
    query.mockResolvedValue([{ value }]);
    await expect(policy.read('default')).rejects.toMatchObject({ httpStatus: 503 });
  }
  query.mockRejectedValue(new Error('private details'));
  await expect(policy.read('paid')).rejects.toMatchObject({ code: 'FEATURE_ACCESS_UNAVAILABLE' });
});

it('validates targets and selections before saving', async () => {
  const query = jest.fn().mockResolvedValue([]);
  const policy = new PharmacyServicePolicyService({ query });
  await expect(policy.set('large-pharmacy', [], 'actor')).rejects.toMatchObject({ httpStatus: 400 });
  await expect(policy.set('paid', ['unknown'], 'actor')).rejects.toMatchObject({ httpStatus: 400 });
  expect(query).not.toHaveBeenCalled();
  expect(await policy.set('paid', ['store-staff-support'], 'actor')).toEqual({ key: 'paid', features: ['store-staff-support'] });
});

it('unions base, business and owner payment, then intersects employee permission on every request', async () => {
  const query = jest.fn().mockImplementation(async (sql: string) => sql.includes('ownerUserId')
    ? [{ ownerUserId: 'owner' }] : [{ key: 'warehouse', name: 'Synthetic business', features: ['tablet'] }]);
  let staff: Array<'tablet' | 'store-staff-support'> = ['store-staff-support'];
  const service = new PharmacyServiceFeatureService({ query }, async () => ({ type: 'member', key: 'paid', name: 'Paid', features: ['tablet', 'store-staff-support'] }), {
    defaultFeatures: async () => ['multilingual-content'], staffFeatures: async () => staff,
  });
  const initial = await service.resolve('staff', 'store');
  expect(initial.features[0]).toMatchObject({ storeAllowed: true, allowed: false, sources: [{ type: 'semi-franchise' }, { type: 'member' }] });
  expect(initial.features[1]).toMatchObject({ allowed: false, sources: [{ type: 'default' }] });
  expect(initial.features[2].allowed).toBe(true);
  await expect(service.require('staff', 'store', 'tablet')).rejects.toMatchObject({ httpStatus: 403 });
  staff = ['tablet'];
  expect((await service.resolve('staff', 'store')).features[0].allowed).toBe(true);
  expect((await service.resolveStore('store')).features.filter(feature => feature.allowed).map(feature => feature.key))
    .toEqual(['tablet', 'multilingual-content', 'store-staff-support']);
});

it('does not allow an employee setting to grant an unavailable store function or alter another relationship', async () => {
  const query = jest.fn().mockResolvedValue([[], 0]);
  await expect(saveStaffFeatures({ query }, 'store', 'staff', ['tablet'], [])).rejects.toMatchObject({ code: 'FEATURE_NOT_AVAILABLE' });
  expect(query).not.toHaveBeenCalled();
  await expect(saveStaffFeatures({ query }, 'other', 'staff', [], [])).rejects.toMatchObject({ code: 'STAFF_MEMBER_NOT_FOUND' });
  expect(readStaffFeatures(null)).toEqual(['tablet', 'multilingual-content', 'store-staff-support']);
  expect(readStaffFeatures([])).toEqual([]);
  expect(() => readStaffFeatures(['unknown'])).toThrow();
  expect(() => readStaffFeatures(null, true)).toThrow();
});
