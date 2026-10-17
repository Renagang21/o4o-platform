import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Supplier originals remain private. Review copies live in the receiving business library. */
export class AddSupplierBusinessContentRequests1792215000000 implements MigrationInterface {
  name = 'AddSupplierBusinessContentRequests1792215000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE semi_franchise_contents
      ADD COLUMN source_item_id uuid,
      ADD COLUMN source_supplier_id uuid,
      ADD COLUMN review_reason text`);
    await q.query(`ALTER TABLE semi_franchise_contents DROP CONSTRAINT semi_franchise_contents_status_check`);
    await q.query(`ALTER TABLE semi_franchise_contents ADD CONSTRAINT semi_franchise_contents_status_check
      CHECK (status IN ('draft','pending','rejected','published','archived'))`);
    await q.query(`CREATE UNIQUE INDEX uq_sf_content_live_supplier_source
      ON semi_franchise_contents (semi_franchise_id, source_supplier_id, source_item_id)
      WHERE source_item_id IS NOT NULL AND status IN ('pending','draft','published')`);
  }
  async down(q: QueryRunner): Promise<void> {
    // Fail instead of silently discarding unprocessed supplier requests.
    const [row] = await q.query(`SELECT count(*)::int AS count FROM semi_franchise_contents WHERE source_item_id IS NOT NULL`);
    if (row.count > 0) throw new Error('Supplier content request copies must be reviewed before rollback');
    await q.query(`DROP INDEX uq_sf_content_live_supplier_source`);
    await q.query(`ALTER TABLE semi_franchise_contents DROP CONSTRAINT semi_franchise_contents_status_check`);
    await q.query(`ALTER TABLE semi_franchise_contents ADD CONSTRAINT semi_franchise_contents_status_check CHECK (status IN ('draft','published','archived'))`);
    await q.query(`ALTER TABLE semi_franchise_contents DROP COLUMN source_item_id, DROP COLUMN source_supplier_id, DROP COLUMN review_reason`);
  }
}
