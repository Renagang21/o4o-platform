import { getNetureMainMembershipStatus, resolveNetureMainMembershipStatus, type NetureMainMembershipRow } from '../neture-main-membership.js';

const active = { account_status: 'active', account_active: true, email_verified: true };
describe('joined and single-user main eligibility share the same policy', () => {
  it.each<[string, NetureMainMembershipRow | undefined, string]>([
    ['missing account', undefined, 'none'],
    ['verified usable account without membership', active, 'active'],
    ['approved account', { ...active, account_status: 'approved' }, 'active'],
    ['legacy pending membership', { ...active, membership_status: 'pending' }, 'active'],
    ['legacy rejected membership', { ...active, membership_status: 'rejected' }, 'active'],
    ['unverified email', { ...active, email_verified: false }, 'pending'],
    ['inactive account', { ...active, account_active: false }, 'suspended'],
    ['suspended account', { ...active, account_status: 'suspended' }, 'suspended'],
    ['rejected account', { ...active, account_status: 'rejected' }, 'rejected'],
    ['pending account', { ...active, account_status: 'pending' }, 'pending'],
    ['suspended main membership', { ...active, membership_status: 'suspended' }, 'suspended'],
    ['withdrawn main membership', { ...active, membership_status: 'withdrawn' }, 'withdrawn'],
  ])('%s', async (_label, row, expected) => {
    expect(resolveNetureMainMembershipStatus(row)).toBe(expected);
    const exec = { query: jest.fn(async () => row ? [row] : []) };
    expect(await getNetureMainMembershipStatus(exec, 'fixture-user')).toBe(expected);
    expect(exec.query).toHaveBeenCalledWith(expect.any(String), ['fixture-user', 'neture']);
  });
});
