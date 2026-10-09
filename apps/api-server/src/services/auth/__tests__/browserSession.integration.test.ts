import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { User } from '../../../entities/User.js';

let db: DataSource;
const repository = {
  findOne: async ({ where }: { where: { id: string } }) => {
    const rows = await db.query('SELECT * FROM users WHERE id = $1', [where.id]);
    return rows[0] ? Object.assign(new User(), rows[0]) : null;
  },
  update: async () => {},
  create: (data: object) => data,
  save: async (data: object) => data,
  get manager() { return db.manager; },
};
jest.mock('../../../database/connection.js', () => ({
  AppDataSource: {
    query: (...args: any[]) => (db.query as any)(...args),
    getRepository: () => repository,
    get manager() { return db.manager; },
  },
}));
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({ roleAssignmentService: { getRoleNames: jest.fn(async () => []) } }));
jest.mock('../../../modules/policy-acceptance/policy-acceptance.service.js', () => ({ policyAcceptanceService: { getEnforcedPendingForUser: jest.fn(async () => []) } }));

import { generateTokensWithContext } from '../auth-context.helper.js';
import { AuthTokenSessionService } from '../auth-token-session.service.js';
import { EmailAuthService, hashToken } from '../email-auth.service.js';
import { passwordCredentialService } from '../password-credential.service.js';
import { isBrowserSessionLive } from '../browser-session.service.js';
import { requireAuth } from '../../../common/middleware/auth/authentication.middleware.js';
import { handoffTokenService } from '../../handoff-token.service.js';
import { HandoffController } from '../../../modules/auth/controllers/handoff.controller.js';
import { AuthSessionController } from '../../../modules/auth/controllers/auth-session.controller.js';
import * as tokenUtils from '../../../utils/token.utils.js';
import { mockHandoffRes } from '../../../__tests__/support/handoff-http.js';

