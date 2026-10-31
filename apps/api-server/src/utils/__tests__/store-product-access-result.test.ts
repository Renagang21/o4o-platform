import { resolveStoreProductAccessResult } from '../store-product-access.js';
import { isStoreOwner, storeOwnerRejection } from '../store-owner.utils.js';
import { resolveApprovedStoreMemberOrganization } from '../store-member-access.js';
jest.mock('../store-owner.utils.js', () => ({ isStoreOwner: jest.fn(), storeOwnerRejection: jest.fn() }));
jest.mock('../store-member-access.js', () => ({ resolveApprovedStoreMemberOrganization: jest.fn() }));
beforeEach(() => jest.resetAllMocks());
it('preserves missing qualification instead of returning an authorized empty inventory', async () => {
  jest.mocked(isStoreOwner).mockResolvedValue({ isOwner: false, organizationId: null, qualificationRequired: true } as any);
  jest.mocked(resolveApprovedStoreMemberOrganization).mockResolvedValue(null);
  jest.mocked(storeOwnerRejection).mockReturnValue({ status: 403, body: { success: false, code: 'PHARMACIST_QUALIFICATION_REQUIRED', error: '확인 필요' } });
  expect(await resolveStoreProductAccessResult({} as any, 'fixture', 'kpa', 'store-a')).toMatchObject({ organizationId: null, rejection: { status: 403, body: { code: 'PHARMACIST_QUALIFICATION_REQUIRED' } } });
});
it('retains an approved staff member’s ordinary product access without granting owner qualification', async () => {
  jest.mocked(isStoreOwner).mockResolvedValue({ isOwner: false, organizationId: null } as any);
  jest.mocked(resolveApprovedStoreMemberOrganization).mockResolvedValue('store-a');
  expect(await resolveStoreProductAccessResult({} as any, 'fixture', 'kpa', 'store-a')).toEqual({ organizationId: 'store-a', rejection: null });
  expect(resolveApprovedStoreMemberOrganization).toHaveBeenCalledWith(expect.anything(), 'fixture', 'kpa', 'store-a');
  expect(storeOwnerRejection).not.toHaveBeenCalled();
});
