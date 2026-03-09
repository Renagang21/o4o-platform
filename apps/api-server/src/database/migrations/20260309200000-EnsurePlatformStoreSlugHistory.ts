import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-STORE-SLUG-REGISTRATION-V1 (보조)
 *
 * platform_store_slug_history 테이블이 프로덕션에 없을 수 있음.
 * 원래 테이블 생성 마이그레이션(1771200000000)이 src/migrations/에 위치하여
 * TypeORM migration runner가 로드하지 않았음.
 *
 * 이 마이그레이션은 테이블이 없는 경우에만 생성 (IF NOT EXISTS).
 */
export class EnsurePlatformStoreSlugHistory20260309200000 implements MigrationInterface {
  name = 'EnsurePlatformStoreSlugHistory20260309200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS platform_store_slug_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        store_id UUID NOT NULL,
        service_key VARCHAR(50) NOT NULL,
        old_slug VARCHAR(120) NOT NULL,
        new_slug VARCHAR(120) NOT NULL,
        changed_by UUID NOT NULL,
        changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_platform_store_slug_history_store
        ON platform_store_slug_history (store_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_platform_store_slug_history_old_slug
        ON platform_store_slug_history (old_slug);
    `);

    console.log('[EnsurePlatformStoreSlugHistory] Table ensured');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS platform_store_slug_history`);
    console.log('[EnsurePlatformStoreSlugHistory] Table dropped');
  }
}
