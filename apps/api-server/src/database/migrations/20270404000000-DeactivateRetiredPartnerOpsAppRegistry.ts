import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-ADMIN-PARTNEROPS-REGISTRY-PRODUCTDB-AUTH-AND-LINT-GATE-FINAL-CLOSURE-V1 §5
 * 선행 작업: WO-O4O-ADMIN-AUTHORIZATION-REGISTRY-AND-DEAD-SURFACE-FINAL-CLOSURE-V1 (commit 9fbfc590c)
 *   — PartnerOps 의 admin 메뉴 · 프런트 라우트 · 백엔드 mount · 실행 패키지 ·
 *     appsCatalog 항목을 전부 0 으로 만들었다(런타임 제거 완료).
 * 원 seed: 2026012200002-SeedDefaultApps.ts (`partnerops`, 'PartnerOps', standalone, status='active')
 *
 * 과거 제휴·링크추적·전환·자동수수료 애플리케이션(PartnerOps)은 은퇴했다.
 * 코드가 사라진 뒤에도 운영 `app_registry` 에만 status='active' 로 남아 있어
 * 앱 관리 화면의 등록 모듈 수와 `/api/v1/apps/availability` 응답에 실체 없는 앱이
 * 계속 active 로 포함된다.
 *
 * 비활성화(삭제 아님) 근거:
 *   - 본 WO 는 registry 행 정리를 **비활성화 우선**으로 지시한다(§5.2).
 *   - 삭제는 되돌릴 수 없고 설치 이력(installedAt)까지 소실되지만,
 *     status='inactive' 는 은퇴 사실을 기록으로 남기면서 소비 경로를 모두 닫는다.
 *   - `status` 는 AppRegistry 엔티티가 이미 가진 컬럼이고 'inactive' 는 기존 enum 값이다.
 *     새 컬럼·새 값('retired' 등)을 만들지 않는다.
 *   - 동일 축의 선행 정리(20270219000000-RemoveLegacyCosmeticsPartnerAppRegistry)는
 *     DELETE 를 선택했다. 본 migration 이 비활성화를 택한 것은 위 §5.2 지시 때문이며,
 *     두 행의 최종 상태(어떤 소비 경로에도 active 로 노출되지 않음)는 동일하다.
 *
 * 보존 대상 — 이름이 비슷하지만 살아 있는 계약이므로 건드리지 않는다:
 *   - `packages/partner-core` (별도 실행 패키지, 사용 중)
 *   - `appsCatalog.ts` SERVICE_GROUPS 의 `partnerops` 그룹 id 및 partner-core 의 serviceGroups 참조
 *   - Neture 파트너 모집 · 공급자/파트너 B2B 기능 · `partner_*` 운영 테이블
 *
 * 선행 조사(코드 기준):
 *   - `app_registry` 는 appId + status 만 보유. serviceKey/organizationId/구독·계약 컬럼 없음.
 *   - availability(`/api/v1/apps/availability`)는 `listInstalled()` 전체 행을 반환하고
 *     `active: status === 'active'` 로 매핑한다 → inactive 전환 후 active=false 로 응답한다.
 *   - `isAppActive()` · `getActiveApps()` 는 status='active' 만 통과시키므로 소비 경로가 닫힌다.
 *
 * SeedDefaultApps 는 수정하지 않는다(이력 보존). 신규 환경에서는
 * seed(2026012200002) → 본 정리(20270404000000) 순으로 실행되어 최종 inactive 가 된다.
 *
 * forward-only. 대상 행 부재 또는 이미 inactive 면 멱등 no-op.
 * 예상과 다르면 예외 → 트랜잭션 rollback.
 */
const TARGET_APP_ID = 'partnerops';
const RETIRED_STATUS = 'inactive';

