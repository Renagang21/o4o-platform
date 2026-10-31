import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { PharmacyMembershipService } from '../services/pharmacy-membership.service.js';
import { SemiFranchiseService } from '../services/semi-franchise.service.js';
import { resolveBusinessStoreAccess } from '../services/business-store-access.js';
import { requireMember } from '../../cooperation-workflows/access.js';
import { resolveInboxScope } from '../../contact-inquiry/inbox-scope.js';

const port = process.env.DEFAULT_PHARMACY_PG_PORT;
const suite = port ? describe : describe.skip;
suite('default Pharmacy enrollment with real approval transactions', () => {
  let db: DataSource;
  const owner = randomUUID(), reviewer = randomUUID(), businessOrg = randomUUID();
  let business = randomUUID(), createdBusiness = false;
  const organizations: string[] = [], pharmacies: string[] = [];
  const provisioner = { activate: jest.fn(async () => {}), deactivate: jest.fn(async () => {}) };
  let approval: PharmacyMembershipService, participation: SemiFranchiseService;
  beforeAll(async () => {
    if (port !== '55479') throw new Error('Dedicated isolated loopback PostgreSQL required');
    db = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 55479, username: 'postgres', database: 'postgres', entities: [], synchronize: false });
    await db.initialize();
    for (const id of [owner, reviewer]) {
      await db.query(`INSERT INTO users(id,email,name,status,"isActive","isEmailVerified") VALUES($1,$2,'Synthetic person','active',true,true)`, [id, id + '@example.invalid']);
      await db.query("INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'neture','active')", [id]);
    }
    await db.query(`INSERT INTO kpa_pharmacist_profiles(user_id,license_number,license_verified,verified_at,verified_by,qualification_status,qualification_reason)
      VALUES($1,'SYNTHETIC-LICENSE',true,now(),$2,'approved','Synthetic qualification reviewed')`, [owner, reviewer]);
    const [seed] = await db.query("SELECT id,status FROM semi_franchises WHERE key='pharmacy'");
    if (seed) {
      if (seed.status !== 'active') throw new Error('Active canonical default business required');
      business = seed.id;
    } else {
      await db.query("INSERT INTO organizations(id,name,code) VALUES($1,'Synthetic Pharmacy operator',$2)", [businessOrg, businessOrg]);
      await db.query("INSERT INTO semi_franchises(id,key,name,organization_id,status) VALUES($1,'pharmacy','Synthetic Pharmacy',$2,'active')", [business, businessOrg]);
      createdBusiness = true;
    }
    approval = new PharmacyMembershipService(db, provisioner);
    participation = new SemiFranchiseService(db);
  });
  async function pharmacy(state = 'pending') {
    const organization = randomUUID(), id = randomUUID(); organizations.push(organization); pharmacies.push(id);
    await db.query("INSERT INTO organizations(id,name,code,type) VALUES($1,'Synthetic pharmacy',$2,'pharmacy')", [organization, organization]);
    await db.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')", [organization, owner]);
    await db.query(`INSERT INTO neture_pharmacy_memberships(id,organization_id,applicant_user_id,status,pharmacy_name,business_number,pharmacist_license_number,decided_by)
      VALUES($1,$2,$3,$4,'Synthetic pharmacy',$5,'SYNTHETIC-LICENSE',$6)`, [id, organization, owner, state, String(1000000000 + pharmacies.length), state === 'active' ? reviewer : null]);
    return { id, organization };
  }
  it('creates Pharmacy membership in the approval transaction and immediately grants member access', async () => {
    const p = await pharmacy();
    expect((await approval.decide(reviewer, p.id, 'approve')).status).toBe('active');
    const [row] = await db.query('SELECT status,decided_by FROM semi_franchise_memberships WHERE organization_id=$1', [p.organization]);
    expect(row).toMatchObject({ status: 'active', decided_by: reviewer });
    expect((await resolveBusinessStoreAccess(db, owner, p.organization, 'pharmacy')).allowed).toBe(true);
    const scope = await resolveInboxScope(db, 'business', 'pharmacy');
    expect(await requireMember(db, scope, owner, p.organization)).toMatchObject({ type: 'pharmacy', id: p.organization });
    expect((await db.query("SELECT count(*)::int AS n FROM action_logs WHERE action_key='pharmacy.default_membership.connect' AND meta->>'organizationId'=$1", [p.organization]))[0].n).toBe(1);
    expect((await db.query('SELECT count(*)::int AS n FROM role_assignments WHERE user_id=$1', [owner]))[0].n).toBe(0);
    const memberships = await db.query('SELECT sf.key FROM semi_franchise_memberships sm JOIN semi_franchises sf ON sf.id=sm.semi_franchise_id WHERE sm.organization_id=$1', [p.organization]);
    expect(memberships).toEqual([{ key: 'pharmacy' }]);
  });
  it('uses the pharmacy suspension guard and reactivates without duplicating the default membership', async () => {
    const p = await pharmacy();
    await approval.decide(reviewer, p.id, 'approve');
    await approval.decide(reviewer, p.id, 'suspend');
    expect((await resolveBusinessStoreAccess(db, owner, p.organization, 'pharmacy')).allowed).toBe(false);
    await approval.decide(reviewer, p.id, 'reactivate');
    expect((await resolveBusinessStoreAccess(db, owner, p.organization, 'pharmacy')).allowed).toBe(true);
    expect((await db.query("SELECT count(*)::int AS n FROM action_logs WHERE action_key='pharmacy.default_membership.connect' AND meta->>'organizationId'=$1", [p.organization]))[0].n).toBe(1);
  });
  it('never auto-enrolls a pharmacy whose professional qualification has not been approved', async () => {
    const p = await pharmacy();
    await db.query("UPDATE kpa_pharmacist_profiles SET qualification_status='revoked' WHERE user_id=$1", [owner]);
    try {
      await expect(approval.decide(reviewer, p.id, 'approve')).rejects.toMatchObject({ code: 'PHARMACIST_QUALIFICATION_REQUIRED' });
      expect(await db.query('SELECT id FROM semi_franchise_memberships WHERE organization_id=$1', [p.organization])).toHaveLength(0);
    } finally { await db.query("UPDATE kpa_pharmacist_profiles SET qualification_status='approved' WHERE user_id=$1", [owner]); }
  });
  it('repairs an already approved pharmacy idempotently, including concurrent old-client requests', async () => {
    const p = await pharmacy('active');
    const results = await Promise.all([participation.apply(p.organization, owner, 'pharmacy'), participation.apply(p.organization, owner, 'pharmacy')]);
    expect(results[0]).toEqual(results[1]); expect(results[0].status).toBe('active');
    expect((await db.query('SELECT count(*)::int AS n FROM semi_franchise_memberships WHERE organization_id=$1', [p.organization]))[0].n).toBe(1);
    expect((await db.query("SELECT count(*)::int AS n FROM action_logs WHERE action_key='pharmacy.default_membership.connect' AND meta->>'organizationId'=$1", [p.organization]))[0].n).toBe(1);
    expect((await db.query("SELECT count(*)::int AS n FROM action_logs WHERE action_key='service:application_policy' AND user_id=$1", [owner]))[0].n).toBe(0);
  });
  it('connects a previously pending membership for an approved pharmacy and audits its actual membership ID', async () => {
    const p = await pharmacy('active');
    const [prior] = await db.query("INSERT INTO semi_franchise_memberships(semi_franchise_id,organization_id,status,applied_by) VALUES($1,$2,'pending',$3) RETURNING id", [business, p.organization, owner]);
    expect(await participation.apply(p.organization, owner, 'pharmacy')).toMatchObject({ id: prior.id, status: 'active' });
    const [audit] = await db.query("SELECT meta->>'membershipId' AS id FROM action_logs WHERE action_key='pharmacy.default_membership.connect' AND meta->>'organizationId'=$1", [p.organization]);
    expect(audit.id).toBe(prior.id);
  });
  it.each(['megapharm', 'carepharm'])('does not use automatic Pharmacy enrollment for %s', async key => {
    const p = await pharmacy('active');
    const id = randomUUID(), organization = randomUUID();
    // This disposable DB has no independently configured business policies.
    const [prior] = await db.query('SELECT id FROM semi_franchises WHERE key=$1', [key]);
    if (prior) throw new Error('Empty independent business fixture required');
    await db.query("INSERT INTO organizations(id,name,code) VALUES($1,'Synthetic independent operator',$2)", [organization, organization]);
    await db.query("INSERT INTO semi_franchises(id,key,name,organization_id,status) VALUES($1,$2,'Synthetic independent business',$3,'active')", [id, key, organization]);
    try {
      await expect(participation.apply(p.organization, owner, key)).rejects.toMatchObject({ code: 'POLICY_UNAVAILABLE' });
      expect(await db.query('SELECT id FROM semi_franchise_memberships WHERE organization_id=$1', [p.organization])).toHaveLength(0);
    } finally {
      await db.query('DELETE FROM semi_franchises WHERE id=$1', [id]);
      await db.query('DELETE FROM organizations WHERE id=$1', [organization]);
    }
  });
  it.each(['pending', 'active', 'rejected', 'suspended', 'terminated'])('preserves independent decisions while handling an existing %s membership', async state => {
    const p = await pharmacy();
    await db.query("INSERT INTO semi_franchise_memberships(semi_franchise_id,organization_id,status,applied_by,reason) VALUES($1,$2,$3,$4,'prior decision')", [business, p.organization, state, owner]);
    await approval.decide(reviewer, p.id, 'approve');
    const [row] = await db.query('SELECT id,status,reason FROM semi_franchise_memberships WHERE organization_id=$1', [p.organization]);
    expect(row.status).toBe(state === 'pending' ? 'active' : state);
    if (state !== 'pending') expect(row.reason).toBe('prior decision');
    else expect((await db.query("SELECT meta->>'membershipId' AS id FROM action_logs WHERE action_key='pharmacy.default_membership.connect' AND meta->>'organizationId'=$1", [p.organization]))[0].id).toBe(row.id);
    if (['rejected', 'suspended', 'terminated'].includes(state))
      await expect(participation.apply(p.organization, owner, 'pharmacy')).rejects.toMatchObject({ code: 'PHARMACY_MEMBERSHIP_RESTRICTED' });
  });
  it('rolls back the pharmacy approval when the default business cannot be linked', async () => {
    const p = await pharmacy();
    await db.query("UPDATE semi_franchises SET status='closed' WHERE id=$1", [business]);
    try {
      await expect(approval.decide(reviewer, p.id, 'approve')).rejects.toMatchObject({ code: 'DEFAULT_PHARMACY_UNAVAILABLE' });
      expect((await db.query('SELECT status FROM neture_pharmacy_memberships WHERE id=$1', [p.id]))[0].status).toBe('pending');
      expect(await db.query('SELECT id FROM semi_franchise_memberships WHERE organization_id=$1', [p.organization])).toHaveLength(0);
    } finally { await db.query("UPDATE semi_franchises SET status='active' WHERE id=$1", [business]); }
  });
  it('requires an approved pharmacy, current qualification and current owner relationship for repair', async () => {
    const p = await pharmacy();
    await expect(participation.apply(p.organization, owner, 'pharmacy')).rejects.toMatchObject({ httpStatus: 403 });
    await approval.decide(reviewer, p.id, 'approve');
    await expect(participation.apply(p.organization, reviewer, 'pharmacy')).rejects.toMatchObject({ httpStatus: 403 });
    await db.query("UPDATE kpa_pharmacist_profiles SET qualification_status='revoked' WHERE user_id=$1", [owner]);
    try { await expect(participation.apply(p.organization, owner, 'pharmacy')).rejects.toMatchObject({ code: 'PHARMACIST_QUALIFICATION_REQUIRED' }); }
    finally { await db.query("UPDATE kpa_pharmacist_profiles SET qualification_status='approved' WHERE user_id=$1", [owner]); }
  });
  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query('DELETE FROM semi_franchise_memberships WHERE semi_franchise_id=$1 AND organization_id=ANY($2::uuid[])', [business, organizations]);
    await db.query('DELETE FROM neture_pharmacy_memberships WHERE id=ANY($1::uuid[])', [pharmacies]);
    await db.query('DELETE FROM organization_members WHERE organization_id=ANY($1::uuid[])', [organizations]);
    if (createdBusiness) await db.query('DELETE FROM semi_franchises WHERE id=$1', [business]);
    await db.query('DELETE FROM organizations WHERE id=ANY($1::uuid[])', [createdBusiness ? [...organizations, businessOrg] : organizations]);
    await db.query('DELETE FROM action_logs WHERE user_id=ANY($1::uuid[])', [[owner, reviewer]]);
    await db.query('DELETE FROM kpa_pharmacist_profiles WHERE user_id=$1', [owner]);
    await db.query('DELETE FROM service_memberships WHERE user_id=ANY($1::uuid[])', [[owner, reviewer]]);
    await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[owner, reviewer]]);
    expect(await db.query('SELECT id FROM users WHERE id=ANY($1::uuid[])', [[owner, reviewer]])).toHaveLength(0);
    await db.destroy();
  });
});
