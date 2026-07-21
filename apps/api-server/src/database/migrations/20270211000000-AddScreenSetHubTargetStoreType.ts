import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SUPPLIER-SCREEN-SET-POLICY-AND-TARGET-SCHEMA-V1
 * 설계: docs/architecture/ADR-O4O-SCREEN-SET-OWNER-SCOPE-MODEL-V1.md
 * 선행: 20270210000000-AddScreenSetOwnerScopeModel (origin='supplier' + supplier_id + CHK_stss_owner_scope)
 *
 * 공급자 Screen Set 의 **HUB 게시 대상 매장 유형**을 저장할 최소 컬럼을 추가한다.
 *
 * 상태 계약(신규 status 값 추가 없음 — 기존 CHECK 허용값 그대로 재사용):
 *   공급자 작성 중 : origin='supplier' AND status='draft'
 *   공급자 게시 중 : origin='supplier' AND status='active'   ← HUB 노출 조건
 *   공급자 게시 해제: active → 'draft'
 *   공급자 보관    : origin='supplier' AND status='archived'
 *   운영자 원본    : origin='operator' AND status='operator_template' (불변)
 *   ※ `supplier_template` 은 **도입하지 않는다**.
 *
 * hub_target_store_type(nullable VARCHAR(20)) 허용값: 'pharmacy' | 'non_pharmacy' | 'all'
 *   - 공급자(origin='supplier') 원본의 HUB 게시 대상에만 사용. 운영자·매장 행은 NULL 유지.
 *   - draft/archived 는 NULL 허용(대상값 유지도 허용 — 게시 해제·보관 시 값 보존 가능).
 *   - **origin='supplier' AND status='active' 이면 필수**(대상 없는 게시 차단).
 *   - 현재 매장의 약국/비약국 판별은 `organizations.type` 기준(앱 레이어).
 *
 * 의약품 포함 Screen Set 을 pharmacy 로만 제한하는 규칙은 **블록 내용 조사가 필요**하므로
 * DB CHECK 에 넣지 않고 후속 V2 의 **애플리케이션 가드 계약**으로 명시한다(CHECK 문서 참조).
 *
 * additive only. 기존 36행(운영자·매장) 전량 hub_target_store_type = NULL 로 신규 제약 자동 충족
 * → **backfill 0, 기존 데이터 무변경**. 기존 status·owner scope 제약은 건드리지 않는다.
 */
export class AddScreenSetHubTargetStoreType20270211000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) 게시 대상 매장 유형(nullable, additive)
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_sets ADD COLUMN IF NOT EXISTS hub_target_store_type VARCHAR(20)
    `);

    // 2) 무결성 제약
    //    (a) 허용값 + 공급자 전용   (b) 공급자 게시(active) 시 대상값 필수
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_sets
        ADD CONSTRAINT "CHK_stss_hub_target" CHECK (
          (hub_target_store_type IS NULL
            OR (origin = 'supplier' AND hub_target_store_type IN ('pharmacy', 'non_pharmacy', 'all')))
          AND
          (origin <> 'supplier' OR status <> 'active' OR hub_target_store_type IS NOT NULL)
        )
    `);

    // 3) HUB 노출 조회 파티션 인덱스(부분) — origin='supplier' AND status='active' 만 색인.
    //    현재 공급자 행 0 → 비용 0. 후속 V2 의 HUB 목록 쿼리 접근 경로.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stss_supplier_hub
        ON store_tablet_screen_sets (service_key, hub_target_store_type)
        WHERE origin = 'supplier' AND status = 'active' AND deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stss_supplier_hub`);
    await queryRunner.query(`ALTER TABLE store_tablet_screen_sets DROP CONSTRAINT IF EXISTS "CHK_stss_hub_target"`);
    await queryRunner.query(`ALTER TABLE store_tablet_screen_sets DROP COLUMN IF EXISTS hub_target_store_type`);
  }
}