export class DeactivateRetiredPartnerOpsAppRegistry20270404000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('app_registry');
    if (!exists) {
      // 레지스트리 테이블 자체가 없는 환경 — 멱등 no-op.
      return;
    }

    // 안전 가드 1: 대상 행 수 확인. 0 이면 정리 대상 없음, 2 이상이면 중지.
    const [{ count }] = await queryRunner.query(
      `SELECT count(*)::int AS count FROM "app_registry" WHERE "appId" = $1`,
      [TARGET_APP_ID],
    );
    if (count === 0) {
      return;
    }
    if (count > 1) {
      throw new Error(
        `[DeactivateRetiredPartnerOpsAppRegistry] ABORT: app_registry 에 "${TARGET_APP_ID}" 가 ${count} 행 존재. ` +
          `단일 행 정리 전제 불충족 — 중복 원인 확인 후 재판단 필요.`,
      );
    }

    // 안전 가드 2: 이 앱을 의존으로 선언한 다른 앱이 없어야 한다(jsonb 키 검사).
    // 비활성화도 의존 앱의 기동 전제를 깨뜨릴 수 있으므로 삭제와 같은 기준을 적용한다.
    const [{ dependent_count }] = await queryRunner.query(
      `SELECT count(*)::int AS dependent_count
         FROM "app_registry"
        WHERE "appId" <> $1
          AND "dependencies" IS NOT NULL
          AND jsonb_exists("dependencies", $1)`,
      [TARGET_APP_ID],
    );
    if (dependent_count !== 0) {
      throw new Error(
        `[DeactivateRetiredPartnerOpsAppRegistry] ABORT: "${TARGET_APP_ID}" 를 의존하는 앱 ${dependent_count} 개 존재. ` +
          `의존 해소 전에는 비활성화하지 않는다.`,
      );
    }

    // 이미 inactive 면 멱등 no-op (재실행 안전).
    const [{ active_count }] = await queryRunner.query(
      `SELECT count(*)::int AS active_count
         FROM "app_registry"
        WHERE "appId" = $1 AND "status" <> $2`,
      [TARGET_APP_ID, RETIRED_STATUS],
    );
    if (active_count === 0) {
      return;
    }

    // 다른 앱의 상태를 바꾸지 않았음을 사후 대조하기 위한 기준값.
    const [{ others_before }] = await queryRunner.query(
      `SELECT count(*)::int AS others_before
         FROM "app_registry"
        WHERE "appId" <> $1 AND "status" = 'active'`,
      [TARGET_APP_ID],
    );

    // 대상 1행만 정확히 비활성화. appId 외의 넓은 조건을 쓰지 않는다.
    // RETURNING 으로 실제 변경 행을 돌려받아 개수를 센다(드라이버별 affected 표현에 의존하지 않는다).
    const updatedRows = await queryRunner.query(
      `UPDATE "app_registry"
          SET "status" = $2, "updatedAt" = NOW()
        WHERE "appId" = $1 AND "status" <> $2
        RETURNING "appId"`,
      [TARGET_APP_ID, RETIRED_STATUS],
    );
    const affected = Array.isArray(updatedRows) ? updatedRows.length : 0;
    if (affected !== 1) {
      throw new Error(
        `[DeactivateRetiredPartnerOpsAppRegistry] ABORT: 예상 변경 1행 / 실제 ${affected} 행. ` +
          `영향 범위가 전제와 달라 중지한다.`,
      );
    }

    // 사후 검증 1: 대상 행이 inactive.
    const [{ still_active }] = await queryRunner.query(
      `SELECT count(*)::int AS still_active
         FROM "app_registry"
        WHERE "appId" = $1 AND "status" <> $2`,
      [TARGET_APP_ID, RETIRED_STATUS],
    );
    if (still_active !== 0) {
      throw new Error(
        `[DeactivateRetiredPartnerOpsAppRegistry] ABORT: 비활성화 후에도 "${TARGET_APP_ID}" 가 ${still_active} 행 active.`,
      );
    }

    // 사후 검증 2: 다른 앱의 active 수 불변.
    const [{ others_after }] = await queryRunner.query(
      `SELECT count(*)::int AS others_after
         FROM "app_registry"
        WHERE "appId" <> $1 AND "status" = 'active'`,
      [TARGET_APP_ID],
    );
    if (others_after !== others_before) {
      throw new Error(
        `[DeactivateRetiredPartnerOpsAppRegistry] ABORT: 다른 앱의 active 수가 ${others_before} → ${others_after} 로 변경됨.`,
      );
    }
  }

  /**
   * down: 의도적 no-op.
   *
   * PartnerOps 는 admin 메뉴 · 프런트 라우트 · 백엔드 mount · 실행 패키지 · appsCatalog 정의가
   * 모두 제거된 은퇴 애플리케이션이다. 행을 다시 active 로 되돌리면 실체 없는 앱이
   * 앱 관리 화면과 availability 에 재등장한다 — 복원이 곧 결함 재발이므로 복원하지 않는다.
   * 선행 정리(20270219000000-RemoveLegacyCosmeticsPartnerAppRegistry)와 같은 판단이다.
   *
   * 되돌림이 필요한 상황은 "PartnerOps 기능 자체를 되살린다" 는 별도 결정이 선행될 때뿐이며,
   * 그 시점에는 새 forward migration 으로 등록하는 것이 올바른 경로다.
   */
  public async down(): Promise<void> {
    // intentionally irreversible — see docblock
  }
}
