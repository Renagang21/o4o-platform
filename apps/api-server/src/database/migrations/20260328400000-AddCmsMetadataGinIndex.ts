import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCmsMetadataGinIndex20260328400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cms_metadata_gin
      ON cms_contents USING GIN (metadata jsonb_path_ops)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cms_metadata_gin`);
  }
}
