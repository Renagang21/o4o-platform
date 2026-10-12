import { kpaStoreOwnerOwnsStore } from '../kpa-store-owner.util.js';
import { isStoreOwner } from '../../../../utils/store-owner.utils.js';
import { resolveApprovedStoreMemberOrganization } from '../../../../utils/store-member-access.js';
jest.mock('../../../../utils/store-owner.utils.js', () => ({ isStoreOwner: jest.fn() }));
jest.mock('../../../../utils/store-member-access.js', () => ({ resolveApprovedStoreMemberOrganization: jest.fn() }));
const owner = jest.mocked(isStoreOwner);
const staff = jest.mocked(resolveApprovedStoreMemberOrganization);
beforeEach(() => { jest.clearAllMocks(); staff.mockResolvedValue(null); });
it('a global owner qualification for another store cannot manage this store through association fallback', async () => {
  owner.mockResolvedValue({ isOwner: true, organizationId: 'store-a' } as any);
  const getRepository = jest.fn();
  expect(await kpaStoreOwnerOwnsStore({ getRepository } as any, 'actor', 'store-b')).toBe(false);
  expect(owner).toHaveBeenCalledWith(expect.anything(), 'actor', 'kpa', 'store-b');
  expect(getRepository).not.toHaveBeenCalled();
});
it('approved staff can manage their store without being made its owner', async () => {
  staff.mockResolvedValue('store-b');
  expect(await kpaStoreOwnerOwnsStore({} as any, 'actor', 'store-b')).toBe(true);
  expect(owner).not.toHaveBeenCalled();
});
it('staff revocation is honored even when the actor remains an owner elsewhere', async () => {
  owner.mockResolvedValue({ isOwner: true, organizationId: 'store-a' } as any);
  expect(await kpaStoreOwnerOwnsStore({} as any, 'actor', 'store-b')).toBe(false);
});
