import { getBusinessInfo } from '../services/business-info.js';
describe('business application metadata', () => {
  it('returns only public application fields and performs a parameterized active-business read', async () => {
    const exec = { query: jest.fn(async (_sql: string, _params: unknown[]) => [{ key: 'pharmacy', name: '사업', communityKey: 'members', registrationConditions: '조건', payment_receiver_key: 'private', operator_user_id: 'private' }]) };
    expect(await getBusinessInfo(exec, 'pharmacy')).toEqual({ key: 'pharmacy', name: '사업', communityKey: 'members', registrationConditions: '조건' });
    expect(exec.query).toHaveBeenCalledWith(expect.stringContaining("status = 'active'"), ['pharmacy']);
    expect(exec.query).toHaveBeenCalledTimes(1);
    const sql = exec.query.mock.calls[0][0];
    expect(sql).toContain("metadata->>'registrationConditions'");
    expect(sql).toContain("FROM organizations WHERE id = sf.organization_id");
    expect(sql).not.toMatch(/\bregistration_conditions\b/);
  });
  it('missing or inactive businesses are unavailable for application', async () => {
    await expect(getBusinessInfo({ query: async () => [] }, 'inactive')).rejects.toMatchObject({ httpStatus: 404, code: 'BUSINESS_NOT_FOUND' });
  });
});
