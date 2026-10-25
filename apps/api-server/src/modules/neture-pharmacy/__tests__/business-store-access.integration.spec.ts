import { randomUUID } from 'crypto';
import { createCarePharmReviewDb } from '../../../__tests__/support/carepharm-review-db.js';
import { resolveBusinessStoreAccess } from '../services/business-store-access.js';
import { resolveSemiFranchiseBusinessAccess } from '../services/semi-franchise-community-access.js';
import { SemiFranchiseContentService } from '../services/semi-franchise-content.service.js';

const local = process.env.CAREPHARM_REVIEW_DATABASE_URL ? describe : describe.skip;
local('CarePharm selected pharmacy gate — actual PostgreSQL, no authorization mocks', () => {
  let fixture: Awaited<ReturnType<typeof createCarePharmReviewDb>>;
  const actor = randomUUID(), other = randomUUID(), a = randomUUID(), b = randomUUID(), foreign = randomUUID();
  const care = randomUUID(), pharmacy = randomUUID(), material = randomUUID();
  let contents: SemiFranchiseContentService;
  const copied: unknown[] = [];
  beforeAll(async () => {
    fixture = await createCarePharmReviewDb();
    await fixture.ds.query(`
      CREATE TABLE users (id uuid PRIMARY KEY, "isActive" boolean DEFAULT true, "isEmailVerified" boolean DEFAULT true, status text DEFAULT 'active');
      CREATE TABLE organization_members (user_id uuid, organization_id uuid, role text, left_at timestamp);
      CREATE TABLE neture_pharmacy_memberships (organization_id uuid PRIMARY KEY, status text);
      CREATE TABLE semi_franchises (id uuid PRIMARY KEY, key text UNIQUE, name text, status text, community_key text);
      CREATE TABLE semi_franchise_memberships (semi_franchise_id uuid, organization_id uuid, status text, PRIMARY KEY(semi_franchise_id, organization_id));
      CREATE TABLE service_memberships (user_id uuid, service_key text, status text);
      CREATE TABLE semi_franchise_operators (semi_franchise_id uuid, user_id uuid, revoked_at timestamp);
      CREATE TABLE role_assignments (user_id uuid, role text, is_active boolean, valid_from timestamptz, valid_until timestamptz);
      CREATE TABLE cooperatives (id uuid, semi_franchise_id uuid, status text);
      CREATE TABLE cooperative_roles (cooperative_id uuid, user_id uuid, revoked_at timestamptz);
      CREATE TABLE semi_franchise_contents (id uuid PRIMARY KEY, semi_franchise_id uuid, title text, summary text, body text, thumbnail_url text, attachments jsonb, tags jsonb, status text, published_at timestamp, created_at timestamp, updated_at timestamp);
    `);
    contents = new SemiFranchiseContentService(fixture.ds, async input => { copied.push(input); return { snapshotId: randomUUID() }; });
  });
  beforeEach(async () => {
    copied.length = 0;
    await fixture.ds.query('TRUNCATE users, organization_members, neture_pharmacy_memberships, semi_franchises, semi_franchise_memberships, service_memberships, semi_franchise_operators, role_assignments, cooperatives, cooperative_roles, semi_franchise_contents');
    await fixture.ds.query('INSERT INTO users(id) VALUES ($1),($2)', [actor, other]);
    await fixture.ds.query("INSERT INTO organization_members VALUES ($1,$2,'owner',null),($1,$3,'owner',null),($4,$5,'owner',null)", [actor,a,b,other,foreign]);
    await fixture.ds.query("INSERT INTO neture_pharmacy_memberships VALUES ($1,'active'),($2,'active'),($3,'active')", [a,b,foreign]);
    await fixture.ds.query("INSERT INTO semi_franchises VALUES ($1,'carepharm','Care','active',null),($2,'pharmacy','Pharmacy','active',null)", [care,pharmacy]);
    await fixture.ds.query("INSERT INTO semi_franchise_memberships VALUES ($1,$2,'active'),($3,$4,'active')", [care,a,pharmacy,b]);
    await fixture.ds.query("INSERT INTO semi_franchise_contents VALUES ($1,$2,'Care material',null,'<p>body</p>',null,'[]','[]','published',now(),now(),now())", [material,care]);
  });
  afterAll(async () => { if (fixture) await fixture.close(); });
  it('account-wide approval through A never authorizes unapproved B', async () => {
    expect(await resolveSemiFranchiseBusinessAccess(fixture.ds, actor, 'carepharm')).toMatchObject({ allowed: true });
    expect(await resolveBusinessStoreAccess(fixture.ds, actor, a, 'carepharm')).toMatchObject({ allowed: true, organizationId: a });
    expect(await resolveBusinessStoreAccess(fixture.ds, actor, b, 'carepharm')).toMatchObject({ allowed: false, membershipStatus: null });
    expect((await contents.pharmacyList(b, { sfKey: 'carepharm' })).items).toEqual([]);
    await expect(contents.pharmacyGet(b, material)).rejects.toMatchObject({ httpStatus: 404 });
    await expect(contents.pharmacyCopy(b, actor, material)).rejects.toMatchObject({ httpStatus: 404 });
    expect(copied).toEqual([]);
  });
  it.each(['pending','rejected','suspended','terminated'])('B %s remains denied while A stays approved', async status => {
    await fixture.ds.query('INSERT INTO semi_franchise_memberships VALUES ($1,$2,$3)', [care,b,status]);
    expect(await resolveBusinessStoreAccess(fixture.ds, actor, b, 'carepharm')).toMatchObject({ allowed: false, membershipStatus: status });
    expect((await contents.pharmacyList(b, { sfKey: 'carepharm' })).items).toHaveLength(0);
  });
  it('approval removal and business changes are evaluated on every call', async () => {
    await fixture.ds.query("INSERT INTO semi_franchise_memberships VALUES ($1,$2,'active')", [care,b]);
    expect((await resolveBusinessStoreAccess(fixture.ds, actor,b,'carepharm')).allowed).toBe(true);
    expect((await contents.pharmacyList(b,{sfKey:'carepharm'})).items).toHaveLength(1);
    await fixture.ds.query('DELETE FROM semi_franchise_memberships WHERE semi_franchise_id=$1 AND organization_id=$2',[care,b]);
    expect((await resolveBusinessStoreAccess(fixture.ds,actor,b,'carepharm')).allowed).toBe(false);
    expect((await resolveBusinessStoreAccess(fixture.ds,actor,b,'pharmacy')).allowed).toBe(true);
    expect((await resolveBusinessStoreAccess(fixture.ds,actor,a,'pharmacy')).allowed).toBe(false);
  });
  it('other accounts, inaccessible organizations, and removed organization roles cannot borrow approval', async () => {
    for (const [user,org] of [[other,a],[actor,foreign]]) await expect(resolveBusinessStoreAccess(fixture.ds,user,org,'carepharm')).rejects.toMatchObject({ httpStatus:403 });
    await fixture.ds.query('UPDATE organization_members SET left_at=now() WHERE user_id=$1 AND organization_id=$2',[actor,a]);
    await expect(resolveBusinessStoreAccess(fixture.ds,actor,a,'carepharm')).rejects.toMatchObject({httpStatus:403});
  });
  it('operator assignment does not replace the selected pharmacy membership', async () => {
    await fixture.ds.query('INSERT INTO semi_franchise_operators VALUES ($1,$2,null)',[care,actor]);
    await fixture.ds.query("INSERT INTO role_assignments(user_id,role,is_active) VALUES ($1,'neture:operator',true)",[actor]);
    expect((await resolveSemiFranchiseBusinessAccess(fixture.ds,actor,'carepharm')).allowed).toBe(true);
    expect((await resolveBusinessStoreAccess(fixture.ds,actor,b,'carepharm')).allowed).toBe(false);
  });
  it('closing the model or suspending the pharmacy revokes member resources', async () => {
    await fixture.ds.query("UPDATE semi_franchises SET status='closed' WHERE id=$1",[care]);
    expect((await resolveBusinessStoreAccess(fixture.ds,actor,a,'carepharm')).allowed).toBe(false);
    await fixture.ds.query("UPDATE semi_franchises SET status='active' WHERE id=$1",[care]);
    await fixture.ds.query("UPDATE neture_pharmacy_memberships SET status='suspended' WHERE organization_id=$1",[a]);
    expect((await resolveBusinessStoreAccess(fixture.ds,actor,a,'carepharm')).allowed).toBe(false);
  });
  it('returns only the latest published CarePharm materials for the pharmacy preview', async () => {
    for (let day = 1; day <= 5; day++) {
      await fixture.ds.query(`INSERT INTO semi_franchise_contents(id,semi_franchise_id,title,status,published_at)
        VALUES($1,$2,$3,'published',$4)`, [randomUUID(), care, `Material ${day}`, `2026-10-0${day}T00:00:00Z`]);
    }
    await fixture.ds.query("UPDATE semi_franchise_contents SET published_at='2026-09-01' WHERE id=$1", [material]);
    await fixture.ds.query(`INSERT INTO semi_franchise_contents(id,semi_franchise_id,title,status,published_at)
      VALUES($1,$2,'Unpublished','draft',NOW()),($3,$4,'Another model','published',NOW())`, [randomUUID(), care, randomUUID(), pharmacy]);
    await fixture.ds.query("INSERT INTO semi_franchise_memberships VALUES($1,$2,'active')", [pharmacy, a]);
    const result = await contents.pharmacyList(a, { sfKey: 'carepharm', page: 1, limit: 3 });
    expect(result.items.map((item: { title: string }) => item.title)).toEqual(['Material 5', 'Material 4', 'Material 3']);
    expect(result.total).toBe(6);
  });
  it('blocks direct material reads and copies after membership removal without invoking the copier', async () => {
    expect((await contents.pharmacyGet(a, material)).id).toBe(material);
    await fixture.ds.query("UPDATE semi_franchise_memberships SET status='suspended' WHERE semi_franchise_id=$1 AND organization_id=$2", [care, a]);
    expect((await contents.pharmacyList(a, { sfKey: 'carepharm', limit: 3 })).items).toEqual([]);
    await expect(contents.pharmacyGet(a, material)).rejects.toMatchObject({ httpStatus: 404 });
    await expect(contents.pharmacyCopy(a, actor, material)).rejects.toMatchObject({ httpStatus: 404 });
    expect(copied).toEqual([]);
  });
  it('filters exact tags with search and consistent pagination without crossing memberships or publication status', async () => {
    const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    await fixture.ds.query(`INSERT INTO semi_franchise_contents(id,semi_franchise_id,title,summary,tags,status,published_at)
      VALUES($1,$5,'운영 묶음 1','진열 참고','["자료 묶음","약국 운영"]','published','2026-10-20'),
            ($2,$5,'운영 묶음 2','진열 참고','["자료 묶음"]','published','2026-10-19'),
            ($3,$5,'운영 묶음 초안',null,'["자료 묶음"]','draft',NOW()),
            ($4,$6,'다른 협업체 묶음',null,'["자료 묶음"]','published',NOW())`, [...ids,care,pharmacy]);
    await fixture.ds.query("INSERT INTO semi_franchise_memberships VALUES($1,$2,'active')", [pharmacy,a]);
    const first = await contents.pharmacyList(a, { sfKey:'carepharm', tag:'자료 묶음', q:'진열', limit:1 });
    expect(first.total).toBe(2); expect(first.items.map((row:{id:string}) => row.id)).toEqual([ids[0]]);
    const second = await contents.pharmacyList(a, { sfKey:'carepharm', tag:'자료 묶음', q:'진열', limit:1, page:2 });
    expect(second.total).toBe(2); expect(second.items.map((row:{id:string}) => row.id)).toEqual([ids[1]]);
    expect((await contents.pharmacyList(a, { sfKey:'carepharm', tag:'자료' })).total).toBe(0);
    expect((await contents.pharmacyList(a, { sfKey:'carepharm', tag:"자료 묶음' OR true --" })).total).toBe(0);
    expect((await contents.pharmacyList(b, { sfKey:'carepharm', tag:'자료 묶음' })).total).toBe(0);
    await fixture.ds.query("UPDATE semi_franchise_memberships SET status='suspended' WHERE semi_franchise_id=$1 AND organization_id=$2", [care,a]);
    expect((await contents.pharmacyList(a, { sfKey:'carepharm', tag:'자료 묶음' })).total).toBe(0);
    await expect(contents.pharmacyCopy(a,actor,ids[0])).rejects.toMatchObject({ httpStatus:404 });
    expect(copied).toEqual([]);
  });
});
