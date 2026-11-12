import { Client } from 'pg';
import { randomUUID } from 'node:crypto';
import { DEMO_PROFILES, runDemoProfileReconcile } from '../demo-account-profile.service';
import { MEMBER_REGISTRATION_TYPE_SQL } from '../../services/admin/member-registration-data';

describe('Demo profile reconcile gates (no database)', () => {
  it('apply without the exact plan digest or an approver sends no query', async () => {
    const client = { query: jest.fn() };
    await expect(runDemoProfileReconcile(client, { apply: true, approvedBy: randomUUID() })).rejects.toThrow('EXACT_PLAN_DIGEST_REQUIRED');
    await expect(runDemoProfileReconcile(client, { apply: true, expectedDigest: 'a'.repeat(64) })).rejects.toThrow('APPROVER_REQUIRED');
    expect(client.query).not.toHaveBeenCalled();
  });
  it('inventory failure rolls back without writes', async () => {
    const calls: string[] = [];
    const client = { query: async (sql: string) => { calls.push(sql); if (sql.startsWith('SELECT user_id,demo_type')) throw Error('DATABASE_FAILURE'); return []; } };
    await expect(runDemoProfileReconcile(client)).rejects.toThrow('DATABASE_FAILURE');
    expect(calls.at(-1)).toBe('ROLLBACK');
    expect(calls.some(sql => /^(INSERT|UPDATE|DELETE)/.test(sql))).toBe(false);
  });
  it('canonical values: test nicknames and staff as other — no pharmacist license', () => {
    expect(DEMO_PROFILES).toEqual({
      STORE_OWNER: { nickname: '테스트-약국경영자' },
      SUPPLIER: { nickname: '테스트-공급자' },
      STORE_STAFF: { nickname: '테스트-직원', registrationType: 'other' },
    });
  });
});

