import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-OPERATOR-RESIDUAL-DEBT-CLEANUP-AND-GUARD-HARDENING-V1
 * 선행 감사: docs/ir/IR-O4O-KPA-OPERATOR-TRACK-FINAL-CLOSEOUT-AND-RESIDUAL-DEBT-AUDIT-V1.md (S1 schema debt)
 * 원 CREATE: 20260206190000-CreateKpaFoundationTables.ts (L77)
 *
 * `kpa_applications` = dead flow 은퇴.
 *   - 프로덕션 0행(WO 실행 시점 census 확인).
 *   - live route/controller/frontend/repository 소비처 0 (dead-flow retirement 로 이미 제거됨).
 *   - inbound FK / view / trigger / function 의존 0.
 *   - canonical 회원 온보딩 = PATCH /api/v1/kpa/members/:id/status (별도 경로).
 *
 * forward-only DROP. CASCADE 미사용(inbound FK 0 확인·실행 직전 재검증).
 * 안전 가드: 테이블 존재 확인 + 실행 직전 row count 0 확인 + inbound FK 0 확인.
 *   예상과 다르면 예외 발생 → 트랜잭션 rollback(테이블 보존).
 */
export class DropKpaApplicationsDeadTable20270212000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('kpa_applications');
    if (!exists) {
      // 이미 부재 — 멱등 no-op.
      return;
    }

    // 안전 가드 1: 실행 직전 row count 0 재확인 (0행이 아니면 은퇴 중지).
    const [{ count }] = await queryRunner.query(
      `SELECT count(*)::int AS count FROM "kpa_applications"`,
    );
    if (count !== 0) {
      throw new Error(
        `[DropKpaApplicationsDeadTable] ABORT: kpa_applications 가 ${count} 행 보유. dead-table 은퇴 선행조건(0행) 불충족. 데이터 이관·정책 재검토 필요.`,
      );
    }

    // 안전 가드 2: inbound FK(다른 테이블 → kpa_applications) 0 재확인.
    const [{ fk_count }] = await queryRunner.query(
      `SELECT count(*)::int AS fk_count
         FROM pg_constraint
        WHERE contype = 'f'
          AND confrelid = 'kpa_applications'::regclass`,
    );
    if (fk_count !== 0) {
      throw new Error(
        `[DropKpaApplicationsDeadTable] ABORT: kpa_applications 로 향하는 inbound FK ${fk_count} 개 존재. CASCADE 금지 정책상 은퇴 중지.`,
      );
    }

    // PK/인덱스는 DROP TABLE 시 함께 제거됨(전용 index·constraint = PK_kpa_applications).
    await queryRunner.query(`DROP TABLE IF EXISTS "kpa_applications"`);
  }

  /**
   * down: 빈 테이블 구조 복원(원 CREATE 20260206190000 기준 컬럼·PK).
   * dead flow 이므로 데이터 복원은 무의미 — 구조만 복원(row 0). 애플리케이션 코드는
   * 이 테이블을 더 이상 참조하지 않으므로 복원 후에도 런타임 소비처는 없다.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('kpa_applications');
    if (exists) return;
    await queryRunner.query(`
      CREATE TABLE "kpa_applications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "type" character varying(50) NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "status" character varying(50) NOT NULL DEFAULT 'submitted'::character varying,
        "note" text,
        "reviewer_id" uuid,
        "review_comment" text,
        "reviewed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_kpa_applications" PRIMARY KEY ("id")
      )
    `);
  }
}
