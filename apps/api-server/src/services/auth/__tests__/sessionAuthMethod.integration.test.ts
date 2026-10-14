import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { User } from '../../../entities/User.js';
let db: DataSource;
const getRoleNames = jest.fn(async (): Promise<string[]> => []);
const repo = {
  findOne: async ({ where }: { where: { id: string } }) => {
    const rows = await db.query('SELECT * FROM public.users WHERE id=$1', [where.id]);
    return rows[0] ? Object.assign(new User(), rows[0]) : null;
  },
  get manager() { return db.manager; },
};
jest.mock('../../../database/connection.js', () => ({ AppDataSource: {
  query: (...args: any[]) => (db.query as any)(...args),
  getRepository: () => repo, get manager() { return db.manager; },
} }));
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({ roleAssignmentService: { getRoleNames } }));
jest.mock('../../../modules/policy-acceptance/policy-acceptance.service.js', () => ({ policyAcceptanceService: { getEnforcedPendingForUser: jest.fn(async () => []) } }));

import { generateTokensWithContext } from '../auth-context.helper.js';
import { AuthTokenSessionService } from '../auth-token-session.service.js';
import * as tokens from '../../../utils/token.utils.js';
import { HandoffController } from '../../../modules/auth/controllers/handoff.controller.js';
import { requireAuth } from '../../../common/middleware/auth/authentication.middleware.js';
import { mockHandoffRes } from '../../../__tests__/support/handoff-http.js';
import { AllowKakaoHandoffAuthMethod1791527589096 } from '../../../database/migrations/1791527589096-AllowKakaoHandoffAuthMethod.js';

const port = Number(process.env.O4O_AUTH_SESSION_TEST_PORT);
const isolated = Number.isInteger(port) && port > 1024 && ![5432, 5442].includes(port) ? describe : describe.skip;
isolated('session authentication method (isolated PostgreSQL 15)', () => {
  let user: User;
  const issue = (method: 'google' | 'password' | 'kakao') => generateTokensWithContext(user, 'neture.co.kr', 'neture', method, { roles: [], memberships: [] });
  const startHandoff = async (access: string) => {
    // HTTP requireAuth reloads the User after login initialized the security family.
    user = (await repo.findOne({ where: { id: user.id } }))!;
    const res = mockHandoffRes();
    await HandoffController.generateHandoff({ user, body: { targetServiceKey: 'neture', authMethod: 'google' }, headers: { authorization: `Bearer ${access}` }, cookies: {}, get: () => 'https://neture.co.kr' } as any, res);
    expect(res.statusCode).toBe(200); return res.body.data.targetUrl;
  };
  const exchange = async (token: string) => {
    const res = mockHandoffRes();
    await HandoffController.exchangeHandoff({ body: { token }, headers: {}, cookies: {}, get: () => 'https://neture.co.kr' } as any, res);
    return res;
  };
  beforeAll(async () => {
    process.env.JWT_SECRET ||= randomUUID(); process.env.JWT_REFRESH_SECRET ||= randomUUID();
    db = new DataSource({ type: 'postgres', host: '127.0.0.1', port, username: 'o4o_fixture', database: 'o4o_auth_phase4a_test', entities: [], synchronize: false });
    await db.initialize();
    const [check] = await db.query("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname='chk_handoff_source_auth_method'");
    expect(check.definition).toContain('kakao');
  });
  afterAll(async () => { if (db?.isInitialized) await db.destroy(); });
  beforeEach(async () => {
    getRoleNames.mockResolvedValue([]);
    const [row] = await db.query(`INSERT INTO public.users(email,status,"isActive","isEmailVerified") VALUES ($1,'active',true,true) RETURNING *`, [`${randomUUID()}@fixture.invalid`]);
    user = Object.assign(new User(), row);
  });
  afterEach(async () => {
    // Handoff's historical schema has no user FK: clean the owned fixture explicitly.
    await db.query('DELETE FROM public.handoff_tokens WHERE user_id=$1', [user.id]);
    await db.query('DELETE FROM public.users WHERE id=$1', [user.id]);
  });
  it.each(['google', 'password', 'kakao'] as const)('real %s access → ledger → exchange → refresh retains the verified method', async (method) => {
    const first = (await issue(method)).tokens;
    const handoffUrl = await startHandoff(first.accessToken);
    const code = new URL(handoffUrl).searchParams.get('token')!;
    expect((await db.query('SELECT source_auth_method FROM public.handoff_tokens WHERE id=$1', [code]))[0].source_auth_method).toBe(method);
    const out = await exchange(code); expect(out.statusCode).toBe(200);
    const refreshed = await new AuthTokenSessionService().refreshTokens(out.body.data.tokens.refreshToken);
    for (const pair of [first, out.body.data.tokens, refreshed]) {
      expect(tokens.verifyAccessToken(pair.accessToken)!.authMethod).toBe(method);
      expect(tokens.verifyRefreshToken(pair.refreshToken)!.authMethod).toBe(method);
    }
    const reused = await exchange(code); expect(reused.statusCode).toBe(401);
  });
  it.each(['password', 'kakao'] as const)('role assignment after %s issuance blocks request, refresh and a pending handoff', async (method) => {
    const first = (await issue(method)).tokens;
    const code = new URL(await startHandoff(first.accessToken)).searchParams.get('token')!;
    getRoleNames.mockResolvedValue(['platform:super_admin']);
    const expectedCode = method === 'password' ? 'PASSWORD_SESSION_NOT_ALLOWED' : 'GOOGLE_SESSION_REQUIRED';
    const res = mockHandoffRes(); const next = jest.fn();
    await requireAuth({ headers: { authorization: `Bearer ${first.accessToken}` }, cookies: {}, method: 'GET', originalUrl: '/api/v1/auth/me' } as any, res, next);
    expect([res.statusCode, res.body.code]).toEqual([403, expectedCode]); expect(next).not.toHaveBeenCalled();
    await expect(new AuthTokenSessionService().refreshTokens(first.refreshToken)).rejects.toMatchObject({ code: expectedCode });
    const out = await exchange(code); expect([out.statusCode, out.body.code]).toEqual([403, expectedCode]);
  });
  it('rollback cannot discard or relabel a Kakao ledger row', async () => {
    const first = (await issue('kakao')).tokens;
    await startHandoff(first.accessToken);
    const q = db.createQueryRunner(); await q.startTransaction();
    try {
      await expect(new AllowKakaoHandoffAuthMethod1791527589096().down(q)).rejects.toThrow('Kakao handoff rows remain');
      const [check] = await q.query("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname='chk_handoff_source_auth_method'");
      expect(check.definition).toContain('kakao');
    } finally { await q.rollbackTransaction(); await q.release(); }
    expect((await db.query('SELECT source_auth_method FROM public.handoff_tokens WHERE user_id=$1', [user.id]))[0].source_auth_method).toBe('kakao');
  });
});
