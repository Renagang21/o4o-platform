import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-LEGACY-COSMETICS-PARTNER-REGISTRY-CLEANUP-V1
 * 선행 작업: WO-O4O-LEGACY-COSMETICS-PARTNER-REMOVAL-V1 (commit 7b57e284f)
 *   — /cosmetics-partner 라우트·화면 12파일·appsCatalog 항목·서비스 템플릿 참조를 제거했다.
 * 원 seed: 2026012200002-SeedDefaultApps.ts L28 (`cosmetics-partner`, '화장품 파트너')
 *
 * 과거 K-Cosmetics 인플루언서·제휴판매 기능의 고아 `app_registry` 행을 정리한다.
 * 코드·카탈로그가 모두 사라진 뒤에도 운영 DB 에만 status='active' 로 남아 있어
 * 앱 관리 화면의 등록 모듈 수와 availability 응답에 실체 없는 앱이 계속 포함된다.
 *
 * 삭제(비활성화 아님) 근거:
 *   - 잠시 중단된 운영 앱이 아니라 기능 코드·카탈로그 자체가 제거된 레거시.
 *   - 본체 패키지 @o4o/cosmetics-partner-extension 부재, 백엔드 라우트 0건.
 *   - inactive 로 남기면 "복구 가능한 앱" 으로 오독될 여지가 있다.
 *
 * 선행 조사(실행 시점 확인):
 *   - 운영 app_registry 7행 중 `cosmetics-partner` 정확히 1행. 변형 ID 0건.
 *   - 7행 전부 dependencies=null → 이 앱을 의존하는 다른 앱 0건.
 *   - app_registry 는 appId + status 만 보유. serviceKey/organizationId/구독·계약 컬럼 없음
 *     → 사용자 계약·라이선스 데이터 연결 없음.
 *   - 원 CREATE(2026012200001)가 FK 를 만들지 않았고 이후 FK 추가 migration 0건.
 *     AppUsageLog.appId / AppInstance.appId 는 uuid 로 별개 `apps` 테이블 소관 → 무관.
 *
 * SeedDefaultApps 는 수정하지 않는다(이력 보존). 신규 환경에서는
 * seed(2026012200002) → 본 정리(20270219000000) 순으로 실행되어 최종 0행이 된다.
 *
 * forward-only. 대상 행 부재 시 멱등 no-op. 예상과 다르면 예외 → 트랜잭션 rollback.
 */
const TARGET_APP_ID = 'cosmetics-partner';

export class RemoveLegacyCosmeticsPartnerAppRegistry20270219000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('app_registry');
    if (!exists) {
      // 레지스트리 테이블 자체가 없는 환경 — 멱등 no-op.
      return;
    }

    // 안전 가드 1: 대상 행 수 확인. 0 이면 이미 정리됨(재실행 안전), 2 이상이면 중지.
    const [{ count }] = await queryRunner.query(
      `SELECT count(*)::int AS count FROM "app_registry" WHERE "appId" = $1`,
      [TARGET_APP_ID],
    );
    if (count === 0) {
      return;
    }
    if (count > 1) {
      throw new Error(
        `[RemoveLegacyCosmeticsPartnerAppRegistry] ABORT: app_registry 에 "${TARGET_APP_ID}" 가 ${count} 행 존재. ` +
          `단일 행 정리 전제 불충족 — 중복 원인 확인 후 재판단 필요.`,
      );
    }

    // 안전 가드 2: 이 앱을 의존으로 선언한 다른 앱이 없어야 한다(jsonb 키 검사).
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
        `[RemoveLegacyCosmeticsPartnerAppRegistry] ABORT: "${TARGET_APP_ID}" 를 의존하는 앱 ${dependent_count} 개 존재. ` +
          `의존 해소 전에는 삭제하지 않는다.`,
      );
    }

    // 안전 가드 3: app_registry 로 향하는 inbound FK 0 재확인.
    const [{ fk_count }] = await queryRunner.query(
      `SELECT count(*)::int AS fk_count
         FROM pg_constraint
        WHERE contype = 'f'
          AND confrelid = 'app_registry'::regclass`,
    );
    if (fk_count !== 0) {
      throw new Error(
        `[RemoveLegacyCosmeticsPartnerAppRegistry] ABORT: app_registry 로 향하는 inbound FK ${fk_count} 개 존재. ` +
          `연쇄 삭제 위험이 있어 단독 행 삭제를 중지한다.`,
      );
    }

    // 대상 1행만 정확히 삭제. appId 외의 넓은 조건을 쓰지 않는다.
    await queryRunner.query(`DELETE FROM "app_registry" WHERE "appId" = $1`, [TARGET_APP_ID]);

    // 사후 검증: 대상 0행 / 나머지 앱 불변.
    const [{ remaining }] = await queryRunner.query(
      `SELECT count(*)::int AS remaining FROM "app_registry" WHERE "appId" = $1`,
      [TARGET_APP_ID],
    );
    if (remaining !== 0) {
      throw new Error(
        `[RemoveLegacyCosmeticsPartnerAppRegistry] ABORT: 삭제 후에도 "${TARGET_APP_ID}" ${remaining} 행 잔존.`,
      );
    }
  }

  /**
   * down: 의도적 no-op.
   *
   * 이 앱은 기능 코드·관리자 화면·appsCatalog 정의가 모두 제거된 레거시다.
   * 행을 되살리면 실체 없는 앱이 다시 active 로 등록되어 앱 관리 화면·availability 에
   * 고아 항목이 재등장한다 — 복원이 곧 결함 재발이므로 복원하지 않는다.
   *
   * 롤백이 꼭 필요하면 Cosmetics Partner 기능 코드 자체를 되살리는 별도 결정이 선행되어야 하며,
   * 그 시점에 새 forward migration 으로 등록하는 것이 올바른 경로다.
   */
  public async down(): Promise<void> {
    // intentionally irreversible — see docblock
  }
}
