/**
 * WO-O4O-GLYCOPHARM-LMS-QUALIFICATION-BACKEND-FOUNDATION-V1
 * WO-O4O-KPA-QUALIFICATION-MIGRATION-TIMESTAMP-COLLISION-FIX-V1 (relocation)
 *
 * qualification_requests に service_key 追加.
 * 既存 KPA レコードは 'kpa-society' でバックフィル.
 * member_qualifications はプラットフォーム共通の資格状態トラッカーのため変更しない.
 *
 * NOTE (relocation): 旧ファイルは `src/migrations/1771200000028-AddServiceKeyToQualification.ts`
 * に置かれていたが、当該ディレクトリは TypeORM の migrations glob
 * (`dist/database/migrations/*.js`) 対象外のため一度も実行されなかった。
 * 本ファイルはロード対象の `src/database/migrations/` へ移設し、衝突しない一意の
 * timestamp に採番し直したもの。up() は冪等 (IF NOT EXISTS) のため、手動復旧済みの
 * production に対して再実行されても安全に通過する。
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceKeyToQualification20260603000000 implements MigrationInterface {
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
