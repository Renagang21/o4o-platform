import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Approved Demo repair only; passwords, other identities and order ownership stay intact. */
export class RepairCanonicalDemoExperience1791501198171 implements MigrationInterface {
  name = 'RepairCanonicalDemoExperience1791501198171';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE canonical_demo_repair_snapshots (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      migration varchar(120) NOT NULL UNIQUE,
      snapshot jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    // The normal migration runner owns the transaction. Lock the registry and the fixed targets.
    const demos = await q.query(`SELECT d.id, d.user_id, d.demo_type FROM demo_accounts d
      JOIN users u ON u.id = d.user_id WHERE d.is_active FOR UPDATE OF d, u`);
    if (demos.length === 0) return; // A fresh schema has no public Demo accounts to repair.
    const owner = demos.filter((d: { demo_type: string }) => d.demo_type === 'STORE_OWNER');
    const supplier = demos.filter((d: { demo_type: string }) => d.demo_type === 'SUPPLIER');
    if (owner.length !== 1 || supplier.length !== 1 || demos.length !== 2) {
      throw new Error('Demo repair requires exactly one active account of each type');
    }
    const orgs = await q.query(`SELECT id FROM organizations WHERE id = $1
      AND (name LIKE '%테스트%' OR name LIKE '%Demo%') FOR UPDATE`,
      ['9c87f46b-57a1-4afe-80bd-60782c49ce96']);
    const suppliers = await q.query(`SELECT s.id, s.organization_id FROM neture_suppliers s
      JOIN organizations o ON o.id = s.organization_id
      JOIN organization_members m ON m.organization_id = o.id
      WHERE o.code = 'O4O-SUPPLIER-DEMO' AND m.user_id = $1
        AND m.role = 'owner' AND m.left_at IS NULL AND s.status = 'ACTIVE'
      FOR UPDATE OF s, o, m`, [supplier[0].user_id]);
    if (orgs.length !== 1 || suppliers.length !== 1) {
      throw new Error('Demo repair target organization/supplier census is ambiguous');
    }
    const orgId = orgs[0].id;
    const supplierId = suppliers[0].id;
    const franchises = await q.query(`SELECT id FROM semi_franchises
      WHERE key='pharmacy' AND status='active' FOR UPDATE`);
    if (franchises.length !== 1) throw new Error('Demo repair requires one active pharmacy semi-franchise');
    const franchiseId = franchises[0].id;
    const existingMembers = await q.query(`SELECT * FROM organization_members
      WHERE organization_id = $1 AND user_id = $2 FOR UPDATE`, [orgId, owner[0].user_id]);
    // Orphan historical memberships confer no access; every surviving operator must be this Demo.
    const operators = await q.query(`SELECT m.id,m.user_id,m.role FROM organization_members m
      JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 AND m.left_at IS NULL
        AND m.role IN ('owner','admin','manager') FOR UPDATE OF m,u`, [orgId]);
    if (operators.some((m: { user_id: string }) => m.user_id !== owner[0].user_id)) {
      throw new Error('Demo repair refuses an organization managed by another surviving user');
    }
    // The prior census identified this explicitly labelled test supplier. Never select arbitrary
    // private supplier rows, even though the current user classified existing data as test data.
    const sources = await q.query(`SELECT s.id FROM neture_suppliers s
      JOIN organizations o ON o.id=s.organization_id
      WHERE o.id::text LIKE '95aad740%' AND o.name LIKE '%테스트%' AND s.id<>$1
      FOR UPDATE OF s,o`, [supplierId]);
    if (sources.length > 1) throw new Error('Demo sample source census is ambiguous');
    const sourceIds = sources.map((s: { id: string }) => s.id);
    const ledger = await q.query(`SELECT * FROM neture_pharmacy_memberships
      WHERE organization_id = $1 FOR UPDATE`, [orgId]);
    if (existingMembers.length > 1 || ledger.length > 1 ||
        (ledger.length === 1 && (ledger[0].applicant_user_id !== owner[0].user_id ||
          ledger[0].pharmacist_license_number !== 'DEMO-ONLY'))) {
      throw new Error('Demo repair refuses ambiguous ownership or a non-synthetic pharmacy ledger');
    }
    const competing = await q.query(`SELECT 1 FROM organization_members m
      JOIN neture_pharmacy_memberships p ON p.organization_id = m.organization_id AND p.status = 'active'
      WHERE m.user_id = $1 AND m.left_at IS NULL AND m.role IN ('owner','admin','manager')
        AND m.organization_id <> $2 LIMIT 1`, [owner[0].user_id, orgId]);
    if (competing.length) throw new Error('Demo owner already has another approved pharmacy');

    // Census and before-images remain in the DB, never in public CI logs.
    const before = {
      organization_members: existingMembers,
      surviving_operators: operators,
      allowed_sample_supplier_ids: sourceIds,
      neture_pharmacy_memberships: ledger,
      semi_franchise_memberships: await q.query(`SELECT * FROM semi_franchise_memberships
        WHERE organization_id=$1 AND semi_franchise_id=$2 FOR UPDATE`, [orgId, franchiseId]),
      role_assignments: await q.query(`SELECT * FROM role_assignments WHERE user_id = $1`, [owner[0].user_id]),
      offer_count: (await q.query(`SELECT count(*)::int AS n FROM supplier_product_offers WHERE supplier_id = $1 AND deleted_at IS NULL`, [supplierId]))[0].n,
      library_count: (await q.query(`SELECT count(*)::int AS n FROM neture_supplier_library_items WHERE supplier_id = $1`, [supplierId]))[0].n,
    };
    const audit = await q.query(`INSERT INTO canonical_demo_repair_snapshots (migration,snapshot)
      VALUES ($1,$2::jsonb) RETURNING id`,
    [this.name, JSON.stringify({ before, owner_registry_id: owner[0].id, supplier_id: supplierId })]);

    if (existingMembers.length === 0) {
      await q.query(`INSERT INTO organization_members (organization_id,user_id,role,is_primary)
        VALUES ($1,$2,'owner',true)`, [orgId, owner[0].user_id]);
    } else {
      await q.query(`UPDATE organization_members SET role='owner', left_at=NULL, is_primary=true, updated_at=now()
        WHERE id=$1`, [existingMembers[0].id]);
    }
    if (ledger.length === 0) {
      await q.query(`INSERT INTO neture_pharmacy_memberships (organization_id,applicant_user_id,status,
        pharmacy_name,business_number,pharmacist_license_number,decided_at,reason)
        VALUES ($1,$2,'active','매장 경영자 Demo','0000000000','DEMO-ONLY',now(),'Synthetic public experience account')`,
      [orgId, owner[0].user_id]);
    } else {
      await q.query(`UPDATE neture_pharmacy_memberships SET status='active', decided_at=now(),updated_at=now()
        WHERE id=$1`, [ledger[0].id]);
    }
    await q.query(`INSERT INTO role_assignments (user_id,role,is_active)
      SELECT $1,'neture:store_owner',true WHERE NOT EXISTS (
        SELECT 1 FROM role_assignments WHERE user_id=$1 AND role='neture:store_owner' AND is_active)`, [owner[0].user_id]);
    await q.query(`INSERT INTO semi_franchise_memberships
      (semi_franchise_id,organization_id,status,applied_by,decided_at,reason)
      VALUES ($1,$2,'active',$3,now(),'Synthetic public Demo experience')
      ON CONFLICT (semi_franchise_id,organization_id) DO UPDATE
        SET status='active',decided_at=now(),updated_at=now()`, [franchiseId, orgId, owner[0].user_id]);

    // Reuse existing sample masters and descriptions as private drafts. Never transfer historical orders
    // or globally publish/approve a new Demo offer. Unique(master,supplier) prevents duplicate drafts.
    const offers = before.offer_count === 0 ? await q.query(`INSERT INTO supplier_product_offers
      (master_id,supplier_id,slug,price_general,consumer_short_description,consumer_detail_description,
       business_short_description,business_detail_description,distribution_type,approval_status,is_public,is_active)
      SELECT x.master_id,$1,'demo-'||gen_random_uuid()::text,x.price_general,
        x.consumer_short_description,x.consumer_detail_description,x.business_short_description,x.business_detail_description,
        'PRIVATE','PENDING',false,false
      FROM (SELECT DISTINCT ON (s.master_id) s.* FROM supplier_product_offers s
        WHERE s.supplier_id=ANY($2::uuid[]) AND s.deleted_at IS NULL AND NOT EXISTS (
          SELECT 1 FROM supplier_product_offers d WHERE d.supplier_id=$1 AND d.master_id=s.master_id)
        ORDER BY s.master_id,s.created_at,s.id LIMIT 5) x
      RETURNING id`, [supplierId, sourceIds]) : [];
    const library = before.library_count === 0 ? await q.query(`INSERT INTO neture_supplier_library_items
      (supplier_id,title,description,file_url,file_name,file_size,mime_type,category,content_type,blocks,is_public,visibility)
      SELECT $1,title,description,file_url,file_name,file_size,mime_type,category,content_type,blocks,false,'personal'
      FROM neture_supplier_library_items WHERE supplier_id=ANY($2::uuid[])
      ORDER BY created_at,id LIMIT 5 RETURNING id`, [supplierId, sourceIds]) : [];
    const after = {
      organization_members: await q.query(`SELECT * FROM organization_members WHERE organization_id=$1 AND user_id=$2`, [orgId, owner[0].user_id]),
      neture_pharmacy_memberships: await q.query(`SELECT * FROM neture_pharmacy_memberships WHERE organization_id=$1`, [orgId]),
      semi_franchise_memberships: await q.query(`SELECT * FROM semi_franchise_memberships
        WHERE organization_id=$1 AND semi_franchise_id=$2`, [orgId, franchiseId]),
      role_assignments: await q.query(`SELECT * FROM role_assignments WHERE user_id=$1`, [owner[0].user_id]),
      inserted_offer_ids: offers.map((r: { id: string }) => r.id),
      inserted_library_ids: library.map((r: { id: string }) => r.id),
    };
    await q.query(`UPDATE canonical_demo_repair_snapshots SET snapshot=snapshot || $2::jsonb WHERE id=$1`, [audit[0].id, JSON.stringify({ after })]);
    console.log(`DEMO_EXPERIENCE_REPAIR: pharmacy=1 offers_added=${offers.length} library_added=${library.length}`);
  }

  async down(): Promise<void> {
    // New activity may reference these rows. Never destroy it during an unattended rollback.
    throw new Error('Demo data rollback requires reviewed canonical_demo_repair_snapshots and a dependency census');
  }
}
