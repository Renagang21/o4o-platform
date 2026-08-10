import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-ACTION-LOGS-STATUS-CHECK-CONSTRAINT-ALIGN-V1
 *
 * `action_logs.status` 에 허용 값 CHECK 제약을 추가한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 필요한가
 *   정본은 `@o4o/action-log-core` 의 `ActionStatus = 'success' | 'failed'` 다
 *   (`packages/action-log-core/src/types.ts:13`). 그런데 DB 에는 제약이 없어서
 *   **잘못된 status 리터럴이 조용히 통과**했다.
 *
 *   실제 사고: 운영자 analytics 라우트가 실패를 `'failure'` 로 비교해
 *   (`routes/operator/analytics.routes.ts`) 실패 집계가 **구조적으로 항상 0** 이었다.
 *   DB 가 오타를 막지 못했고, 쿼리도 0건을 정상처럼 돌려줘 오랫동안 드러나지 않았다.
 *   → `WO-O4O-AUTH-FAILURE-RATE-DASHBOARD-SUCCESS-COLUMN-AUDIT-V1` 에서 조회 측을 고쳤고,
 *     본 migration 은 **재발을 DB 단에서 차단**한다.
 *
 * 적용 전 실측 (프로덕션 read-only, 2026-08-09)
 *   status 분포 : success 4,136 / failed 1,716 — **허용값 외 0건**
 *   NULL 0 · 앞뒤 공백 0 · 대문자 변형 0
 *   기존 제약   : PK 뿐 (CHECK 없음)
 *   총 행 수    : 5,852 (제약 검증 비용 무시 가능)
 *
 * 안전성
 *   - **데이터를 수정하지 않는다.** 기존 행이 전부 허용값이라 UPDATE·backfill 이 불필요하다
 *     (signage 계열 migration 과 달리 값 매핑 단계가 없다).
 *   - write 경로는 `ActionLogService.logAction()` **하나뿐**이고 그마저 `logSuccess`/`logFailure`
 *     내부에서만 호출된다. 타입(`ActionStatus`)이 컴파일 단에서 두 값으로 고정되어 있어
 *     제약 추가로 거부될 런타임 경로가 없다(전 저장소 호출부 확인).
 *   - `@o4o/action-log-core` 는 F1 Frozen Baseline 이라 **패키지는 건드리지 않는다.**
 *     DB 제약만 추가해 정본 타입과 스키마를 일치시킨다.
 *
 * down: 제약만 제거한다. 데이터를 되돌릴 것이 없다.
 */
export class AddActionLogsStatusCheckConstraint20270225000000 implements MigrationInterface {
  name = 'AddActionLogsStatusCheckConstraint20270225000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 방어: 재실행·부분 적용 상황에서도 안전하도록 먼저 제거한다.
    await queryRunner.query(`
      ALTER TABLE action_logs DROP CONSTRAINT IF EXISTS chk_action_logs_status
    `);

    // 허용값 외 데이터가 있으면 ALTER 가 실패하며 migration 이 롤백된다.
    // 값을 임의로 고쳐서 통과시키지 않는다 — 그 경우는 사람이 판단해야 한다.
    await queryRunner.query(`
      ALTER TABLE action_logs
        ADD CONSTRAINT chk_action_logs_status
        CHECK (status IN ('success', 'failed'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE action_logs DROP CONSTRAINT IF EXISTS chk_action_logs_status
    `);
  }
}
