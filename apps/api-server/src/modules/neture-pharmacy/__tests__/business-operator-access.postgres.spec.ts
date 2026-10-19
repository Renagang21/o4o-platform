import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { pharmacyCollaboratorRoles, parsePharmacyCollaboratorRole } from '@o4o/types';
import { resolveOperatorRole } from '../../../config/operator-role-catalog.js';
import { hasBusinessOperatorAccess } from '../services/business-operator-access.js';
import { resolveSemiFranchiseServiceAccess } from '../services/semi-franchise-service-access.js';
import { resolveSemiFranchiseBusinessAccess } from '../services/semi-franchise-community-access.js';
import { CooperativeService } from '../services/cooperative.service.js';

// Dedicated throwaway DB only; never use DATABASE_URL or production credentials.
const integration = process.env.O4O_PHARMACY_ROLES_IT === '1' ? describe : describe.skip;
integration('collaborator operator boundaries on isolated PostgreSQL', () => {
  let db: DataSource;
  const user = randomUUID();
  const keys = ['pharmacy', 'carepharm', 'megapharm', 'pharmcoop', 'individual-coop', 'unrelated'];
  const ids = Object.fromEntries(keys.map(key => [key, randomUUID()]));
  beforeAll(async () => {
    db = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 55439,
      username: 'postgres', database: 'o4o_pharmacy_roles_test', entities: [], synchronize: false, extra: { max: 1 } });
    await db.initialize();
    // Temporary tables are scoped to this connection. No real application schema is modified.
    await db.query(`CREATE TEMP TABLE users(id uuid, status text, "isActive" boolean, "isEmailVerified" boolean);
      CREATE TEMP TABLE service_memberships(user_id uuid, service_key text, status text);
      CREATE TEMP TABLE role_assignments(user_id uuid, role text, is_active boolean, valid_from timestamptz, valid_until timestamptz);
      CREATE TEMP TABLE semi_franchises(id uuid, key text, status text, community_key text);
      CREATE TEMP TABLE semi_franchise_operators(semi_franchise_id uuid, user_id uuid, revoked_at timestamptz);
      CREATE TEMP TABLE cooperatives(id uuid, semi_franchise_id uuid, status text);
      CREATE TEMP TABLE cooperative_memberships(cooperative_id uuid, user_id uuid, status text);
      CREATE TEMP TABLE organization_members(user_id uuid, organization_id uuid, role text, left_at timestamptz);
      CREATE TEMP TABLE neture_pharmacy_memberships(organization_id uuid, status text);
      CREATE TEMP TABLE semi_franchise_memberships(semi_franchise_id uuid, organization_id uuid, status text)`);
    await db.query(`INSERT INTO users VALUES ($1,'active',true,true)`, [user]);
    for (const key of keys) await db.query(`INSERT INTO semi_franchises VALUES ($1,$2,'active',$2)`, [ids[key], key]);
    await db.query(`INSERT INTO cooperatives VALUES ($1,$2,'active')`, [randomUUID(), ids['individual-coop']]);
  });
  beforeEach(async () => {
    await db.query(`TRUNCATE role_assignments, semi_franchise_operators, service_memberships;
      UPDATE users SET "isActive"=true,"isEmailVerified"=true,status='active'`);
  });
  afterAll(async () => { if (db?.isInitialized) await db.destroy(); });
  const grant = (role: string) => db.query(`INSERT INTO role_assignments VALUES ($1,$2,true,NULL,NULL)`, [user, role]);

  it.each(keys.slice(0,4).flatMap(key => pharmacyCollaboratorRoles(key).map(role => [key, role])))('%s role %s is exact and has canonical Neture membership', async (key, role) => {
    expect(resolveOperatorRole(role, 'neture')).toEqual({ role, serviceKey: 'neture' });
    expect(() => resolveOperatorRole(role, key)).toThrow();
    expect(parsePharmacyCollaboratorRole(role)?.businessKey).toBe(key);
    await grant(role);
    for (const target of keys) {
      expect(await hasBusinessOperatorAccess(db, user, ids[target])).toBe(
        target === key || (key === 'pharmcoop' && target === 'individual-coop'));
    }
    const access = await resolveSemiFranchiseServiceAccess(db, user, key);
    expect(access).toMatchObject({ allowed: true, operator: true, pharmacyMembershipStatus: null, semiFranchiseMembershipStatus: null });
    expect(await resolveSemiFranchiseBusinessAccess(db, user, key)).toMatchObject({ allowed: true, operator: true });
    expect(await db.query('SELECT * FROM organization_members')).toEqual([]);
    expect(await db.query('SELECT * FROM semi_franchise_memberships')).toEqual([]);
    expect(await db.query('SELECT * FROM service_memberships')).toEqual([]);
  });
  it('revocation, expiry and future activation deny immediately, including community fallback', async () => {
    await grant('neture:carepharm_operator');
    for (const change of ["is_active=false", "is_active=true,valid_until=NOW()-INTERVAL '1 second'", "valid_until=NULL,valid_from=NOW()+INTERVAL '1 day'"]) {
      await db.query(`UPDATE role_assignments SET ${change}`);
      expect(await hasBusinessOperatorAccess(db, user, ids.carepharm)).toBe(false);
      expect(await resolveSemiFranchiseBusinessAccess(db, user, 'carepharm')).toMatchObject({ allowed: false });
    }
  });
  it('legacy Neture operator requires a live explicit business assignment and valid role', async () => {
    await grant('neture:operator');
    expect(await hasBusinessOperatorAccess(db, user, ids.pharmacy)).toBe(false);
    await db.query(`INSERT INTO semi_franchise_operators VALUES ($1,$2,NULL)`, [ids.pharmacy, user]);
    expect(await hasBusinessOperatorAccess(db, user, ids.pharmacy)).toBe(true);
    expect(await hasBusinessOperatorAccess(db, user, ids.carepharm)).toBe(false);
    await db.query(`UPDATE role_assignments SET valid_until=NOW()-INTERVAL '1 second'`);
    expect(await resolveSemiFranchiseBusinessAccess(db, user, 'pharmacy')).toMatchObject({ allowed: false });
    await db.query('UPDATE role_assignments SET valid_until=NULL');
    await db.query('UPDATE semi_franchise_operators SET revoked_at=NOW()');
    expect(await hasBusinessOperatorAccess(db, user, ids.pharmacy)).toBe(false);
  });
  it('keeps email, account and Neture suspension boundaries without fabricating pharmacy participation', async () => {
    await grant('neture:pharmacy_admin');
    await db.query(`INSERT INTO service_memberships VALUES ($1,'neture','suspended')`, [user]);
    expect(await resolveSemiFranchiseServiceAccess(db, user, 'pharmacy')).toMatchObject({ allowed: false });
    await db.query(`UPDATE service_memberships SET status='withdrawn'`);
    expect(await resolveSemiFranchiseBusinessAccess(db, user, 'pharmacy')).toMatchObject({ allowed: false });
    await db.query('TRUNCATE service_memberships');
    for (const change of ['"isEmailVerified"=false', '"isEmailVerified"=true,"isActive"=false', '"isActive"=true,status=\'suspended\'']) {
      await db.query(`UPDATE users SET ${change}`);
      expect(await resolveSemiFranchiseServiceAccess(db, user, 'pharmacy')).toMatchObject({ allowed: false });
    }
  });
  it('only explicit Pharmcoop roles give federation access, never general Neture roles', async () => {
    await grant('neture:operator');
    expect((await new CooperativeService(db).session(user)).federationOperators).toEqual([]);
    await grant('neture:pharmcoop_admin');
    expect(await new CooperativeService(db).session(user)).toMatchObject({ federationOperators: [{ userId: user }], cooperativeOperators: [{ userId: user }] });
    await db.query(`UPDATE role_assignments SET is_active=false WHERE role='neture:pharmcoop_admin'`);
    expect((await new CooperativeService(db).session(user)).cooperativeOperators).toEqual([]);
  });
});
