import express from 'express';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { createNeturePharmacyRoutes } from '../neture-pharmacy.routes.js';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';

/**
 * CarePharm · MegaPharm 사업 원장 정합 (PostgreSQL + HTTP)
 *
 * 역할(neture:{key}_admin · _operator) 지정만으로는 사업 행이 생기지 않는다 — 상세 404 · 가입 목록 미노출.
 * 기존 관리자 API 로 등록한 뒤에만 노출되고, 각 사업 담당(광역 역할 없음)은 자기 사업 신청만 조회 · 승인한다.
 * 세션 인증만 합성이다. 역할 · 가입 · 접근 판정과 SQL 은 일회용 DB 를 쓴다. 운영 DB 금지.
 */
jest.mock('../../../middleware/auth.middleware.js', () => ({
  ...jest.requireActual('../../../common/middleware/auth/authorization.middleware.js'),
  requireAuth: (req: any, res: any, next: any) => req.user ? next() : res.status(401).json({ code: 'UNAUTHORIZED' }),
}));
jest.mock('../../../services/checkout.service.js', () => ({ checkoutService: {} }));
jest.mock('../../../routes/kpa/services/event-offer.service.js', () => ({ EventOfferService: class {} }));
jest.mock('../services/pharmacy-store-provisioner.js', () => ({ createPharmacyStoreProvisioner: () => ({}) }));
jest.mock('../services/business-registration-document.service.js', () => ({ BusinessRegistrationDocumentService: class {} }));
jest.mock('@o4o/asset-copy-core', () => ({ AssetCopyService: class {} }), { virtual: true });