// Never load app.env or accept a configurable remote DB. This fixture is created by local verification.
const port = Number(process.env.O4O_AUTH_SESSION_TEST_PORT);
const integration = Number.isInteger(port) && port > 1024 && ![5432, 5442].includes(port) ? describe : describe.skip;
integration('browser and password boundary (isolated PostgreSQL)', () => {
  let user: User;
  let email: EmailAuthService;
  let sessions: AuthTokenSessionService;
  const context = { roles: [], memberships: [] };
  const oldPassword = 'oldFixture123!'; const newPassword = 'newFixture123!';
  const issue = (key = 'neture', snapshot = user) => generateTokensWithContext(snapshot, 'neture.co.kr', key, 'password', context);
  const reload = async () => { user = (await repository.findOne({ where: { id: user.id } }))!; };
  const protectedRequest = async (token: string) => {
    const res = mockHandoffRes(); const next = jest.fn();
    await requireAuth({ headers: { authorization: `Bearer ${token}` }, cookies: {}, method: 'GET', originalUrl: '/api/v1/auth/me' } as any, res, next);
    return { status: next.mock.calls.length ? 200 : res.statusCode, code: res.body?.code };
  };
  const pendingHandoff = async (tokens: { accessToken: string }) => {
    const claims = tokenUtils.verifyAccessToken(tokens.accessToken)!;
    return handoffTokenService.generateToken(user.id, claims.serviceKey!, 'neture', 0, 'password', claims.sessionId, claims.tokenFamily);
  };
  const exchange = async (token: string) => {
    const res = mockHandoffRes();
    await HandoffController.exchangeHandoff({ body: { token }, headers: {}, cookies: {}, get: () => 'https://neture.co.kr' } as any, res);
    return res;
  };
  beforeAll(async () => {
    process.env.JWT_SECRET ||= randomUUID(); process.env.JWT_REFRESH_SECRET ||= randomUUID();
    db = new DataSource({ type: 'postgres', host: '127.0.0.1', port, username: 'o4o_fixture', database: 'o4o_auth_phase2_test', entities: [], synchronize: false });
    await db.initialize();
    expect((await db.query("SELECT to_regclass('public.browser_session_revocations') AS name"))[0].name).toBe('browser_session_revocations');
  });
  afterAll(async () => { if (db?.isInitialized) await db.destroy(); });
  beforeEach(async () => {
    const row = (await db.query(`INSERT INTO users(email,name,status,"isActive","isEmailVerified") VALUES ($1,'Session fixture','active',true,true) RETURNING *`, [`${randomUUID()}@fixture.invalid`]))[0];
    user = Object.assign(new User(), row);
    await passwordCredentialService.setPassword(user.id, oldPassword, db.manager);
    sessions = new AuthTokenSessionService();
    email = new EmailAuthService({
      dataSource: { query: db.query.bind(db), getRepository: () => repository as any, transaction: (callback: (manager: any) => Promise<unknown>) => db.transaction(async (manager) => callback({
        query: manager.query.bind(manager),
        getRepository: () => ({ update: ({ id }: { id: string }) => manager.query('UPDATE users SET "isEmailVerified"=true WHERE id=$1', [id]) }),
      })) } as any,
      passwords: {
        hasPassword: (id, manager) => passwordCredentialService.hasPassword(id, manager ?? db.manager),
        verifyPassword: (id, plain, manager) => passwordCredentialService.verifyPassword(id, plain, manager ?? db.manager),
        setPassword: (id, plain, manager) => passwordCredentialService.setPassword(id, plain, manager ?? db.manager),
      },
      readRoles: async () => [], readContext: async () => context,
      revokeAllSessions: (id, manager) => sessions.revokeAllSessions(id, manager),
    });
  });
  afterEach(async () => { if (user?.id) await db.query('DELETE FROM users WHERE id = $1', [user.id]); });

  it('current-browser logout rejects access/refresh/pending handoff and preserves another browser and origin', async () => {
    const a = (await issue()).tokens; await reload(); const b = (await issue()).tokens; const c = (await issue('supplier')).tokens;
    const pending = await pendingHandoff(a); const claim = tokenUtils.verifyAccessToken(a.accessToken)!;
    await sessions.logout(user.id, claim.serviceKey!, claim.sessionId!);
    expect(await protectedRequest(a.accessToken)).toMatchObject({ status: 401, code: 'SESSION_REVOKED' });
    await expect(sessions.refreshTokens(a.refreshToken)).rejects.toMatchObject({ code: 'SERVICE_SESSION_REVOKED' });
    expect((await exchange(pending)).statusCode).toBe(401);
    for (const tokens of [b, c]) { expect((await protectedRequest(tokens.accessToken)).status).toBe(200); await expect(sessions.refreshTokens(tokens.refreshToken)).resolves.toBeDefined(); }
    const fresh = (await issue()).tokens;
    expect((await protectedRequest(fresh.accessToken)).status).toBe(200);
    expect((await protectedRequest(a.accessToken)).status).toBe(401);
  });
  it('password change atomically rejects every old access/refresh/pending handoff and accepts only the new password', async () => {
    const a = (await issue()).tokens; await reload(); const b = (await issue('supplier')).tokens; const pending = await pendingHandoff(a);
    await email.setPasswordForUser(user.id, { currentPassword: oldPassword, newPassword });
    expect(await passwordCredentialService.verifyPassword(user.id, oldPassword, db.manager)).toBe(false);
    expect(await passwordCredentialService.verifyPassword(user.id, newPassword, db.manager)).toBe(true);
    for (const tokens of [a, b]) { expect((await protectedRequest(tokens.accessToken)).status).toBe(401); await expect(sessions.refreshTokens(tokens.refreshToken)).rejects.toMatchObject({ code: 'TOKEN_FAMILY_MISMATCH' }); }
    expect((await exchange(pending)).statusCode).toBe(401);
    await reload(); const fresh = (await issue()).tokens;
    expect((await protectedRequest(fresh.accessToken)).status).toBe(200);
    expect((await protectedRequest(a.accessToken)).status).toBe(401);
  });
  it.each(['cookie', 'body'])('expired access can revoke its browser through the request %s refresh snapshot', async source => {
    const old = (await issue()).tokens; await reload(); const other = (await issue()).tokens;
    const claims = tokenUtils.verifyAccessToken(old.accessToken)!;
    const expired = jwt.sign({ ...claims, exp: Math.floor(Date.now() / 1000) - 1 }, process.env.JWT_SECRET!);
    const req: any = { body: source === 'body' ? { refreshToken: old.refreshToken } : {},
      cookies: source === 'cookie' ? { refreshToken: old.refreshToken } : {},
      headers: { authorization: `Bearer ${expired}` }, method: 'POST', originalUrl: '/api/v1/auth/logout', get: () => 'https://neture.co.kr' };
    const response = mockHandoffRes(); const prepared = jest.fn();
    await AuthSessionController.prepareLogoutAuth(req, response, prepared);
    expect(prepared).toHaveBeenCalled();
    const authenticated = jest.fn(); await requireAuth(req, response, authenticated);
    expect(authenticated).toHaveBeenCalled();
    // The controller's cookie cleanup is transport-only; use the real revocation service.
    const recovered = tokenUtils.verifyAccessToken(req.headers.authorization.slice(7))!;
    expect(recovered.sessionId).toBe(claims.sessionId);
    await sessions.logout(user.id, recovered.serviceKey!, recovered.sessionId!);
    await expect(sessions.refreshTokens(old.refreshToken)).rejects.toMatchObject({ code: 'SERVICE_SESSION_REVOKED' });
    expect((await protectedRequest(other.accessToken)).status).toBe(200);
  });
  it('reset is one-use and immediately denies access/refresh/handoff before any expiry', async () => {
    const old = (await issue()).tokens; await reload(); const pending = await pendingHandoff(old); const reset = randomUUID();
    await db.query(`INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '5 minutes')`, [user.id, hashToken(reset)]);
    await email.resetPassword(reset, newPassword);
    expect((await protectedRequest(old.accessToken)).status).toBe(401);
    await expect(sessions.refreshTokens(old.refreshToken)).rejects.toMatchObject({ code: 'TOKEN_FAMILY_MISMATCH' });
    expect((await exchange(pending)).statusCode).toBe(401);
    await expect(email.resetPassword(reset, 'anotherFixture123!')).rejects.toMatchObject({ code: 'INVALID_OR_EXPIRED_TOKEN' });
    expect(await passwordCredentialService.verifyPassword(user.id, newPassword, db.manager)).toBe(true);
  });
  it('failed revocation rolls back the password instead of saving an unrevoked credential', async () => {
    const old = (await issue()).tokens; await reload();
    const broken = new EmailAuthService({ ...((email as any)._dataSource ? { dataSource: (email as any)._dataSource } : {}),
      passwords: (email as any).passwords, readRoles: async () => [], revokeAllSessions: async () => { throw new Error('fixture failure'); } });
    await expect(broken.setPasswordForUser(user.id, { currentPassword: oldPassword, newPassword })).rejects.toThrow('fixture failure');
    expect(await passwordCredentialService.verifyPassword(user.id, oldPassword, db.manager)).toBe(true);
    expect(await passwordCredentialService.verifyPassword(user.id, newPassword, db.manager)).toBe(false);
    expect((await protectedRequest(old.accessToken)).status).toBe(200);
  });
  it('failed reset revocation rolls back token consumption and password, so the reset can be retried', async () => {
    const reset = randomUUID();
    await db.query(`INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '5 minutes')`, [user.id, hashToken(reset)]);
    const broken = new EmailAuthService({ dataSource: (email as any)._dataSource, passwords: (email as any).passwords, readRoles: async () => [],
      revokeAllSessions: async () => { throw new Error('fixture failure'); } });
    await expect(broken.resetPassword(reset, newPassword)).rejects.toThrow('fixture failure');
    expect(await passwordCredentialService.verifyPassword(user.id, oldPassword, db.manager)).toBe(true);
    await expect(email.resetPassword(reset, newPassword)).resolves.toBeUndefined();
    expect(await passwordCredentialService.verifyPassword(user.id, newPassword, db.manager)).toBe(true);
  });
  it('a login verified before password change cannot restore the account generation, including a null legacy family', async () => {
    const stale = Object.assign(new User(), user); // null family before first login
    await email.setPasswordForUser(user.id, { currentPassword: oldPassword, newPassword });
    await expect(issue('neture', stale)).rejects.toMatchObject({ code: 'SESSION_CHANGED_RETRY_LOGIN' });
    await reload(); expect((await issue()).tokens.accessToken).toBeTruthy();
  });
  it('uses the database generation even when middleware already captured the old User', async () => {
    const old = (await issue()).tokens; await reload(); const claims = tokenUtils.verifyAccessToken(old.accessToken)!; const capturedFamily = user.refreshTokenFamily;
    await email.setPasswordForUser(user.id, { currentPassword: oldPassword, newPassword });
    expect(await isBrowserSessionLive(user.id, claims, capturedFamily, db.manager)).toBe(false);
  });
  it('Demo password status forbids management and a direct mutation leaves its hash unchanged', async () => {
    await db.query("INSERT INTO demo_accounts(user_id,demo_type) VALUES ($1,'STORE_OWNER')", [user.id]);
    const row = { user_id: user.id };
    const before = await db.query('SELECT password_hash FROM user_password_credentials WHERE user_id=$1', [row.user_id]);
    expect(await email.getPasswordStatus(row.user_id)).toMatchObject({ canManage: false });
    await expect(email.setPasswordForUser(row.user_id, { newPassword })).rejects.toMatchObject({ code: 'DEMO_ACCOUNT_FORBIDDEN' });
    expect(await db.query('SELECT password_hash FROM user_password_credentials WHERE user_id=$1', [row.user_id])).toEqual(before);
  });
});
