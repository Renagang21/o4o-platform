import { resolveStoreProductAccessResult } from '../store-product-access.js';
import { isStoreOwner, storeOwnerRejection } from '../store-owner.utils.js';
import { findApprovedStoreMemberCandidates } from '../store-member-access.js';
jest.mock('../store-owner.utils.js', () => ({ isStoreOwner: jest.fn(), storeOwnerRejection: jest.fn() }));
jest.mock('../store-member-access.js', () => ({ findApprovedStoreMemberCandidates: jest.fn() }));
beforeEach(() => jest.resetAllMocks());
it('preserves missing qualification instead of returning an authorized empty inventory', async () => {
  jest.mocked(isStoreOwner).mockResolvedValue({ isOwner: false, organizationId: null, qualificationRequired: true } as any);
  jest.mocked(findApprovedStoreMemberCandidates).mockResolvedValue([]);
  jest.mocked(storeOwnerRejection).mockReturnValue({ status: 403, body: { success: false, code: 'PHARMACIST_QUALIFICATION_REQUIRED', error: '확인 필요' } });
  expect(await resolveStoreProductAccessResult({} as any, 'fixture', 'kpa', 'store-a')).toMatchObject({ organizationId: null, rejection: { status: 403, body: { code: 'PHARMACIST_QUALIFICATION_REQUIRED' } } });
});
it('retains an approved staff member’s ordinary product access without granting owner qualification', async () => {
  jest.mocked(isStoreOwner).mockResolvedValue({ isOwner: false, organizationId: null } as any);
  jest.mocked(findApprovedStoreMemberCandidates).mockResolvedValue([{ organizationId: 'store-a', memberRole: 'staff' }]);
  expect(await resolveStoreProductAccessResult({} as any, 'fixture', 'kpa', 'store-a')).toEqual({ organizationId: 'store-a', rejection: null });
  expect(findApprovedStoreMemberCandidates).toHaveBeenCalledWith(expect.anything(), 'fixture', 'kpa');
  expect(storeOwnerRejection).not.toHaveBeenCalled();
});
it('requires a selection for multiple approved staff stores and never falls back from a foreign selection', async () => {
  jest.mocked(isStoreOwner).mockResolvedValue({ isOwner: false, organizationId: null } as any);
  jest.mocked(storeOwnerRejection).mockReturnValue({ status: 403, body: { success: false, code: 'STORE_OWNER_REQUIRED', error: 'denied' } });
  jest.mocked(findApprovedStoreMemberCandidates).mockResolvedValue([{ organizationId: 'store-a', memberRole: 'staff' }, { organizationId: 'store-b', memberRole: 'staff' }]);
  expect(await resolveStoreProductAccessResult({} as any, 'fixture', 'kpa')).toMatchObject({ rejection: { status: 409, body: { code: 'AMBIGUOUS_STORE_CONNECTION' } } });
  expect(await resolveStoreProductAccessResult({} as any, 'fixture', 'kpa', 'foreign')).toMatchObject({ organizationId: null, rejection: { status: 403, body: { code: 'STORE_SELECTION_ACCESS_REQUIRED' } } });
});
