import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-TABLET-OPERATOR-COMMON-IDLE-VIDEO-SELECTION-V1
 *
 * 서비스 운영자 공통 영상을 태블릿 대기화면 후보로 쓸 수 있도록:
 *  1) signage_forced_content 에 노출 대상(target_surface) + 태블릿 재생 시간 컬럼 추가.
 *     - target_surface DEFAULT 'signage' → 기존 forced content 는 태블릿에 노출되지 않음(회귀 방지).
 *  2) 태블릿별 매장 경영자 선택을 저장하는 store_tablet_operator_idle_selections 신설.
 *     - 태블릿 1대당 active selection 1개(cleared_at IS NULL partial unique).
 *
 * additive only. 기존 사이니지 forced content 동작 불변.
 */
export class AddTabletIdleToForcedContentAndSelections20261203000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) forced content 확장
    await queryRunner.query(`
      ALTER TABLE signage_forced_content
        ADD COLUMN IF NOT EXISTS target_surface VARCHAR(20) NOT NULL DEFAULT 'signage',
        ADD COLUMN IF NOT EXISTS tablet_duration_seconds INTEGER
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sfc_target_surface
        ON signage_forced_content (service_key, target_surface, is_active)
        WHERE deleted_at IS NULL
    `);

    // 2) 태블릿별 운영자 공통 영상 선택
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_tablet_operator_idle_selections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        tablet_id UUID NOT NULL,
        forced_content_id UUID NOT NULL,
        selected_by_user_id UUID,
        selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        cleared_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // 태블릿 1대당 active(미해제) selection 은 1개만
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_stois_active_per_tablet
        ON store_tablet_operator_idle_selections (tablet_id)
        WHERE cleared_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stois_org
        ON store_tablet_operator_idle_selections (organization_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS store_tablet_operator_idle_selections`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sfc_target_surface`);
    await queryRunner.query(`
      ALTER TABLE signage_forced_content
        DROP COLUMN IF EXISTS tablet_duration_seconds,
        DROP COLUMN IF EXISTS target_surface
    `);
  }
}