// Real canonical schema (baseline + incremental migrations) on an owned loopback cluster only.
const port = Number(process.env.O4O_DEMO_PROFILE_TEST_PORT);
const database = process.env.O4O_DEMO_PROFILE_TEST_DB;
const integration = Number.isInteger(port) && ![5432, 5442].includes(port) && database === 'o4o_demo_profile_fixture' ? describe : describe.skip;
integration('Demo profile reconcile on isolated PostgreSQL', () => {
  const pg = new Client({ host: '127.0.0.1', port, user: process.env.O4O_DEMO_PROFILE_TEST_USER ?? 'o4o_demo_fixture', database });
  const client = { query: async (sql: string, params?: unknown[]) => (await pg.query(sql, params)).rows };
  const query = client.query;
  let owner: string, supplier: string, staff: string, admin: string, operator: string;
  beforeAll(async () => { await pg.connect(); });
  afterAll(async () => { await pg.end(); });
  beforeEach(async () => {
    await query('TRUNCATE users,organizations,canonical_demo_repair_snapshots CASCADE');
    const add = async (email: string, nickname: string | null) =>
      (await query(`INSERT INTO users(email,name,nickname,status,"isActive","isEmailVerified") VALUES($1,$2,$3,'active',true,true) RETURNING id`, [email, 'Fixture', nickname]))[0].id;
    owner = await add('owner@fixture.invalid', '약국경영자 Demo ID');
    supplier = await add('supplier@fixture.invalid', null);
    staff = await add('staff@fixture.invalid', null);
    admin = await add('admin@fixture.invalid', null);
    operator = await add('operator@fixture.invalid', null);
    for (const [id, type] of [[owner, 'STORE_OWNER'], [supplier, 'SUPPLIER'], [staff, 'STORE_STAFF']])
      await query('INSERT INTO demo_accounts(user_id,demo_type,is_active) VALUES($1,$2,true)', [id, type]);
    await query("INSERT INTO role_assignments(user_id,role,is_active,valid_from) VALUES($1,'platform:super_admin',true,now())", [admin]);
    await query("INSERT INTO role_assignments(user_id,role,is_active,valid_from) VALUES($1,'neture:operator',true,now())", [operator]);
    const store = (await query("INSERT INTO organizations(name,code,type) VALUES('Fixture Pharmacy','fixture-demo-store','pharmacy') RETURNING id"))[0].id;
    await query(`INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,status,pharmacy_name,business_number,pharmacist_license_number)
      VALUES($1,$2,'active','Fixture Pharmacy','DEMO-BUSINESS','DEMO-LICENSE')`, [store, owner]);
    const org = (await query("INSERT INTO organizations(name,code,type) VALUES('Fixture Supplier','fixture-demo-supplier','supplier') RETURNING id"))[0].id;
    await query("INSERT INTO organization_members(organization_id,user_id,role,is_primary) VALUES($1,$2,'owner',true)", [org, supplier]);
    await query("INSERT INTO neture_suppliers(user_id,organization_id,slug,status) VALUES($1,$2,'fixture-demo-supplier','ACTIVE')", [supplier, org]);
  }, 30000);
  const types = async () => Object.fromEntries((await query(`SELECT u.id,${MEMBER_REGISTRATION_TYPE_SQL} AS type FROM users u`)).map(row => [row.id, row.type]));
  const snapshotCount = async () => Number((await query('SELECT count(*) AS n FROM canonical_demo_repair_snapshots'))[0].n);

  it('plan is read-only and reports nickname and staff registration', async () => {
    const before = await query('SELECT id,nickname,"businessInfo"::text,"updatedAt" FROM users ORDER BY id');
    const plan = await runDemoProfileReconcile(client);
    expect(plan.changes).toBe(3);
    expect(plan.accounts).toEqual([
      { type: 'STORE_OWNER', present: true, nickname: true, registration: false },
      { type: 'SUPPLIER', present: true, nickname: true, registration: false },
      { type: 'STORE_STAFF', present: true, nickname: true, registration: true },
    ]);
    expect(await query('SELECT id,nickname,"businessInfo"::text,"updatedAt" FROM users ORDER BY id')).toEqual(before);
    expect(await snapshotCount()).toBe(0);
  });

  it('apply refuses a non platform-admin approver and leaves everything unchanged', async () => {
    const plan = await runDemoProfileReconcile(client);
    await expect(runDemoProfileReconcile(client, { apply: true, expectedDigest: plan.digest, approvedBy: operator })).rejects.toThrow('APPROVER_NOT_PLATFORM_ADMIN');
    expect((await query('SELECT nickname FROM users WHERE id=$1', [staff]))[0].nickname).toBeNull();
    expect(await snapshotCount()).toBe(0);
  });

  it('apply fills the list values, records the approver, keeps others untouched, then becomes a no-op', async () => {
    const plan = await runDemoProfileReconcile(client);
    const applied = await runDemoProfileReconcile(client, { apply: true, expectedDigest: plan.digest, approvedBy: admin });
    expect(applied).toMatchObject({ verified: true, writes: 6 });
    const nick = Object.fromEntries((await query('SELECT id,nickname FROM users')).map(row => [row.id, row.nickname]));
    expect([nick[owner], nick[supplier], nick[staff]]).toEqual(['테스트-약국경영자', '테스트-공급자', '테스트-직원']);
    expect(nick[operator]).toBeNull();
    const t = await types();
    expect([t[owner], t[supplier], t[staff], t[operator]]).toEqual(['pharmacy_owner', 'supplier', 'other', null]);
    const [registration] = await query(`SELECT "businessInfo"->'o4oMembershipRegistrationV1' AS r FROM users WHERE id=$1`, [staff]);
    expect(registration.r).toMatchObject({ type: 'other', state: 'approved', reviewedBy: admin });
    // 승인 면허를 만들면 Demo 가 실제 약사 자격 확인을 통과한다 — O4O-CANONICAL-DEMO-ACCOUNTS-V1.
    expect(await query('SELECT 1 FROM kpa_pharmacist_profiles')).toHaveLength(0);
    expect(await snapshotCount()).toBe(1);
    const again = await runDemoProfileReconcile(client);
    expect(again.changes).toBe(0);
    expect(await runDemoProfileReconcile(client, { apply: true, expectedDigest: again.digest, approvedBy: admin })).toMatchObject({ writes: 0 });
  });

  it('never creates or changes a pharmacist license record', async () => {
    await query(`INSERT INTO kpa_pharmacist_profiles(user_id,license_number,license_verified,qualification_status)
      VALUES($1,'12345',false,'pending')`, [owner]);
    const before = await query('SELECT * FROM kpa_pharmacist_profiles ORDER BY user_id');
    const plan = await runDemoProfileReconcile(client);
    await runDemoProfileReconcile(client, { apply: true, expectedDigest: plan.digest, approvedBy: admin });
    expect(await query('SELECT * FROM kpa_pharmacist_profiles ORDER BY user_id')).toEqual(before);
  });

  it('a changed before-image requires a new plan', async () => {
    const plan = await runDemoProfileReconcile(client);
    await query("UPDATE users SET nickname='changed meanwhile' WHERE id=$1", [supplier]);
    await expect(runDemoProfileReconcile(client, { apply: true, expectedDigest: plan.digest, approvedBy: admin })).rejects.toThrow('BEFORE_IMAGE_CHANGED_REPLAN');
    expect((await query('SELECT nickname FROM users WHERE id=$1', [staff]))[0].nickname).toBeNull();
  });
});
