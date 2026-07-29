import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-OPERATOR-RESIDUAL-DEBT-CLEANUP-AND-GUARD-HARDENING-V1
 * 선행 감사: docs/ir/IR-O4O-KPA-OPERATOR-TRACK-FINAL-CLOSEOUT-AND-RESIDUAL-DEBT-AUDIT-V1.md (S1 schema debt)
 * 원 CREATE: 20260410400000-CreateKpaContentHub.ts (L42, indexes L56-57)
 * 원 ALTER : 20261124000000-AddBodyToKpaWorkingContents.ts (body 컬럼 추가)
 *
 * `kpa_working_contents` = dead entity 은퇴.
 *   - 프로덕션 0행(WO 실행 시점 census 확인).
 *   - live route/controller/frontend/repository 소비처 0 (working-content flow 이미 제거됨).
 *   - `o4o_asset_snapshots` / canonical `/assets/copy` 와 무관(FK·import·query 0). standalone.
 *   - inbound FK / view / trigger / function 의존 0.
 *
 * forward-only DROP. CASCADE 미사용. `o4o_asset_snapshots`·`/assets/copy`·snapshot 데이터 불변.
 * 안전 가드: 테이블 존재 확인 + row count 0 확인 + inbound FK 0 확인.
 */
export class DropKpaWorkingContentsDeadTable20270213000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('kpa_working_contents');
    if (!exists) {
      return;
    }

    const [{ count }] = await queryRunner.query(
      `SELECT count(*)::int AS count FROM "kpa_working_contents"`,
    );
    if (count !== 0) {
      throw new Error(
        `[DropKpaWorkingContentsDeadTable] ABORT: kpa_working_contents 가 ${count} 행 보유. dead-entity 은퇴 선행조건(0행) 불충족.`,
      );
    }

    const [{ fk_count }] = await queryRunner.query(
      `SELECT count(*)::int AS fk_count
         FROM pg_constraint
        WHERE contype = 'f'
          AND confrelid = 'kpa_working_contents'::regclass`,
    );
    if (fk_count !== 0) {
      throw new Error(
        `[DropKpaWorkingContentsDeadTable] ABORT: kpa_working_contents 로 향하는 inbound FK ${fk_count} 개 존재. CASCADE 금지 정책상 은퇴 중지.`,
      );
    }

    // 전용 index(IDX_kpa_working_contents_owner / _source)·PK 는 DROP TABLE 시 함께 제거됨.
    await queryRunner.query(`DROP TABLE IF EXISTS "kpa_working_contents"`);
  }

  /**
   * down: 빈 테이블 구조 복원(원 CREATE 20260410400000 + ALTER 20261124000000 기준).
   * dead entity 이므로 데이터 복원은 무의미 — 구조만 복원(row 0).
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('kpa_working_contents');
    if (exists) return;
    await queryRunner.query(`
      CREATE TABLE "kpa_working_contents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "source_content_id" uuid NOT NULL,
        "owner_id" uuid NOT NULL,
        "title" character varying(300) NOT NULL,
        "edited_blocks" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "category" character varying(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "body" text,
        CONSTRAINT "PK_kpa_working_contents" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_kpa_working_contents_owner" ON "kpa_working_contents" ("owner_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_kpa_working_contents_source" ON "kpa_working_contents" ("source_content_id")`,
    );
  }
}
