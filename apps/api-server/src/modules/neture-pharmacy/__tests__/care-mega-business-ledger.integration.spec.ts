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
// 이 suite 가 실행하지 않는 주문 · 매장 생성 · 문서 · 자산 의존성은 빈 구현으로 둔다.
jest.mock('@o4o/asset-copy-core', () => ({ AssetCopyService: class {} }), { virtual: true });
jest.mock('../services/business-registration-document.service.js', () => ({ BusinessRegistrationDocumentService: class {} }));
jest.mock('../services/pharmacy-store-provisioner.js', () => ({ createPharmacyStoreProvisioner: () => ({}) }));
jest.mock('../../../routes/kpa/services/event-offer.service.js', () => ({ EventOfferService: class {} }));
jest.mock('../../../services/checkout.service.js', () => ({ checkoutService: {} }));
jest.mock('../../../middleware/auth.middleware.js', () => {
  const actual = jest.requireActual('../../../common/middleware/auth/authorization.middleware.js');
  return { ...actual, requireAuth: (req: any, res: any, next: any) => (req.user ? next() : res.status(401).end()) };
});

/** 전용 loopback fixture DB 만 허용한다(운영 · 공유 DB 오지정 차단). */
const FIXTURE_DB = '127.0.0.1:55432/o4o_feature_test';
const url = process.env.NETURE_PHARMACY_IT_DATABASE_URL;
if (url && !new RegExp(`^postgresql://[^@/]*@${FIXTURE_DB.replace(/\./g, '\\.')}$`).test(url)) {
  throw new Error(`Care/Mega ledger integration requires ${FIXTURE_DB}`);
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
    const created = await db.query(
      `INSERT INTO users (email, status, "isActive", "isEmailVerified")
       SELECT 'care-mega-' || $1 || '-' || n || '@example.test', 'active', true, true FROM generate_series(0, 3) AS n
       RETURNING id, email`, [tag]);
    users.push(...created.sort((a: any, b: any) => a.email.localeCompare(b.email)).map((r: any) => r.id));
    [admin, owner, careOperator, megaAdmin] = users;
    // 기존 가입 조건을 갖춘 매장: 소유 관계 + 내 매장(약국) 기본 가입 active.
    const [org] = await db.query(
      `WITH o AS (INSERT INTO organizations (name, code, type, "isActive") VALUES ('Synthetic pharmacy', 'care-mega-' || $1, 'pharmacy', true) RETURNING id),
            m AS (INSERT INTO organization_members (organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
                  SELECT id, $2, 'owner', true, NOW(), NOW(), NOW() FROM o)
       INSERT INTO neture_pharmacy_memberships (organization_id, applicant_user_id, status, business_number, pharmacy_name, pharmacist_license_number)
       SELECT id, $2, 'active', 'care-mega-' || $1, 'Synthetic pharmacy', 'SYNTHETIC' FROM o RETURNING organization_id AS id`, [tag, owner]);
    store = org.id;
    orgs.push(store);
    // 담당 계정은 사업 한정 역할 하나씩만 — 광역(neture:admin · operator · super_admin) 없음.
    await db.query(`INSERT INTO role_assignments(user_id,role) VALUES
      ($1,'platform:super_admin'),($2,'neture:carepharm_operator'),($3,'neture:megapharm_admin')`, [admin, careOperator, megaAdmin]);

    // 프로세스 전역 운영 DataSource 대신 같은 fixture DB 의 역할 원장을 읽게 한다.
    const activeRoles = (id: string) => db.query(
      `SELECT * FROM role_assignments WHERE user_id = $1 AND is_active = true
          AND (valid_from IS NULL OR valid_from <= NOW()) AND (valid_until IS NULL OR valid_until >= NOW())`, [id]);
    jest.spyOn(roleAssignmentService, 'getActiveRoles').mockImplementation(activeRoles as any);
    jest.spyOn(roleAssignmentService, 'hasAnyRole').mockImplementation(async (id, roles) =>
      (await activeRoles(id)).some((r: any) => roles.includes(r.role)));
    app = express();
    app.use(express.json());
    app.use(async (req: any, _res, next) => {
      const id = req.header('x-fixture-user');
      if (users.includes(id)) {
        const roles = (await activeRoles(id)).map((r: any) => r.role);
        req.user = { id, roles, memberships: [{ serviceKey: 'neture', status: 'active' }] };
      }
      next();
    });
    app.use(base, createNeturePharmacyRoutes(db));
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    if (!db?.isInitialized) return;
    // FK 순서대로 이 suite 가 만든 행만 지운다(고정 SQL · id 는 bind).
    const cleanup: Array<[string, string[]]> = [
      ['DELETE FROM semi_franchise_memberships WHERE semi_franchise_id = ANY($1::uuid[])', businesses],
      ['DELETE FROM semi_franchises WHERE id = ANY($1::uuid[])', businesses],
      ['DELETE FROM neture_pharmacy_memberships WHERE organization_id = ANY($1::uuid[])', orgs],
      ['DELETE FROM organization_members WHERE user_id = ANY($1::uuid[])', users],
      ['DELETE FROM role_assignments WHERE user_id = ANY($1::uuid[])', users],
      ['DELETE FROM organizations WHERE id = ANY($1::uuid[])', orgs],
      ['DELETE FROM users WHERE id = ANY($1::uuid[])', users],
    ];
    for (const [sql, ids] of cleanup) await db.query(sql, [ids]);
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
    expect(byKey.carepharm.roleOperators).toEqual([expect.objectContaining({ userId: careOperator, role: 'neture:carepharm_operator', membershipStatus: 'active' })]);
    expect(byKey.megapharm.roleOperators).toEqual([expect.objectContaining({ userId: megaAdmin, role: 'neture:megapharm_admin', membershipStatus: 'active' })]);
    expect(byKey.carepharm.roleOperators[0]).not.toHaveProperty('account_status');

    // 역할은 그대로여도 Neture 메인 이용이 정지되면 운영 불가로 표시된다(역할 · 정지 원장은 바꾸지 않는다).
    await db.query(`INSERT INTO service_memberships (user_id, service_key, status) VALUES ($1, 'neture', 'suspended')`, [megaAdmin]);
    const suspended = await as(admin).get('/admin/semi-franchises');
    expect(suspended.body.data.find((b: any) => b.key === 'megapharm').roleOperators[0].membershipStatus).toBe('suspended');
    await db.query(`DELETE FROM service_memberships WHERE user_id = $1`, [megaAdmin]);
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
