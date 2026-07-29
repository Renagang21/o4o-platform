import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-ORGANIZATION-JOIN-DEAD-FLOW-RETIREMENT-V1
 * 선행 감사: docs/ir/IR-O4O-KPA-OPERATOR-TRACK-FINAL-CLOSEOUT-AND-RESIDUAL-DEBT-AUDIT-V1.md (S1 schema debt),
 *           docs/checks/CHECK-O4O-KPA-OPERATOR-RESIDUAL-DEBT-CLEANUP-AND-GUARD-HARDENING-V1.md (C: org-join HOLD)
 * 원 CREATE: 2026012800001-CreateKpaOrganizationJoinRequests.ts (indexes L32-33, PK L28)
 *
 * `kpa_organization_join_requests` = orphan dead table 은퇴.
 *   - 프로덕션 0행(WO 실행 시점 census 확인).
 *   - live route/controller/frontend/repository 소비처 0
 *     (조직 가입 요청 컨트롤러는 shared kpa_approval_requests(entity_type='membership')를 사용했고,
 *      이 물리 테이블 자체는 코드에서 참조되지 않는 orphan. 컨트롤러 및 dead KPI 는 본 WO 에서 함께 은퇴).
 *   - inbound FK / view / trigger / function 의존 0 (self-owned PK/index 만 존재 → DROP TABLE 시 함께 제거).
 *   - canonical 회원 온보딩/역할 변경 = PATCH /api/v1/kpa/members/:id/status (별도 경로, 불변).
 *   - shared kpa_approval_requests 테이블은 다른 entity_type(instructor/course/forum_category/supplier...)
 *     에서 live 이므로 DROP 대상이 아님 — 본 마이그레이션은 orphan 물리 테이블만 제거.
 *
 * forward-only DROP. CASCADE 미사용(inbound FK 0 확인·실행 직전 재검증).
 * 안전 가드: 테이블 존재 확인 + 실행 직전 row count 0 확인 + inbound FK 0 확인.
 *   예상과 다르면 예외 발생 → 트랜잭션 rollback(테이블 보존).
 */
export class DropKpaOrganizationJoinRequestsDeadTable20270215000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('kpa_organization_join_requests');
    if (!exists) {
      // 이미 부재 — 멱등 no-op.
      return;
    }

    // 안전 가드 1: 실행 직전 row count 0 재확인 (0행이 아니면 은퇴 중지).
    const [{ count }] = await queryRunner.query(
      `SELECT count(*)::int AS count FROM "kpa_organization_join_requests"`,
    );
    if (count !== 0) {
      throw new Error(
        `[DropKpaOrganizationJoinRequestsDeadTable] ABORT: kpa_organization_join_requests 가 ${count} 행 보유. dead-table 은퇴 선행조건(0행) 불충족. 데이터 이관·정책 재검토 필요.`,
      );
    }

    // 안전 가드 2: inbound FK(다른 테이블 → kpa_organization_join_requests) 0 재확인.
    const [{ fk_count }] = await queryRunner.query(
      `SELECT count(*)::int AS fk_count
         FROM pg_constraint
        WHERE contype = 'f'
          AND confrelid = 'kpa_organization_join_requests'::regclass`,
    );
    if (fk_count !== 0) {
      throw new Error(
        `[DropKpaOrganizationJoinRequestsDeadTable] ABORT: kpa_organization_join_requests 로 향하는 inbound FK ${fk_count} 개 존재. CASCADE 금지 정책상 은퇴 중지.`,
      );
    }

    // 전용 index(IDX_kojr_org_status / IDX_kojr_user_status)·PK(PK_kpa_org_join_requests)는
    // DROP TABLE 시 함께 제거됨.
    await queryRunner.query(`DROP TABLE IF EXISTS "kpa_organization_join_requests"`);
  }

  /**
   * down: 빈 테이블 구조 복원(원 CREATE 2026012800001 기준 컬럼·PK·index).
   * dead table 이므로 데이터 복원은 무의미 — 구조만 복원(row 0). 애플리케이션 코드는
   * 이 테이블을 더 이상 참조하지 않으므로 복원 후에도 런타임 소비처는 없다.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('kpa_organization_join_requests');
    if (exists) return;
    await queryRunner.query(`
      CREATE TABLE "kpa_organization_join_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "requested_role" varchar(20) NOT NULL DEFAULT 'member',
        "requested_sub_role" varchar(50),
        "request_type" varchar(20) NOT NULL,
        "payload" jsonb,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "reviewed_by" uuid,
        "reviewed_at" timestamp,
        "review_note" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_kpa_org_join_requests" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_kojr_org_status" ON "kpa_organization_join_requests" ("organization_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_kojr_user_status" ON "kpa_organization_join_requests" ("user_id", "status")`,
    );
  }
}