const url = process.env.NETURE_PHARMACY_IT_DATABASE_URL;
if (url) {
  const target = new URL(url);
  if (target.protocol !== 'postgresql:' || target.hostname !== '127.0.0.1' || target.port !== '55432' ||
      target.pathname !== '/o4o_feature_test' || target.search || target.hash) {
    throw new Error('Care/Mega ledger integration requires its dedicated loopback fixture database');
  }
}
const KEYS = ['carepharm', 'megapharm'] as const;
const suite = url ? describe : describe.skip;
suite('CarePharm · MegaPharm business ledger alignment (PostgreSQL + HTTP)', () => {
  let db: DataSource;
  let app: express.Express;
  const tag = randomUUID().slice(0, 8);
  const users: string[] = [];
  const orgs: string[] = [];
  const businesses: string[] = [];
  let admin: string, owner: string, careOperator: string, megaAdmin: string;
  let store: string;
  const base = '/api/v1/neture';
  const as = (user: string) => ({
    get: (path: string) => request(app).get(base + path).set('x-fixture-user', user).set('x-store-organization-id', store),
    post: (path: string, body: unknown = {}) => request(app).post(base + path).set('x-fixture-user', user)
      .set('x-store-organization-id', store).send(body),
  });

  beforeAll(async () => {
    db = await new DataSource({ type: 'postgres', url, entities: [] }).initialize();
    const existing = await db.query(`SELECT key FROM semi_franchises WHERE key = ANY($1::text[])`, [KEYS]);
    if (existing.length) throw new Error('fixture DB already has carepharm/megapharm rows — use a fresh database');
    for (let i = 0; i < 4; i++) {
      const [row] = await db.query(`INSERT INTO users (email,status,"isActive","isEmailVerified")
        VALUES ($1,'active',true,true) RETURNING id`, [`care-mega-${tag}-${i}@example.test`]);
      users.push(row.id);
    }
    [admin, owner, careOperator, megaAdmin] = users;
    const [org] = await db.query(`INSERT INTO organizations(name,code,type,"isActive")
      VALUES ('Synthetic pharmacy',$1,'pharmacy',true) RETURNING id`, [`care-mega-${tag}`]);
    store = org.id;
    orgs.push(store);
    await db.query(`INSERT INTO organization_members(organization_id,user_id,role,is_primary,joined_at,created_at,updated_at)
      VALUES ($1,$2,'owner',true,NOW(),NOW(),NOW())`, [store, owner]);
    await db.query(`INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,status,business_number,pharmacy_name,pharmacist_license_number)
      VALUES ($1,$2,'active',$3,'Synthetic pharmacy','SYNTHETIC')`, [store, owner, `${tag}-0`]);
    // 담당 계정은 사업 한정 역할 하나씩만 — 광역(neture:admin · operator · super_admin) 없음.
    await db.query(`INSERT INTO role_assignments(user_id,role) VALUES
      ($1,'platform:super_admin'),($2,'neture:carepharm_operator'),($3,'neture:megapharm_admin')`, [admin, careOperator, megaAdmin]);

    jest.spyOn(roleAssignmentService, 'hasAnyRole').mockImplementation(async (id, roles) => {
      const rows = await db.query(`SELECT 1 FROM role_assignments WHERE user_id=$1 AND role=ANY($2::text[])
        AND is_active=true AND valid_from<=NOW() AND (valid_until IS NULL OR valid_until>=NOW())`, [id, roles]);
      return rows.length > 0;
    });
    jest.spyOn(roleAssignmentService, 'getActiveRoles').mockImplementation(async id => db.query(
      `SELECT * FROM role_assignments WHERE user_id=$1 AND is_active=true`, [id]));
    app = express();
    app.use(express.json());
    app.use(async (req: any, _res, next) => {
      const id = req.header('x-fixture-user');
      if (users.includes(id)) {
        const roles = await db.query(`SELECT role FROM role_assignments WHERE user_id=$1 AND is_active=true`, [id]);
        req.user = { id, roles: roles.map((r: any) => r.role), memberships: [{ serviceKey: 'neture', status: 'active' }] };
      }
      next();
    });
    app.use(base, createNeturePharmacyRoutes(db));
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    if (!db?.isInitialized) return;
    await db.query(`DELETE FROM semi_franchise_memberships WHERE semi_franchise_id=ANY($1::uuid[])`, [businesses]);
    await db.query(`DELETE FROM semi_franchises WHERE id=ANY($1::uuid[])`, [businesses]);
    await db.query(`DELETE FROM neture_pharmacy_memberships WHERE applicant_user_id=ANY($1::uuid[])`, [users]);
    await db.query(`DELETE FROM organization_members WHERE organization_id=ANY($1::uuid[])`, [orgs]);
    await db.query(`DELETE FROM role_assignments WHERE user_id=ANY($1::uuid[])`, [users]);
    await db.query(`DELETE FROM organizations WHERE id=ANY($1::uuid[])`, [orgs]);
    await db.query(`DELETE FROM users WHERE id=ANY($1::uuid[])`, [users]);
    await db.destroy();
  });

  it('keeps role-only businesses hidden, then exposes them only after admin registration', async () => {
    for (const key of KEYS) expect((await as(owner).get(`/pharmacy/businesses/${key}`)).status).toBe(404);
    const before = await as(owner).get('/pharmacy/semi-franchises');
    expect(before.status).toBe(200);
    expect(before.body.data.map((b: any) => b.key)).not.toEqual(expect.arrayContaining([...KEYS]));

    for (const [key, name] of [['carepharm', 'CarePharm · 만성질환관리'], ['megapharm', 'MegaPharm · 창고형약국']]) {
      const created = await as(admin).post('/admin/semi-franchises', { key, name });
      expect(created.status).toBe(201);
      expect(created.body.data.status).toBe('active');
      businesses.push(created.body.data.id);
      orgs.push(created.body.data.organization_id);
    }
    expect((await as(admin).post('/admin/semi-franchises', { key: 'carepharm', name: 'dup' })).status).toBe(409);

    for (const key of KEYS) expect((await as(owner).get(`/pharmacy/businesses/${key}`)).status).toBe(200);
    const after = await as(owner).get('/pharmacy/semi-franchises');
    expect(after.body.data.map((b: any) => b.key)).toEqual(expect.arrayContaining([...KEYS]));
    // 등록은 가입을 만들지 않는다.
    expect(after.body.data.filter((b: any) => KEYS.includes(b.key)).every((b: any) => b.membershipStatus === null)).toBe(true);

    const list = await as(admin).get('/admin/semi-franchises');
    const byKey = Object.fromEntries(list.body.data.map((b: any) => [b.key, b]));
    expect(byKey.carepharm.operators).toEqual([]);
    expect(byKey.carepharm.roleOperators).toEqual([expect.objectContaining({ userId: careOperator, role: 'neture:carepharm_operator' })]);
    expect(byKey.megapharm.roleOperators).toEqual([expect.objectContaining({ userId: megaAdmin, role: 'neture:megapharm_admin' })]);
  });

  it('isolates each business operator while both applications are pending, then approves each', async () => {
    const ids: Record<string, string> = {};
    for (const key of KEYS) {
      const applied = await as(owner).post(`/pharmacy/semi-franchises/${key}/apply`, { conditions: '' });
      expect(applied.status).toBe(200);
      expect(applied.body.data.status).toBe('pending');
      ids[key] = applied.body.data.id;
    }
    const careList = await as(careOperator).get('/operator/semi-franchises/carepharm/memberships');
    expect(careList.status).toBe(200);
    expect(careList.body.data.map((m: any) => m.id)).toEqual([ids.carepharm]);
    expect((await as(careOperator).get('/operator/semi-franchises')).body.data.map((b: any) => b.key)).toEqual(['carepharm']);

    // 다른 사업 조회 · 승인 = 403, 자기 사업 경로에 다른 사업 신청 ID = 404. 상태 불변.
    expect((await as(careOperator).get('/operator/semi-franchises/megapharm/memberships')).status).toBe(403);
    expect((await as(careOperator).post(`/operator/semi-franchises/megapharm/memberships/${ids.megapharm}/approve`)).status).toBe(403);
    expect((await as(megaAdmin).post(`/operator/semi-franchises/carepharm/memberships/${ids.carepharm}/approve`)).status).toBe(403);
    expect((await as(careOperator).post(`/operator/semi-franchises/carepharm/memberships/${ids.megapharm}/approve`)).status).toBe(404);
    const pending = await db.query(`SELECT status FROM semi_franchise_memberships WHERE id = ANY($1::uuid[])`, [Object.values(ids)]);
    expect(pending.map((r: any) => r.status)).toEqual(['pending', 'pending']);

    expect((await as(careOperator).post(`/operator/semi-franchises/carepharm/memberships/${ids.carepharm}/approve`)).body.data.status).toBe('active');
    expect((await as(megaAdmin).post(`/operator/semi-franchises/megapharm/memberships/${ids.megapharm}/approve`)).body.data.status).toBe('active');

    const joined = await as(owner).get('/pharmacy/semi-franchises');
    for (const key of KEYS) expect(joined.body.data.find((b: any) => b.key === key).membershipStatus).toBe('active');
    const [basic] = await db.query(`SELECT status FROM neture_pharmacy_memberships WHERE organization_id = $1`, [store]);
    expect(basic.status).toBe('active');
    expect(await db.query(`SELECT 1 FROM cooperatives c JOIN semi_franchises sf ON sf.id = c.semi_franchise_id WHERE sf.id = ANY($1::uuid[])`, [businesses])).toEqual([]);
  });
});
