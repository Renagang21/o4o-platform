import { createPharmacyStoreAccess } from '../pharmacy-store-access.js';
const workspace = jest.fn();
const main = jest.fn();
jest.mock('../../../utils/store-workspace-access.js', () => ({ createRequireStoreWorkspaceAccess: () => workspace }));
jest.mock('../../../middleware/neture-main-membership.middleware.js', () => ({ requireNetureMainMembership: () => main }));
beforeEach(() => { workspace.mockReset(); main.mockReset(); });
it('approved staff can reach supply/cart/order routes without personal Neture membership', async () => {
  workspace.mockImplementation((req, _res, next) => { req.authContext = { memberRole: 'staff', organizationId: 'qualified-store' }; next(); });
  const next = jest.fn();
  await createPharmacyStoreAccess({} as any)({ user: { id: 'staff', memberships: [] } } as any, {} as any, next);
  expect(next).toHaveBeenCalled(); expect(main).not.toHaveBeenCalled();
});
it('owners keep the existing personal membership gate', async () => {
  workspace.mockImplementation((req, _res, next) => { req.authContext = { memberRole: 'owner' }; next(); });
  const req = {} as any, res = {} as any, next = jest.fn();
  await createPharmacyStoreAccess({} as any)(req, res, next);
  expect(main).toHaveBeenCalledWith(req, res, next);
});
it('unapproved or revoked staff cannot bypass authorization with a forged body', async () => {
  const error = new Error('store access denied'); workspace.mockImplementation((_req, _res, next) => next(error));
  const next = jest.fn();
  await createPharmacyStoreAccess({} as any)({ body: { memberRole: 'staff' } } as any, {} as any, next);
  expect(next).toHaveBeenCalledWith(error); expect(main).not.toHaveBeenCalled();
});
