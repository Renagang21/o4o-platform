import { centralContactRecipients, assertCentralContactAccess, CENTRAL_CONTACT_MENUS } from '../central-contact-access.js';
const roles = jest.fn();
const menus = jest.fn();
jest.mock('../../../services/admin/central-operation-access.js', () => ({ centralOperationRoles: (...a: unknown[]) => roles(...a) }));
jest.mock('../../../services/admin/central-operation-menu-grants.js', () => ({ centralOperationMenuKeys: (...a: unknown[]) => menus(...a) }));
const db = {query: jest.fn()};
beforeEach(() => jest.resetAllMocks());
it('delivers only to current central operators with the exact inquiry duty', async () => {
 db.query.mockResolvedValue([{userId:'local'}, {userId:'other-menu'}, {userId:'central'}, {userId:'expired'}]);
 roles.mockImplementation(async (_db, id) => ['local','expired'].includes(id) ? [] : ['supplier:operator']);
 menus.mockImplementation(async (_db, id) => id==='central' ? ['supplier.inbox'] : ['supplier.members']);
 expect(await centralContactRecipients(db,'supplier.inbox')).toEqual([{userId:'central'}]);
 expect(db.query.mock.calls[0][1][0]).toContain('platform:super_admin');
});
it.each(['password','kakao',undefined])('rejects non-Google sessions %s', async method => {
 await expect(assertCentralContactAccess(db,'actor','neture',method)).rejects.toMatchObject({status:403});
 expect(roles).not.toHaveBeenCalled();
});
it('requires current central authority and fails closed on lookup error', async () => {
 roles.mockResolvedValue(['neture:operator']); menus.mockResolvedValue(['neture.members']);
 await expect(assertCentralContactAccess(db,'actor','neture','google')).rejects.toMatchObject({status:403});
 menus.mockResolvedValue(['neture.inbox']); await expect(assertCentralContactAccess(db,'actor','store','google')).resolves.toBeUndefined();
 roles.mockRejectedValue(Error('lookup unavailable')); await expect(centralContactRecipients(db,'neture.inbox')).rejects.toThrow();
});
it('keeps federation central and excludes independent services and individual cooperatives', () => {
 expect(CENTRAL_CONTACT_MENUS.pharmcoop).toBe('pharmcoop.inbox');
 expect(CENTRAL_CONTACT_MENUS.drugstore).toBeUndefined(); expect(CENTRAL_CONTACT_MENUS.carepharm).toBeUndefined();
 expect(CENTRAL_CONTACT_MENUS['synthetic-coop']).toBeUndefined();
});
