import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §8-1 (Scope Extension · DDL 승인 2026-09-21)
 *
 * handoff_tokens 를 SERVICE HANDOFF / WORKSPACE HANDOFF 두 형태로 확장한다.
 *   - target_service_key  NOT NULL → NULL 허용
 *   - target_workspace    varchar(32) NULL 신규
 *   - CHECK: 정확히 하나만 —
 *       SERVICE   : target_service_key IS NOT NULL AND target_workspace IS NULL
 *       WORKSPACE : target_service_key IS NULL     AND target_workspace IS NOT NULL AND target_workspace = 'store'
 *     (target_workspace 허용값은 현재 'store' 뿐 — 임의 문자열 금지.
 *      `IS NOT NULL` 을 명시하는 이유: 둘 다 NULL 이면 `NULL = 'store'` 가 NULL 이 되어 CHECK 를 통과해 버린다 — 격리 PG 에서 실측)
 * 기존 행은 모두 SERVICE 형태이므로 backfill 없음. 단일 사용 보장(consumed_at 원자 UPDATE)은 그대로다.
 * 가짜 serviceKey('store') 로 우회하지 않는다 — Store Workspace 는 서비스가 아니다.
 */
export class AlterHandoffTokensTargetWorkspace1789974015939 implements MigrationInterface {
  name = 'AlterHandoffTokensTargetWorkspace1789974015939';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE public.handoff_tokens ALTER COLUMN target_service_key DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE public.handoff_tokens ADD COLUMN target_workspace character varying(32) NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE public.handoff_tokens
        ADD CONSTRAINT "CHK_handoff_tokens_target_kind"
        CHECK (
          (target_service_key IS NOT NULL AND target_workspace IS NULL)
          OR (target_service_key IS NULL AND target_workspace IS NOT NULL AND target_workspace = 'store')
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE public.handoff_tokens DROP CONSTRAINT IF EXISTS "CHK_handoff_tokens_target_kind"`,
    );
    await queryRunner.query(`DELETE FROM public.handoff_tokens WHERE target_service_key IS NULL`);
    await queryRunner.query(`ALTER TABLE public.handoff_tokens DROP COLUMN IF EXISTS target_workspace`);
    await queryRunner.query(
      `ALTER TABLE public.handoff_tokens ALTER COLUMN target_service_key SET NOT NULL`,
    );
  }
}
