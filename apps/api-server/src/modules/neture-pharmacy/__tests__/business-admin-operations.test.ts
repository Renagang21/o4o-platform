import { SemiFranchiseService } from '../services/semi-franchise.service.js';
const query = jest.fn();
const manager = { query };
const transaction = jest.fn(async run => run(manager));
const db = { query, transaction } as any;
const sf = { id: 'business', key: 'fixture', name: 'Fixture', status: 'active', organization_id: 'organization' };
beforeEach(() => {
  jest.clearAllMocks();
  query.mockImplementation(async sql => {
    if (sql.includes('FROM semi_franchises sf')) return [sf];
    if (sql.includes('FROM role_assignments')) return [{ role: 'neture:operator' }];
    if (sql.includes('SELECT u.status')) return [{ account_status: 'active', account_active: true, email_verified: true }];
    if (sql.startsWith('INSERT INTO semi_franchise_operators')) return [{ id: 'assignment' }];
    if (sql.includes('UPDATE semi_franchise_operators')) return [[{ id: 'assignment' }], 1];
    return [];
  });
});
it('assigns only currently eligible operators and records actor/business in the same transaction', async () => {
  expect(await new SemiFranchiseService(db).assignOperator('fixture', 'operator', 'service-admin')).toEqual({ assigned: true });
  expect(transaction).toHaveBeenCalledTimes(1);
  const audit = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO action_logs'))!;
  expect(audit[1].slice(0, 3)).toEqual(['neture', 'service-admin', 'business.admin.operator_assign']);
  expect(JSON.parse(audit[1][3].toPostgres())).toEqual({ businessId: 'business', userId: 'operator' });
});
it.each(['expired-role', 'suspended-main'])('does not assign a business when eligibility is %s', async mode => {
  const original = query.getMockImplementation()!;
  query.mockImplementation(async sql => mode === 'expired-role' && sql.includes('FROM role_assignments') ? []
    : mode === 'suspended-main' && sql.includes('SELECT u.status') ? [{ account_status: 'active', account_active: true, email_verified: true, membership_status: 'suspended' }] : original(sql));
  await expect(new SemiFranchiseService(db).assignOperator('fixture', 'operator', 'admin')).rejects.toMatchObject({ code: 'NOT_NETURE_OPERATOR' });
  expect(query.mock.calls.some(([sql]) => sql.startsWith('INSERT'))).toBe(false);
});
it('revocation audit is required before its transaction can resolve', async () => {
  const original = query.getMockImplementation()!;
  query.mockImplementation(async sql => { if (sql.includes('INSERT INTO action_logs')) throw new Error('audit failed'); return original(sql); });
  await expect(new SemiFranchiseService(db).revokeOperator('fixture', 'operator', 'admin')).rejects.toThrow('audit failed');
});
