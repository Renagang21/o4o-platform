/** Actual routes, membership middleware, business predicates and CMS persistence.
 * Only the authenticated session boundary is a fixture; permissions read PostgreSQL.
 */
import type { DataSource } from 'typeorm';
let database: DataSource;
jest.mock('../../../database/connection.js', () => ({ AppDataSource: {
  get isInitialized() { return !!database?.isInitialized; },
  query: (...args: [string, unknown[]?]) => database.query(...args),
} }));
jest.mock('../../../middleware/auth.middleware.js', () => ({ requireAuth: (req: any, res: any, next: any) => {
  if (!req.headers['x-test-user']) return res.sendStatus(401);
  // Deliberately retain active session claims while DB roles/memberships are revoked.
  req.user = { id: req.headers['x-test-user'], roles: [req.headers['x-test-role'] || 'neture:operator'], memberships: [{ serviceKey: 'neture', status: 'active' }] };
  next();
} }));
import express from 'express';
import request from 'supertest';
import { initialHomePresentation } from '@o4o/types';
import { createCarePharmReviewDb } from '../../../__tests__/support/carepharm-review-db.js';
import { CANONICAL_SCHEMA_BASELINE_STATEMENTS } from '../../../database/bootstrap/canonical-schema-baseline.js';
import { createHomePresentationRoutes } from '../home-presentation.routes.js';
import { resolveCommunityWorkspace, createCommunityBoard } from '../../../services/community/community-workspace.service.js';
const run = process.env.CAREPHARM_REVIEW_DATABASE_URL ? describe : describe.skip;
const operator = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const care = '33333333-3333-4333-8333-333333333333';
const pharmacy = '44444444-4444-4444-8444-444444444444';
run('CarePharm operator home and member board contracts, real local PostgreSQL', () => {
  let app: express.Express, close: () => Promise<void>;
  const manage = (method: 'get' | 'put' = 'get', actor = operator, role = 'neture:operator', body?: unknown) =>
    request(app)[method]('/home/carepharm/manage').set('x-test-user', actor).set('x-test-role', role)
      .send(body ?? { config: initialHomePresentation('carepharm'), revision: 0, publish: true, businessKey: 'pharmacy', organizationId: pharmacy });
  beforeAll(async () => {
    const fixture = await createCarePharmReviewDb(); database = fixture.ds; close = fixture.close;
    await database.query(`
      CREATE TABLE users(id uuid PRIMARY KEY, name text, nickname text, status text, "isActive" boolean, "isEmailVerified" boolean);
      CREATE TABLE organizations(id uuid PRIMARY KEY, metadata jsonb);
      CREATE TABLE semi_franchises(id uuid PRIMARY KEY, key text, name text, organization_id uuid, status text, payment_receiver_key text, community_key text);
      CREATE TABLE semi_franchise_operators(semi_franchise_id uuid, user_id uuid, revoked_at timestamptz);
      CREATE TABLE role_assignments(user_id uuid, role text, is_active boolean, valid_from timestamptz, valid_until timestamptz);
      CREATE TABLE service_memberships(user_id uuid, service_key text, status text);
      CREATE TABLE cooperatives(id uuid, semi_franchise_id uuid, status text);
      CREATE TABLE cooperative_roles(cooperative_id uuid, user_id uuid, revoked_at timestamptz);
      CREATE TABLE semi_franchise_memberships(semi_franchise_id uuid, organization_id uuid, status text);
      CREATE TABLE organization_members(organization_id uuid, user_id uuid, role text, left_at timestamptz);
      CREATE TABLE neture_pharmacy_memberships(organization_id uuid, status text);
      CREATE TABLE forum_category_requests(id uuid, name text, description text, forum_type text, status text, service_code text, requester_id uuid, requester_name text, slug text, metadata jsonb);`);
    const cms = CANONICAL_SCHEMA_BASELINE_STATEMENTS.find(sql => sql.startsWith('CREATE TABLE public.cms_contents ('))!;
    await database.query(cms.replace('public.cms_contents', 'cms_contents'));
    app = express(); app.use(express.json()); app.use('/home', createHomePresentationRoutes(database));
  });
  beforeEach(async () => {
    await database.query('TRUNCATE users, organizations, semi_franchises, semi_franchise_operators, role_assignments, service_memberships, cooperatives, cooperative_roles, cms_contents, forum_category_requests, semi_franchise_memberships, organization_members, neture_pharmacy_memberships');
    for (const id of [operator, other]) {
      await database.query(`INSERT INTO users VALUES($1,'Fixture','Fixture','active',true,true)`, [id]);
      await database.query(`INSERT INTO service_memberships VALUES($1,'neture','active')`, [id]);
      await database.query(`INSERT INTO role_assignments VALUES($1,'neture:operator',true,NULL,NULL)`, [id]);
    }
    for (const [id, key] of [[care, 'carepharm'], [pharmacy, 'pharmacy']]) {
      await database.query(`INSERT INTO organizations VALUES($1,'{}')`, [id]);
      await database.query(`INSERT INTO semi_franchises VALUES($1,$2,$2,$1,'active',NULL,NULL)`, [id, key]);
    }
    await database.query('INSERT INTO semi_franchise_operators VALUES($1,$2,NULL),($3,$4,NULL)', [care, operator, pharmacy, other]);
  });
  afterAll(async () => { if (close) await close(); });
  it('keeps guest reads public but requires authentication for management', async () => {
    expect((await request(app).get('/home/carepharm')).body).toEqual({ success: true, data: null });
    expect((await request(app).get('/home/carepharm/manage')).status).toBe(401);
    expect((await request(app).put('/home/carepharm/manage').send({})).status).toBe(401);
  });
  it.each(['get', 'put'] as const)('rejects another business operator and unassigned Neture role on %s', async method => {
    expect((await manage(method, other)).status).toBe(403);
    await database.query('DELETE FROM semi_franchise_operators WHERE user_id=$1', [operator]);
    expect((await manage(method)).status).toBe(403);
    expect(await database.query('SELECT id FROM cms_contents')).toEqual([]);
  });
  it.each(['get', 'put'] as const)('rechecks assignment, active role, role expiry, main status and business status on %s', async method => {
    expect((await manage('get')).status).toBe(200);
    await database.query('UPDATE semi_franchise_operators SET revoked_at=now() WHERE user_id=$1', [operator]);
    expect((await manage(method)).status).toBe(403);
    await database.query('UPDATE semi_franchise_operators SET revoked_at=NULL');
    await database.query('UPDATE role_assignments SET is_active=false WHERE user_id=$1', [operator]);
    expect((await manage(method)).status).toBe(403);
    await database.query("UPDATE role_assignments SET is_active=true, valid_until=now()-interval '1 minute' WHERE user_id=$1", [operator]);
    expect((await manage(method)).status).toBe(403);
    await database.query('UPDATE role_assignments SET valid_until=NULL');
    await database.query("UPDATE service_memberships SET status='suspended' WHERE user_id=$1", [operator]);
    expect((await manage(method)).status).toBe(403);
    await database.query("UPDATE service_memberships SET status='active'");
    await database.query('UPDATE users SET "isActive"=false WHERE id=$1', [operator]);
    expect((await manage(method)).status).toBe(403);
    await database.query('UPDATE users SET "isActive"=true');
    await database.query("UPDATE semi_franchises SET status='closed' WHERE id=$1", [care]);
    expect((await manage(method)).status).toBe(404);
    await database.query('DELETE FROM semi_franchises WHERE id=$1', [care]);
    expect((await manage(method)).status).toBe(404);
    expect(await database.query('SELECT id FROM cms_contents')).toEqual([]);
  });
  it('accepts only the matching business role without widening Neture-wide management', async () => {
    await database.query('DELETE FROM semi_franchise_operators');
    await database.query("UPDATE role_assignments SET role='neture:carepharm_operator' WHERE user_id=$1", [operator]);
    expect((await manage('get', operator, 'neture:carepharm_operator')).status).toBe(200);
    expect((await request(app).get('/home/neture/manage').set('x-test-user', operator).set('x-test-role', 'neture:carepharm_operator')).status).toBe(403);
    await database.query("UPDATE role_assignments SET role='neture:pharmacy_operator' WHERE user_id=$1", [operator]);
    expect((await manage('put', operator, 'neture:pharmacy_operator')).status).toBe(403);
  });
  it('publishes only public messages, preserves drafts, isolates models and rejects stale saves', async () => {
    const config = initialHomePresentation('carepharm');
    config.promotions[0].title = '공개 운영 안내';
    expect((await manage('put', operator, 'neture:operator', { config, revision: 0, publish: true, surface: 'neture', organizationId: pharmacy })).status).toBe(200);
    config.promotions[0].title = '미공개 초안';
    expect((await manage('put', operator, 'neture:operator', { config, revision: 1, publish: false })).status).toBe(200);
    expect((await manage()).body.data.draft.promotions[0].title).toBe('미공개 초안');
    expect((await request(app).get('/home/carepharm')).body.data.promotions[0].title).toBe('공개 운영 안내');
    expect((await request(app).get('/home/neture')).body.data).toBeNull();
    expect((await request(app).get('/home/pharmacy')).body.data).toBeNull();
    expect((await manage('put')).status).toBe(409);
    config.promotions[0].endsAt = new Date(Date.now() - 1000).toISOString();
    expect((await manage('put', operator, 'neture:operator', { config, revision: 2, publish: true })).status).toBe(200);
    expect((await request(app).get('/home/carepharm')).body.data.promotions).toEqual([]);
    expect(await database.query('SELECT "serviceKey", "organizationId", status FROM cms_contents')).toEqual([{ serviceKey: 'neture', organizationId: null, status: 'draft' }]);
  });
  it('creates a member-only board in this business ledger after explicit operator action', async () => {
    const workspace = await resolveCommunityWorkspace(database, { id: operator }, 'business:carepharm');
    expect(workspace).toMatchObject({ allowed: true, canManage: true, forumStorageCodes: [`sf:${care}`] });
    expect(await database.query('SELECT id FROM forum_category_requests')).toEqual([]);
    const foreign = await resolveCommunityWorkspace(database, { id: other }, 'business:carepharm');
    expect(foreign).toMatchObject({ allowed: false, canManage: false });
    await expect(createCommunityBoard(database, foreign!, other, { name: 'Forged' })).rejects.toThrow('COMMUNITY_OPERATOR_REQUIRED');
    await createCommunityBoard(database, workspace!, operator, { name: '약국 운영 사례', description: '개인정보 없이 운영 경험 공유' });
    expect(await database.query('SELECT name, description, service_code, metadata FROM forum_category_requests')).toEqual([{
      name: '약국 운영 사례', description: '개인정보 없이 운영 경험 공유', service_code: `sf:${care}`, metadata: { communityKey: 'business:carepharm' },
    }]);
    expect((await request(app).get('/home/carepharm')).body.data).toBeNull();
    await database.query('UPDATE semi_franchise_operators SET revoked_at=now() WHERE user_id=$1', [operator]);
    expect(await resolveCommunityWorkspace(database, { id: operator }, 'business:carepharm')).toMatchObject({ allowed: false, canManage: false });
  });
});
