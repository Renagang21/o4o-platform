import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShareStatusToKpaStoreContents20260909000000 implements MigrationInterface {
  name = 'AddShareStatusToKpaStoreContents20260909000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE kpa_store_contents
        ADD COLUMN IF NOT EXISTS share_status  VARCHAR(20)  DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS shared_at     TIMESTAMPTZ  DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS shared_request_id UUID     DEFAULT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_kpa_store_contents_share_status
      ON kpa_store_contents (share_status)
      WHERE share_status IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS IDX_kpa_store_contents_share_status`,
    );
    await queryRunner.query(`
      ALTER TABLE kpa_store_contents
        DROP COLUMN IF EXISTS shared_request_id,
        DROP COLUMN IF EXISTS shared_at,
        DROP COLUMN IF EXISTS share_status
    `);
  }
}
