/**
 * AddAnnualReportReview
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-REVIEW-V1
 *
 * 운영자 검수(승인 / 보완요청) 상태와 기록을 추가한다.
 *
 * 상태 4종:  draft → submitted → (revision_requested → submitted)* → approved
 *   역전이는 없다. approved 는 종착이다.
 *
 * 추가 컬럼
 *   revision_reason / revision_requested_at / revision_requested_by  최근 보완요청 1건 (WO §5 최소)
 *   approved_at / approved_by                                        승인 기록 (WO §6)
 *   revision_history                                                 보완요청으로 재작성이 열릴 때
 *                                                                    **검수 대상이던 제출 스냅샷을 보존**한다.
 *
 * revision_history 를 두는 이유 (WO §5 "submitted snapshot 자체를 파괴하지 않는다"):
 *   보완요청은 회원에게 `values` 쓰기 권한을 다시 여는 행위다. 아카이브가 없으면
 *   회원이 첫 글자를 고치는 순간 운영자가 검수했던 내용이 사라진다.
 *   그래서 보완요청 시점에 그때의 values·submitted_at 을 배열에 push 해 두고,
 *   회원은 현재 `values` 만 편집한다.
 *
 * 제약 변경
 *   CHK_annual_reports_status        4종으로 확장
 *   CHK_annual_reports_submitted_at  draft 만 NULL, 나머지 3종은 NOT NULL
 *                                    (revision_requested·approved 는 제출을 거친 상태다)
 *   CHK_annual_reports_synced_submitted → **`status='approved'` 로 좁힌다** (WO §7)
 *     검수 전 원장 변경을 DB 가 막는다. 착수 시점 `annual_reports` 0행이라
 *     기존 데이터와 충돌하지 않는다(CHECK §2-2 실측).
 *   CHK_annual_reports_review_fields 상태와 기록의 정합 — 승인이면 승인기록,
 *                                    보완요청이면 보완기록이 반드시 있다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnnualReportReview20270324000000 implements MigrationInterface {
  name = 'AddAnnualReportReview20270324000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "annual_reports"
        ADD COLUMN IF NOT EXISTS "revision_reason" text,
        ADD COLUMN IF NOT EXISTS "revision_requested_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "revision_requested_by" uuid,
        ADD COLUMN IF NOT EXISTS "approved_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "approved_by" uuid,
        ADD COLUMN IF NOT EXISTS "revision_history" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    // ── 상태 4종 ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "annual_reports" DROP CONSTRAINT IF EXISTS "CHK_annual_reports_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "annual_reports"
        ADD CONSTRAINT "CHK_annual_reports_status"
        CHECK ("status" IN ('draft', 'submitted', 'revision_requested', 'approved'))
    `);

    // ── submitted_at: draft 만 비어 있다 ────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "annual_reports" DROP CONSTRAINT IF EXISTS "CHK_annual_reports_submitted_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "annual_reports"
        ADD CONSTRAINT "CHK_annual_reports_submitted_at"
        CHECK (
          ("status" = 'draft' AND "submitted_at" IS NULL)
          OR ("status" <> 'draft' AND "submitted_at" IS NOT NULL)
        )
    `);

    // ── sync 는 승인 이후에만 (WO §7) ──────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "annual_reports" DROP CONSTRAINT IF EXISTS "CHK_annual_reports_synced_submitted"
    `);
    await queryRunner.query(`
      ALTER TABLE "annual_reports"
        ADD CONSTRAINT "CHK_annual_reports_synced_approved"
        CHECK ("synced_to_membership" = false OR "status" = 'approved')
    `);

    // ── 상태 ↔ 검수기록 정합 ────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "annual_reports" DROP CONSTRAINT IF EXISTS "CHK_annual_reports_review_fields"
    `);
    await queryRunner.query(`
      ALTER TABLE "annual_reports"
        ADD CONSTRAINT "CHK_annual_reports_review_fields"
        CHECK (
          ("status" <> 'approved' OR ("approved_at" IS NOT NULL AND "approved_by" IS NOT NULL))
          AND
          ("status" <> 'revision_requested'
             OR ("revision_requested_at" IS NOT NULL AND "revision_requested_by" IS NOT NULL))
        )
    `);

    // 운영자 검수 큐 — 아직 처리하지 않은 제출본
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_annual_reports_review_pending"
        ON "annual_reports" ("organization_id", "year")
        WHERE "status" = 'submitted'
    `);

    // 승인 후 미반영 — sync 작업 큐. 기존 sync_pending 인덱스는 submitted 기준이라 대체한다.
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_annual_reports_sync_pending"`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_annual_reports_sync_pending"
        ON "annual_reports" ("organization_id", "year")
        WHERE "status" = 'approved' AND "synced_to_membership" = false
    `);

    console.log('[AddAnnualReportReview] annual_reports review columns/constraints ready');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_annual_reports_review_pending"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_annual_reports_sync_pending"`);
    await queryRunner.query(`
      ALTER TABLE "annual_reports" DROP CONSTRAINT IF EXISTS "CHK_annual_reports_review_fields"
    `);
    await queryRunner.query(`
      ALTER TABLE "annual_reports" DROP CONSTRAINT IF EXISTS "CHK_annual_reports_synced_approved"
    `);

    // 검수 상태 행을 되돌릴 수 없으므로 down 은 상태를 좁히기 전에 정리한다.
    await queryRunner.query(`
      UPDATE "annual_reports" SET "status" = 'submitted'
       WHERE "status" IN ('revision_requested', 'approved')
    `);

    await queryRunner.query(`
      ALTER TABLE "annual_reports" DROP CONSTRAINT IF EXISTS "CHK_annual_reports_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "annual_reports"
        ADD CONSTRAINT "CHK_annual_reports_status" CHECK ("status" IN ('draft', 'submitted'))
    `);
    await queryRunner.query(`
      ALTER TABLE "annual_reports" DROP CONSTRAINT IF EXISTS "CHK_annual_reports_submitted_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "annual_reports"
        ADD CONSTRAINT "CHK_annual_reports_submitted_at"
        CHECK (
          ("status" = 'draft' AND "submitted_at" IS NULL)
          OR ("status" = 'submitted' AND "submitted_at" IS NOT NULL)
        )
    `);
    await queryRunner.query(`
      ALTER TABLE "annual_reports"
        ADD CONSTRAINT "CHK_annual_reports_synced_submitted"
        CHECK ("synced_to_membership" = false OR "status" = 'submitted')
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_annual_reports_sync_pending"
        ON "annual_reports" ("organization_id", "year")
        WHERE "status" = 'submitted' AND "synced_to_membership" = false
    `);
    await queryRunner.query(`
      ALTER TABLE "annual_reports"
        DROP COLUMN IF EXISTS "revision_history",
        DROP COLUMN IF EXISTS "approved_by",
        DROP COLUMN IF EXISTS "approved_at",
        DROP COLUMN IF EXISTS "revision_requested_by",
        DROP COLUMN IF EXISTS "revision_requested_at",
        DROP COLUMN IF EXISTS "revision_reason"
    `);
  }
}
