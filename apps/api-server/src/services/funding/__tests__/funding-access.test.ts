jest.mock('../../../modules/neture/services/neture-main-membership.js', () => ({ getNetureMainMembershipStatus: jest.fn() }));
jest.mock('../../../modules/neture/middleware/supplier-context.resolver.js', () => ({ resolveSupplierForUser: jest.fn() }));
import { MarketTrial, TrialStatus } from '@o4o/market-trial';
import { getNetureMainMembershipStatus } from '../../../modules/neture/services/neture-main-membership.js';
import { resolveSupplierForUser } from '../../../modules/neture/middleware/supplier-context.resolver.js';
import { isFundingCreator, resolveFundingAccess } from '../funding-access.js';

const ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const origin = { reason: 'funding_created', supplierAccountId: 'supplier-a', supplierOrganizationId: 'org-a' };
const main = getNetureMainMembershipStatus as jest.Mock, supplier = resolveSupplierForUser as jest.Mock;
let operator = false, participant = false, member = false;
let trial: MarketTrial;
const ds: any = {
  getRepository: () => ({ findOne: async () => trial }),
  query: jest.fn(async (sql: string, args: string[]) => {
    if (sql.includes("ra.role IN ('funding:admin'")) return operator ? [{}] : [];
    if (sql.includes('FROM market_trial_participants')) { expect(args).toEqual([ID, 'actor']); return participant ? [{}] : []; }
    if (sql.includes('FROM forum_category_members')) return member ? [{}] : [];
    if (sql.includes('FROM forum_category_requests')) { expect(args).toEqual([`funding-${ID}`, `funding:${ID}`]); return [{ id: 'board', slug: `funding-${ID}` }]; }
    return [];
  }),
};
beforeEach(() => {
  main.mockResolvedValue('active'); supplier.mockResolvedValue({ kind: 'resolved', supplierId: 'supplier-a', status: 'ACTIVE' });
  operator = participant = member = false; ds.query.mockClear();
  trial = { id: ID, supplierId: 'creator', status: TrialStatus.RECRUITING, statusHistory: [origin] } as any;
});
it.each([
  [false, true, false, false], [false, true, true, true], [false, false, true, false], [true, false, false, true],
])('requires participant AND board membership, or a current operator: %p/%p/%p', async (op, joined, approved, read) => {
  operator = op; participant = joined; member = approved;
  expect(await resolveFundingAccess(ds, ID, 'actor')).toMatchObject({ canRead: read, canWrite: read, canManage: false });
});
it.each(['draft', 'submitted', 'closed'])('does not allow writes to %s', async status => {
  operator = true; trial.status = status as TrialStatus;
  expect(await resolveFundingAccess(ds, ID, 'actor')).toMatchObject({ canWrite: false });
});
it('revocation blocks the next request despite retained membership or client roles', async () => {
  participant = member = true;
  expect((await resolveFundingAccess(ds, ID, 'actor'))?.canRead).toBe(true);
  main.mockResolvedValue('suspended');
  expect(await resolveFundingAccess(ds, ID, 'actor')).toBeNull();
});
it('preserves the original organization binding and rejects supplier suspension/reassignment', async () => {
  trial.supplierId = 'actor';
  expect(await isFundingCreator(ds, trial, 'actor')).toBe(true);
  expect(supplier).toHaveBeenCalledWith(ds, 'actor', 'org-a');
  supplier.mockResolvedValue({ kind: 'resolved', supplierId: 'supplier-b', status: 'ACTIVE' });
  expect(await isFundingCreator(ds, trial, 'actor')).toBe(false);
  supplier.mockResolvedValue({ kind: 'resolved', supplierId: 'supplier-a', status: 'SUSPENDED' });
  expect(await isFundingCreator(ds, trial, 'actor')).toBe(false);
});
it('keeps historical user-owned funding eligible without assigning an arbitrary organization', async () => {
  trial.supplierId = 'actor'; trial.statusHistory = [];
  supplier.mockResolvedValue({ kind: 'context_required', candidates: [{ status: 'ACTIVE' }, { status: 'SUSPENDED' }] });
  expect(await isFundingCreator(ds, trial, 'actor')).toBe(true);
  expect(supplier).toHaveBeenCalledWith(ds, 'actor', null);
});

it.each(['creator', 'operator', 'participant'])('keeps proven closed legacy funding readable by %s without settlement or approval backfill', async role => {
  trial.status = TrialStatus.CLOSED;
  trial.statusHistory = [{ from: 'fulfilled', to: 'closed', at: '2026-10-11T00:00:00Z', reason: 'creator_progress', auto: false }];
  if (role === 'creator') trial.supplierId = 'actor';
  operator = role === 'operator';
  participant = member = role === 'participant';
  expect(await resolveFundingAccess(ds, ID, 'actor')).toMatchObject({ canRead: true, canWrite: false });
});
it('keeps ambiguous closed legacy funding unavailable even to a board member', async () => {
  trial.status = TrialStatus.CLOSED; trial.statusHistory = [];
  participant = member = true;
  expect(await resolveFundingAccess(ds, ID, 'actor')).toMatchObject({ canRead: false, canWrite: false });
});
