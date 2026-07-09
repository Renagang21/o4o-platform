import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1 / Phase 2 (additive)
 * Baseline: docs/baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V2-AMENDMENT.md
 *
 * product_landings — ProductMaster 당 1개의 제품 Landing(대표 QR 진입점).
 *   공개 URL = neture.co.kr/p/{public_key}. QR = 이 URL 의 동적 인코딩(이미지 비저장).
 *
 * Freeze #6: ProductMaster 무변경 — Landing → Master 단방향 참조.
 * Freeze #7(V2): master 당 Landing 1개(UNIQUE product_master_id).
 * 본 마이그레이션은 **빈 테이블 생성만** — Landing row 발급은 후속 apply WO(dry-run·승인).
 */
export class CreateProductLandings20261225000000 implements MigrationInterface {
  name = 'CreateProductLandings20261225000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_landings (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_master_id  UUID NOT NULL,
        public_key         VARCHAR(32) NOT NULL,
        status             VARCHAR(20) NOT NULL DEFAULT 'active',
        exposure_state     VARCHAR(24) NOT NULL DEFAULT 'ok',
        content_config     JSONB NULL,
        metadata           JSONB NULL,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at         TIMESTAMPTZ NULL
      )
    `);

    // master 당 활성 Landing 1개 (soft-delete 제외)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_product_landings_master
        ON product_landings (product_master_id)
       WHERE deleted_at IS NULL
    `);

    // public_key 전역 유니크 (공개 URL 식별자)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_product_landings_public_key
        ON product_landings (public_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_landings_status
        ON product_landings (status, exposure_state)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS product_landings CASCADE`);
  }
}
