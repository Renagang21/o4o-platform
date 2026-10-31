/** Real local PostgreSQL token ledger + controllers + client origin verification.
 * Only authentication signing and the DataSource binding are fixture adapters.
 */
import type { DataSource } from 'typeorm';
let database: DataSource;
const query = (sql: string, params?: unknown[]) => database.query(sql, params);
jest.mock('../database/connection.js', () => ({ AppDataSource: {
  query: (...args: [string, unknown[]?]) => query(...args),
  manager: { query: (...args: [string, unknown[]?]) => query(...args) },
  getRepository: () => ({ findOne: async ({ where }: any) => (await query('SELECT * FROM users WHERE id=$1', [where.id]))[0] }),
} }));
jest.mock('../modules/auth/entities/User.js', () => ({ User: class User {} }));
jest.mock('../modules/auth/services/role-assignment.service.js', () => ({ roleAssignmentService: { getRoleNames: async (id: string) => (await query('SELECT role FROM role_assignments WHERE user_id=$1 AND is_active', [id])).map((r: any) => r.role) } }));
jest.mock('../services/auth/auth-context.helper.js', () => ({ readUserMembershipsWithMainAccess: (id: string) => query('SELECT service_key AS "serviceKey", status FROM service_memberships WHERE user_id=$1', [id]) }));
const actor = '11111111-1111-4111-8111-111111111111';
const session = '22222222-2222-4222-8222-222222222222';
const generateTokens = jest.fn(() => ({ accessToken: 'fixture-session', refreshToken: 'fixture-refresh', expiresIn: 900 }));
jest.mock('../utils/token.utils.js', () => ({
  verifyAccessToken: () => ({ userId: actor, serviceKey: 'store', sessionId: session, tokenFamily: 'fixture-family', authMethod: 'google' }),
  generateTokens: (...args: unknown[]) => generateTokens(...args),
}));
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
import { createCarePharmReviewDb } from './support/carepharm-review-db.js';
import { mockHandoffReq, mockHandoffRes } from './support/handoff-http.js';
import { HandoffIssuanceController } from '../modules/auth/controllers/handoff-issuance.controller.js';
import { HandoffExchangeController } from '../modules/auth/controllers/handoff-exchange.controller.js';
import { requestServiceHandoff } from '../../../../packages/auth-react/src/serviceHandoff';
import { cooperationDestination } from '../../../../packages/shared-space-ui/src/cooperation/models';

