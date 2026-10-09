/** Authenticated entry permits introductions; service APIs retain authorization. */
const query = jest.fn().mockResolvedValue([]);
const sfQuery = jest.fn().mockResolvedValue([]);
const findOne = jest.fn();
jest.mock('../database/connection.js', () => ({
  AppDataSource: {
    isInitialized: true,
    query: (...args: unknown[]) =>
      /neture_pharmacy_memberships/i.test(String(args[0] ?? '')) ? sfQuery(...args) : query(...args),
    getRepository: () => ({ findOne: (...args: unknown[]) => findOne(...args) }),
    manager: {
      query: (...args: unknown[]) => {
        const sql = String(args[0] ?? '');
        if (/browser_session_revocations/i.test(sql)) return Promise.resolve([{ '?column?': 1 }]);
        if (/service_session_revocations/i.test(sql)) return Promise.resolve([]);
        return query(...args);
      },
    },
  },
}));
jest.mock('../modules/auth/entities/User.js', () => ({ User: class User {} }));
jest.mock('../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { getRoleNames: jest.fn(async () => []) },
}));
const generateTokens = jest.fn(() => ({ accessToken: 'AT', refreshToken: 'RT', expiresIn: 900 }));
jest.mock('../utils/token.utils.js', () => ({
  generateTokens: (...a: unknown[]) => generateTokens(...a),
  verifyAccessToken: () => ({ userId: 'user-1', serviceKey: 'neture', sessionId: '00000000-0000-4000-8000-000000000001', tokenFamily: 'fam-1' }),
}));
jest.mock('../services/auth/auth-context.helper.js', () => ({
  readUserMembershipsWithMainAccess: (id: string) => query(`SELECT service_key AS "serviceKey", status FROM service_memberships WHERE user_id = $1`, [id]), persistRefreshTokenFamily: jest.fn(async () => undefined) }));
jest.mock('../utils/cookie.utils.js', () => ({ setAuthCookies: jest.fn() }));
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../utils/service-tenant.resolver.js', () => ({ resolveAccessibleStores: jest.fn() }));

import { mockHandoffReq, mockHandoffRes } from './support/handoff-http.js';
import { HandoffController } from '../modules/auth/controllers/handoff.controller.js';

const uuid = '11111111-2222-4333-8444-555555555555';
const USER = { id: 'user-1', email: 'u@example.test', name: 'U', isActive: true, status: 'active', refreshTokenFamily: 'fam-1' };
const req = (body: Record<string, unknown>, origin: string, user: unknown = USER) => mockHandoffReq(body, origin, { user, accessToken: 'fixture-access' });
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const sqlCalls = () => query.mock.calls.map((c) => norm(String(c[0])));

beforeEach(() => {
  query.mockReset();
  query.mockResolvedValue([]);
  sfQuery.mockReset();
  sfQuery.mockResolvedValue([]);
  findOne.mockReset();
  generateTokens.mockClear();
});

describe('authenticated entry does not grant service access', () => {
  it.each(['kpa-society', 'pharmacy-hub', 'lecture'])('nonmember can move to %s introduction without membership writes', async (target) => {
    query.mockResolvedValueOnce([{ id: uuid }]).mockResolvedValueOnce([]);
    const res = mockHandoffRes();
    await HandoffController.generateHandoff(req({ targetServiceKey: target }, 'https://neture.co.kr'), res);
    expect(res.statusCode).toBe(200);
    expect(sfQuery).not.toHaveBeenCalled();
    expect(sqlCalls().join(' ')).not.toMatch(/INSERT INTO service_memberships|UPDATE service_memberships/);
  });
  it.each([[[]], [[{ serviceKey: 'kpa-society', status: 'pending' }]], [[{ serviceKey: 'kpa-society', status: 'suspended' }]]])('exchange preserves actual memberships %j without elevation', async (memberships) => {
    query.mockResolvedValueOnce([[{ user_id: USER.id, source_service_key: 'neture', source_session_id: '00000000-0000-4000-8000-000000000001', source_token_family: 'fam-1', target_service_key: 'kpa-society', created_at: new Date(), source_auth_method: 'google' }], 1]).mockResolvedValueOnce(memberships);
    findOne.mockResolvedValue(USER);
    const res = mockHandoffRes();
    await HandoffController.exchangeHandoff(req({ token: uuid }, 'https://pharmacy.neture.co.kr'), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.memberships).toEqual(memberships);
    expect(res.body.data.user.roles).toEqual([]);
  });
  it('account suspension still blocks exchange', async () => {
    query.mockResolvedValueOnce([[{ user_id: USER.id, source_service_key: 'neture', source_session_id: '00000000-0000-4000-8000-000000000001', source_token_family: 'fam-1', target_service_key: 'kpa-society', created_at: new Date(), source_auth_method: 'google' }], 1]);
    findOne.mockResolvedValue({ ...USER, status: 'suspended' });
    const res = mockHandoffRes();
    await HandoffController.exchangeHandoff(req({ token: uuid }, 'https://pharmacy.neture.co.kr'), res);
    expect(res.statusCode).toBe(403); expect(generateTokens).not.toHaveBeenCalled();
  });
});
