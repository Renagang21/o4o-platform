import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-ADMIN-O4O-PRODUCT-MASTER-NOTE-V1 (additive)
 *
 * ProductMaster 별 내부 운영 메모 저장소를 additive 로 생성한다(첫 write 기능).
 * append 중심 + soft delete. ProductMaster 본문/식별자/설명/이미지/후보는 변경하지 않는다.
 *
 * 불변 보장 (이 migration 이 하지 않는 것):
 *   - product_masters / product_identifiers / shared_product_descriptions / product_images
 *     / product_candidates 기존 데이터·구조 변경하지 않음. 백필하지 않음(신규 빈 테이블).
 *
 * 정책:
 *   - product_master_id → product_masters(id) ON DELETE CASCADE (master 삭제 시 메모 정리)
 *   - hard delete 금지 — deleted_at/deleted_by soft delete 만
 *   - visibility 는 varchar (V1 'internal' 고정, 확장 여지)
 */
export class CreateProductMasterNotes20261212000000 implements MigrationInterface {
  name = 'CreateProductMasterNotes20261212000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_master_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        product_master_id UUID NOT NULL
          REFERENCES product_masters(id) ON DELETE CASCADE,

        note TEXT NOT NULL,
        visibility VARCHAR(20) NOT NULL DEFAULT 'internal',

        created_by UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by UUID,
        updated_at TIMESTAMPTZ,
        deleted_by UUID,
        deleted_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_pmn_master_created
       ON product_master_notes (product_master_id, created_at DESC)
       WHERE deleted_at IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // additive 테이블 제거(index/FK 동반 drop). product_masters 무변경.
    await queryRunner.query(`DROP TABLE IF EXISTS product_master_notes CASCADE`);
  }
}
