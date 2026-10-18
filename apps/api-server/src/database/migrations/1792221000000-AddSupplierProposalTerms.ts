import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupplierProposalTerms1792221000000 implements MigrationInterface {
  name = 'AddSupplierProposalTerms1792221000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE supply_proposals
      ADD COLUMN terms_snapshot jsonb,
      ADD COLUMN ended_by uuid REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN end_reason text,
      ADD CONSTRAINT supply_proposals_terms_snapshot_check CHECK (terms_snapshot IS NULL OR (
        jsonb_typeof(terms_snapshot) = 'object'
        AND terms_snapshot ?& ARRAY['version','baseShippingFee','freeShippingThreshold','minOrderAmount']
        AND terms_snapshot->'version' = '1'::jsonb
        AND jsonb_typeof(terms_snapshot->'baseShippingFee') = 'number'
        AND (terms_snapshot->>'baseShippingFee') ~ '^(0|[1-9][0-9]{0,9})$'
        AND (terms_snapshot->>'baseShippingFee')::numeric <= 2147483647
        AND jsonb_typeof(terms_snapshot->'minOrderAmount') = 'number'
        AND (terms_snapshot->>'minOrderAmount') ~ '^(0|[1-9][0-9]{0,9})$'
        AND (terms_snapshot->>'minOrderAmount')::numeric <= 2147483647
        AND (terms_snapshot->'freeShippingThreshold' = 'null'::jsonb OR (
          jsonb_typeof(terms_snapshot->'freeShippingThreshold') = 'number'
          AND (terms_snapshot->>'freeShippingThreshold') ~ '^[1-9][0-9]{0,9}$'
          AND (terms_snapshot->>'freeShippingThreshold')::numeric <= 2147483647
        ))
      ))`);
  }
  async down(q: QueryRunner): Promise<void> {
    const [row] = await q.query(`SELECT EXISTS(SELECT 1 FROM supply_proposals
      WHERE terms_snapshot IS NOT NULL OR ended_by IS NOT NULL OR end_reason IS NOT NULL) AS used`);
    if (row.used) throw new Error('Preserve proposal terms and end history before rollback');
    await q.query(`ALTER TABLE supply_proposals DROP CONSTRAINT supply_proposals_terms_snapshot_check,
      DROP COLUMN terms_snapshot, DROP COLUMN ended_by, DROP COLUMN end_reason`);
  }
}