const suite = process.env.CAREPHARM_REVIEW_DATABASE_URL ? describe : describe.skip;
suite('CarePharm issuer → actual client → exchange, isolated PostgreSQL', () => {
  let close: () => Promise<void>;
  const user = { id: actor, refreshTokenFamily: 'fixture-family' };
  const issue = async (body: Record<string, unknown>) => {
    const res = mockHandoffRes();
    await HandoffIssuanceController.generateHandoff(mockHandoffReq(body, 'https://store.neture.co.kr', { user, accessToken: 'signed-fixture-boundary' }), res);
    return res;
  };
  const api = { post: async (_path: string, body: unknown) => {
    const res = await issue(body as Record<string, unknown>);
    if (res.statusCode !== 200) throw new Error(`Issuer rejected ${res.statusCode}`);
    return { data: res.body };
  } };
  const exchange = async (token: string, origin: string) => {
    const res = mockHandoffRes();
    await HandoffExchangeController.exchangeHandoff(mockHandoffReq({ token }, origin), res);
    return res;
  };
  beforeAll(async () => {
    const fixture = await createCarePharmReviewDb(); database = fixture.ds; close = fixture.close;
    await query(`CREATE TABLE users (id uuid PRIMARY KEY, email text, name text, "isActive" boolean, "isEmailVerified" boolean, status text, "refreshTokenFamily" text);
      CREATE TABLE handoff_tokens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, source_service_key text, target_service_key text, target_workspace text, expires_at timestamptz, source_session_epoch integer, source_auth_method text, source_session_id uuid, source_token_family text, created_at timestamptz DEFAULT now(), consumed_at timestamptz);
      CREATE TABLE browser_session_revocations (user_id uuid, service_key text, session_id uuid, expires_at timestamptz);
      CREATE TABLE service_session_revocations (user_id uuid, service_key text, session_epoch integer);
      CREATE TABLE service_memberships (user_id uuid, service_key text, status text);
      CREATE TABLE role_assignments (user_id uuid, role text, is_active boolean);`);
    await query(`INSERT INTO users VALUES ($1,'fixture@example.test','Fixture',true,true,'active','fixture-family')`, [actor]);
    await query(`INSERT INTO role_assignments VALUES ($1,'kpa:store_owner',true)`, [actor]);
  });
  afterAll(async () => { if (close) await close(); });
  beforeEach(async () => { generateTokens.mockClear(); await query('TRUNCATE handoff_tokens, browser_session_revocations'); });
  it.each(['pharmcoop', 'drugstore'])('transports %s accounts to exactly that origin without creating business membership', async key => {
    const origin = `https://${key}.neture.co.kr`;
    const path = key === 'pharmcoop' ? '/one/community?page=2' : '/materials';
    const href = new URL(await requestServiceHandoff(api, { serviceKey: key, origin, returnPath: path }));
    expect(href.searchParams.get('returnTo')).toBe(path);
    const token = href.searchParams.get('token')!;
    const result = await exchange(token, origin);
    expect(result.statusCode).toBe(200);
    expect(result.body.data.targetServiceKey).toBe('neture');
    expect(await query('SELECT * FROM service_memberships')).toHaveLength(0);
    expect((await exchange(token, origin)).statusCode).toBe(401);
    const second = await issue({ targetServiceKey: key, returnPath: path });
    const wrongOrigin = await exchange(second.body.data.handoffToken, 'https://neture.co.kr');
    expect(wrongOrigin.statusCode).toBe(401);
  });
  it.each(['/#news', '/community/posts?page=2', '/news/fixture-notice', '/operator', '/operator/semi-franchises?key=carepharm&tab=overview', '/operator/home-presentation/carepharm', '/operator/inbox/business/carepharm', '/operator/semi-franchises/carepharm/contents/new', `/operator/semi-franchises/carepharm/contents/${actor}/edit`])('returns to current CarePharm screen %s without granting an operator role', async returnPath => {
    const href = new URL(await requestServiceHandoff(api, { serviceKey: 'carepharm', origin: 'https://carepharm.neture.co.kr', returnPath }));
    expect((await exchange(href.searchParams.get('token')!, href.origin)).statusCode).toBe(200);
    expect(await query('SELECT * FROM role_assignments WHERE role LIKE $1', ['%operator%'])).toHaveLength(0);
    expect(await query('SELECT * FROM service_memberships')).toHaveLength(0);
  });
  it.each(['home', 'participation', 'community'] as const)('preserves Store-selected pharmacy through CarePharm %s and canonical account session', async section => {
    const target = cooperationDestination('carepharm', section);
    target.returnPath += `?store=${actor}`;
    const href = new URL(await requestServiceHandoff(api, target));
    expect(href.origin).toBe('https://carepharm.neture.co.kr');
    expect(href.pathname).toBe('/handoff'); expect(href.searchParams.get('returnTo')).toBe(target.returnPath);
    const rows = await query('SELECT * FROM handoff_tokens');
    expect(rows[0]).toMatchObject({ source_service_key: 'store', target_service_key: 'carepharm' });
    const result = await exchange(href.searchParams.get('token')!, target.origin);
    expect(result.statusCode).toBe(200); expect(result.body.data.targetServiceKey).toBe('neture');
    expect(await query('SELECT * FROM service_memberships')).toHaveLength(0);
    expect((await exchange(href.searchParams.get('token')!, target.origin)).statusCode).toBe(401);
  });
  it.each(['https://neture.co.kr', 'https://evil.test', 'http://carepharm.neture.co.kr', 'https://carepharm.neture.co.kr.evil.test'])('rejects an alias exchange at %s', async origin => {
    const issued = await issue({ targetServiceKey: 'carepharm', returnPath: '/' });
    expect((await exchange(issued.body.data.handoffToken, origin)).statusCode).toBe(401);
    expect(generateTokens).not.toHaveBeenCalled();
  });
  it.each(['/operator/products', '/my/participation?next=https://evil.test', '//evil.test', '/communities/business%3Apharmacy/forum', '/?store=bad', `/?store=${actor}&store=${actor}`, '/%2e%2e/operator', '/materials#evil', '/operator/semi-franchises?key=other', '/operator/inbox/business/other', '/operator/semi-franchises/other/contents/new', '/operator/semi-franchises/carepharm/contents/not-an-id/edit', '/admin', '/community?next=https://evil.test'])('rejects an unsupported CarePharm path %s before ledger insert', async returnPath => {
    expect((await issue({ targetServiceKey: 'carepharm', returnPath })).statusCode).toBe(400);
    expect(await query('SELECT * FROM handoff_tokens')).toHaveLength(0);
  });
  it.each(['/', '/mypage?from=store'])('preserves Neture representative return %s', async returnPath => {
    const href = new URL(await requestServiceHandoff(api, { serviceKey: 'neture', origin: 'https://neture.co.kr', returnPath }));
    expect((await exchange(href.searchParams.get('token')!, href.origin)).statusCode).toBe(200);
  });
  it('keeps canonical Neture tokens out of CarePharm and its participation path out of representative issuance', async () => {
    expect((await issue({ targetServiceKey: 'neture', returnPath: '/my/participation' })).statusCode).toBe(400);
    const result = await issue({ targetServiceKey: 'neture', returnPath: '/' });
    expect((await exchange(result.body.data.handoffToken, 'https://carepharm.neture.co.kr')).statusCode).toBe(401);
  });
  it('preserves Pharmacy handoff and the client expected-origin rejection', async () => {
    const target = cooperationDestination('pharmacy', 'participation');
    const href = new URL(await requestServiceHandoff(api, target));
    expect(href.origin).toBe('https://pharmacy.neture.co.kr');
    const result = await exchange(href.searchParams.get('token')!, href.origin);
    expect(result.statusCode).toBe(200);
    expect(result.body.data.targetServiceKey).toBe('neture');
    expect(generateTokens.mock.calls.at(-1)?.[5]).toBe('neture');
    await expect(requestServiceHandoff(api, { ...cooperationDestination('carepharm', 'home'), origin: 'https://evil.test' })).rejects.toThrow('Invalid service handoff');
  });
  it('connects the CarePharm Study entry through the existing lecture issuer and exchange contract', async () => {
    const href = new URL(await requestServiceHandoff(api, { serviceKey: 'lecture', origin: 'https://study.neture.co.kr', returnPath: '/' }));
    expect(href.origin).toBe('https://study.neture.co.kr');
    const result = await exchange(href.searchParams.get('token')!, href.origin);
    expect(result.statusCode).toBe(200);
    expect(result.body.data.targetServiceKey).toBe('lecture');
    expect(await query('SELECT * FROM service_memberships')).toHaveLength(0);
  });
  it('rechecks real source-session revocation between issuance and exchange', async () => {
    const result = await issue({ targetServiceKey: 'carepharm', returnPath: '/' });
    await query(`INSERT INTO browser_session_revocations VALUES ($1,'store',$2,now()+interval '1 hour')`, [actor, session]);
    expect((await exchange(result.body.data.handoffToken, 'https://carepharm.neture.co.kr')).statusCode).toBe(401);
    expect(generateTokens).not.toHaveBeenCalled();
  });
});
