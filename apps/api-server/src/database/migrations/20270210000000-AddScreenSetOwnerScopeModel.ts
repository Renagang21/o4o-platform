import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SCREEN-SET-OWNER-SCOPE-SCHEMA-MIGRATION-V1
 * 설계: docs/architecture/ADR-O4O-SCREEN-SET-OWNER-SCOPE-MODEL-V1.md
 *
 * Screen Set 소유권 모델(store / operator / supplier)을 스키마에 반영한다.
 *   1) organization_id nullable 전환 — 매장 전용 경계(F6). operator/supplier 는 NULL.
 *   2) supplier_id 추가 — nullable **soft-ref(FK 없음)**. 공급자 식별자.
 *      (shared_product_descriptions.created_by_supplier_id 와 동일 관례 — FK 삭제정책 충돌 회피,
 *       canonical supplier 레지스트리 검증은 supplier authoring WO 의 앱 레이어에서 수행.)
 *   3) origin CHECK 에 'supplier' 추가.
 *   4) CHK_stss_owner_scope — 주체별 유효 조합 강제(무효 조합 저장 차단).
 *   5) operator/supplier 부분 인덱스(최소).
 *
 * 유효 조합:
 *   store    : organization_id NOT NULL, supplier_id NULL
 *   operator : organization_id NULL, supplier_id NULL, service_key NOT NULL, created_by_user_id NOT NULL
 *   supplier : organization_id NULL, supplier_id NOT NULL, service_key NOT NULL
 *
 * additive/relaxing only. 기존 매장 row 전량 origin='store' AND organization_id NOT NULL
 * → store 브랜치 자동 충족(backfill 0, 데이터 무변경). 기존 store 경로·public runtime·QR 불변.
 */
export class AddScreenSetOwnerScopeModel20270210000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) organization_id nullable (매장 전용; operator/supplier 는 NULL)
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_sets ALTER COLUMN organization_id DROP NOT NULL
    `);

    // 2) supplier_id (nullable soft-ref; FK 없음)
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_sets ADD COLUMN IF NOT EXISTS supplier_id UUID
    `);

    // 3) origin 허용값에 supplier 추가
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_sets DROP CONSTRAINT IF EXISTS "CHK_store_tablet_screen_sets_origin"
    `);
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_sets
        ADD CONSTRAINT "CHK_store_tablet_screen_sets_origin"
        CHECK (origin IN ('store', 'operator', 'supplier'))
    `);

    // 4) 주체별 유효 조합 강제 (무효 조합 저장 차단)
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_sets
        ADD CONSTRAINT "CHK_stss_owner_scope" CHECK (
          (origin = 'store'    AND organization_id IS NOT NULL AND supplier_id IS NULL) OR
          (origin = 'operator' AND organization_id IS NULL     AND supplier_id IS NULL
                               AND service_key IS NOT NULL      AND created_by_user_id IS NOT NULL) OR
          (origin = 'supplier' AND organization_id IS NULL     AND supplier_id IS NOT NULL
                               AND service_key IS NOT NULL)
        )
    `);

    // 5) 부분 인덱스(최소) — operator / supplier 조회 파티션(파티션당 실제 파티션 row 만 색인)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stss_operator_scope
        ON store_tablet_screen_sets (service_key, status)
        WHERE origin = 'operator' AND deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stss_supplier_scope
        ON store_tablet_screen_sets (supplier_id, service_key, status)
        WHERE origin = 'supplier' AND deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stss_supplier_scope`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stss_operator_scope`);
    // owner_scope CHECK 를 supplier_id 컬럼보다 먼저 제거(참조).
    await queryRunner.query(`ALTER TABLE store_tablet_screen_sets DROP CONSTRAINT IF EXISTS "CHK_stss_owner_scope"`);
    await queryRunner.query(`ALTER TABLE store_tablet_screen_sets DROP CONSTRAINT IF EXISTS "CHK_store_tablet_screen_sets_origin"`);
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_sets
        ADD CONSTRAINT "CHK_store_tablet_screen_sets_origin"
        CHECK (origin IN ('store', 'operator'))
    `);
    await queryRunner.query(`ALTER TABLE store_tablet_screen_sets DROP COLUMN IF EXISTS supplier_id`);
    // organization_id NOT NULL 복원. operator/supplier(org NULL) row 존재 시 실패 — 의도적(원복은 해당 데이터 없을 때만).
    await queryRunner.query(`ALTER TABLE store_tablet_screen_sets ALTER COLUMN organization_id SET NOT NULL`);
  }
}
