import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PAYOUT-ENGINE-V1
 *
 * payout_batches + payout_items 테이블 생성.
 * Settlement/Commission → PayoutBatch → PayoutItems → Paid 흐름.
 */
export class CreatePayoutTables1709309100000 implements MigrationInterface {
  name = 'CreatePayoutTables20260309100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. payout_batches
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payout_batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payout_type VARCHAR(30) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        total_amount INT NOT NULL DEFAULT 0,
        item_count INT NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'created',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        paid_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payout_batches_type"
        ON payout_batches (payout_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payout_batches_status"
        ON payout_batches (status)
    `);

    // 2. payout_items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payout_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_id UUID NOT NULL REFERENCES payout_batches(id) ON DELETE CASCADE,
        entity_type VARCHAR(30) NOT NULL,
        entity_id UUID NOT NULL,
        amount INT NOT NULL,
        reference_id UUID NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payout_items_batch"
        ON payout_items (batch_id)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_payout_items_reference"
        ON payout_items (reference_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payout_items_reference"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payout_items_batch"`);
    await queryRunner.query(`DROP TABLE IF EXISTS payout_items`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payout_batches_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payout_batches_type"`);
    await queryRunner.query(`DROP TABLE IF EXISTS payout_batches`);
  }
}
