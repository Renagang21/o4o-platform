import { DataSource, type QueryRunner } from 'typeorm';
import { RepairCanonicalDemoExperience1791501198171 } from '../migrations/1791501198171-RepairCanonicalDemoExperience.js';

// Explicit isolated fixture DB only; never load the application's .env or a production proxy.
const port = Number(process.env.O4O_DEMO_REPAIR_TEST_PORT);
const integration = Number.isInteger(port) && port > 1024 && ![5432, 5442].includes(port) ? describe : describe.skip;
integration('canonical Demo repair (isolated PostgreSQL)', () => {
  let ds: DataSource;
  let q: QueryRunner;
  const migration = new RepairCanonicalDemoExperience1791501198171();
  const orgId = '9c87f46b-57a1-4afe-80bd-60782c49ce96';
  let ownerId: string;
  let supplierId: string;
  let sourceId: string;

  beforeAll(async () => {
    ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port, username: 'o4o_fixture',
      database: 'o4o_demo_recovery_test', entities: [], synchronize: false });
    await ds.initialize();
  });
  afterAll(async () => { if (ds?.isInitialized) await ds.destroy(); });
  beforeEach(async () => {
    q = ds.createQueryRunner();
    await q.startTransaction();
    await q.query('DROP TABLE IF EXISTS canonical_demo_repair_snapshots');
    ownerId = (await q.query(`INSERT INTO users(email,name) VALUES ('owner@fixture.invalid','Fixture owner') RETURNING id`))[0].id;
    const supplierUser = (await q.query(`INSERT INTO users(email,name) VALUES ('supplier@fixture.invalid','Fixture supplier') RETURNING id`))[0].id;
    await q.query(`INSERT INTO demo_accounts(user_id,demo_type) VALUES ($1,'STORE_OWNER'),($2,'SUPPLIER')`, [ownerId, supplierUser]);
    await q.query(`INSERT INTO organizations(id,code,name,type) VALUES ($1,'FIXTURE-PHARMACY','Fixture pharmacy','pharmacy')`, [orgId]);
    const supplierOrg = (await q.query(`INSERT INTO organizations(code,name,type) VALUES ('O4O-SUPPLIER-DEMO','Fixture supplier','supplier') RETURNING id`))[0].id;
    await q.query(`INSERT INTO organization_members(organization_id,user_id,role) VALUES ($1,$2,'owner')`, [supplierOrg, supplierUser]);
    supplierId = (await q.query(`INSERT INTO neture_suppliers(slug,status,organization_id) VALUES ('fixture-demo','ACTIVE',$1) RETURNING id`, [supplierOrg]))[0].id;
    sourceId = (await q.query(`INSERT INTO neture_suppliers(slug,status) VALUES ('fixture-source','ACTIVE') RETURNING id`))[0].id;
    const master = (await q.query(`INSERT INTO product_masters(name,regulatory_name,manufacturer_name)
      VALUES ('Fixture sample','Fixture sample','Fixture maker') RETURNING id`))[0].id;
    await q.query(`INSERT INTO supplier_product_offers(master_id,supplier_id,slug,price_general)
      VALUES ($1,$2,'fixture-original',1000)`, [master, sourceId]);
    await q.query(`INSERT INTO neture_supplier_library_items(supplier_id,title,file_url,file_name,file_size,mime_type)
      VALUES ($1,'Fixture sample','https://example.invalid/sample.pdf','sample.pdf',10,'application/pdf')`, [sourceId]);
  });
  afterEach(async () => { if (q.isTransactionActive) await q.rollbackTransaction(); await q.release(); });

  it('repairs approval/ownership and creates private supplier drafts while retaining source rows', async () => {
    await migration.up(q);
    expect((await q.query(`SELECT status FROM neture_pharmacy_memberships WHERE organization_id=$1`, [orgId]))[0].status).toBe('active');
    expect((await q.query(`SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2`, [orgId, ownerId]))[0].role).toBe('owner');
    expect((await q.query(`SELECT role FROM role_assignments WHERE user_id=$1`, [ownerId]))[0].role).toBe('neture:store_owner');
    const offers = await q.query(`SELECT approval_status,is_active,is_public FROM supplier_product_offers WHERE supplier_id=$1`, [supplierId]);
    expect(offers).toEqual([{ approval_status: 'PENDING', is_active: false, is_public: false }]);
    expect((await q.query(`SELECT count(*)::int AS n FROM supplier_product_offers WHERE supplier_id=$1`, [sourceId]))[0].n).toBe(1);
    expect((await q.query(`SELECT visibility,is_public FROM neture_supplier_library_items WHERE supplier_id=$1`, [supplierId]))[0]).toEqual({ visibility: 'personal', is_public: false });
    const snapshot = (await q.query(`SELECT snapshot FROM canonical_demo_repair_snapshots`))[0].snapshot;
    expect(snapshot.before.organization_members).toEqual([]);
    expect(snapshot.after.inserted_offer_ids).toHaveLength(1);
  });

  it('refuses an existing non-synthetic approval without changing it', async () => {
    await q.query(`INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,pharmacy_name,business_number,pharmacist_license_number)
      VALUES ($1,$2,'Fixture','9999999999','NON-DEMO')`, [orgId, ownerId]);
    await expect(migration.up(q)).rejects.toThrow('non-synthetic');
    expect((await q.query(`SELECT count(*)::int AS n FROM canonical_demo_repair_snapshots`))[0].n).toBe(0);
    expect((await q.query(`SELECT status FROM neture_pharmacy_memberships WHERE organization_id=$1`, [orgId]))[0].status).toBe('pending');
  });

  it('reactivates a synthetic approval and records its before-image', async () => {
    await q.query(`INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,status,pharmacy_name,business_number,pharmacist_license_number)
      VALUES ($1,$2,'suspended','Fixture','0000000000','DEMO-ONLY')`, [orgId, ownerId]);
    await migration.up(q);
    const snapshot = (await q.query(`SELECT snapshot FROM canonical_demo_repair_snapshots`))[0].snapshot;
    expect(snapshot.before.neture_pharmacy_memberships[0].status).toBe('suspended');
    expect(snapshot.after.neture_pharmacy_memberships[0].status).toBe('active');
  });

  it('preserves already linked supplier samples', async () => {
    await q.query(`UPDATE supplier_product_offers SET supplier_id=$1 WHERE supplier_id=$2`, [supplierId, sourceId]);
    await q.query(`UPDATE neture_supplier_library_items SET supplier_id=$1 WHERE supplier_id=$2`, [supplierId, sourceId]);
    await migration.up(q);
    const snapshot = (await q.query(`SELECT snapshot FROM canonical_demo_repair_snapshots`))[0].snapshot;
    expect(snapshot.after.inserted_offer_ids).toEqual([]);
    expect(snapshot.after.inserted_library_ids).toEqual([]);
  });

  it('rolls back ownership and backup writes if a later approval insert fails', async () => {
    const other = (await q.query(`INSERT INTO organizations(code,name,type)
      VALUES ('FIXTURE-COLLISION','Fixture collision','pharmacy') RETURNING id`))[0].id;
    await q.query(`INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,status,pharmacy_name,business_number,pharmacist_license_number)
      VALUES ($1,$2,'active','Fixture','0000000000','OTHER')`, [other, ownerId]);
    await expect(migration.up(q)).rejects.toThrow();
    await q.rollbackTransaction();
    expect((await q.query(`SELECT count(*)::int AS n FROM organization_members WHERE user_id=$1`, [ownerId]))[0].n).toBe(0);
    expect((await q.query(`SELECT to_regclass('public.canonical_demo_repair_snapshots') AS name`))[0].name).toBeNull();
  });
});
