/**
 * WO-O4O-GLYCOPHARM-LMS-QUALIFICATION-BACKEND-FOUNDATION-V1
 *
 * qualification_requests に service_key 追加.
 * 既存 KPA レコードは 'kpa-society' でバックフィル.
 * member_qualifications はプラットフォーム共通の資格状態トラッカーのため変更しない.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceKeyToQualification1771200000028 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // qualification_requests: service_key 追加
    await queryRunner.query(`
      ALTER TABLE qualification_requests
      ADD COLUMN IF NOT EXISTS service_key VARCHAR(50)
    `);

    // 既存レコードを KPA にバックフィル
    await queryRunner.query(`
      UPDATE qualification_requests
      SET service_key = 'kpa-society'
      WHERE service_key IS NULL
    `);

    // 検索性能用インデックス
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qualification_requests_service_key
      ON qualification_requests (service_key)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_qualification_requests_service_key
    `);
    await queryRunner.query(`
      ALTER TABLE qualification_requests DROP COLUMN IF EXISTS service_key
    `);
  }
}
