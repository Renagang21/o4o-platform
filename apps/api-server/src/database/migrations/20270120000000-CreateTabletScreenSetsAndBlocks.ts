import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-SCHEMA-V1
 * 설계: CHECK-O4O-KPA-TABLET-CORNER-SCREEN-SET-BLOCK-DESIGN-V1 §5 (A안 Phase 1)
 *
 * 태블릿 코너별 화면 세트/블록 모델을 저장할 **최소 additive schema**.
 * 이번 단계는 빈 구조만 만든다 — 기능/런타임/UI 변경 없음.
 *
 *  1) store_tablet_screen_sets   — 코너 태블릿에 적용할 화면 세트(여러 개 저장, 1개 current)
 *  2) store_tablet_screen_blocks — 세트 내부 구성 단위(idle_media/product_list/... + jsonb config)
 *  3) store_tablets.current_screen_set_id — 현재 적용 세트(assignment). NULL = 기존 legacy 경로
 *
 * 경계(F6): organization_id = Store Ops(soft ref, 최근 store_tablet_* 테이블 관례와 동일),
 *           service_key = 운영자 템플릿(Broadcast). 데이터 이전/흡수 없음(dual-read는 후속 WO).
 * additive only. current_screen_set_id NULL 이면 기존 public runtime 동작 완전 불변.
 */
export class CreateTabletScreenSetsAndBlocks20270120000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) 화면 세트 (코너/태블릿 단위 또는 매장 재사용)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_tablet_screen_sets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        service_key VARCHAR(50),
        tablet_id UUID,
        name VARCHAR(120) NOT NULL,
        origin VARCHAR(20) NOT NULL DEFAULT 'store',
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        created_by_user_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT "CHK_store_tablet_screen_sets_origin"
          CHECK (origin IN ('store', 'operator')),
        CONSTRAINT "CHK_store_tablet_screen_sets_status"
          CHECK (status IN ('draft', 'active', 'archived', 'operator_template'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stss_org_status
        ON store_tablet_screen_sets (organization_id, status)
        WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stss_tablet
        ON store_tablet_screen_sets (tablet_id)
        WHERE deleted_at IS NULL
    `);

    // 2) 화면 블록 (세트 내부 구성 단위 — block_type 판별 + jsonb config)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_tablet_screen_blocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        screen_set_id UUID NOT NULL,
        block_type VARCHAR(30) NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_visible BOOLEAN NOT NULL DEFAULT TRUE,
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_store_tablet_screen_blocks_set"
          FOREIGN KEY (screen_set_id) REFERENCES store_tablet_screen_sets (id) ON DELETE CASCADE,
        CONSTRAINT "CHK_store_tablet_screen_blocks_type"
          CHECK (block_type IN (
            'idle_media', 'product_list', 'product_content',
            'corner_description', 'health_info', 'staff_inquiry', 'qr_guide'
          ))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stsb_set_order
        ON store_tablet_screen_blocks (screen_set_id, sort_order)
    `);

    // 3) 태블릿 현재 적용 세트 (assignment). NULL = legacy 경로
    await queryRunner.query(`
      ALTER TABLE store_tablets
        ADD COLUMN IF NOT EXISTS current_screen_set_id UUID
    `);
    // 세트 삭제 시 태블릿은 legacy 경로로 복귀(SET NULL). 존재 시 재실행 방지 위해 조건부 추가.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_store_tablets_current_screen_set'
        ) THEN
          ALTER TABLE store_tablets
            ADD CONSTRAINT "FK_store_tablets_current_screen_set"
            FOREIGN KEY (current_screen_set_id)
            REFERENCES store_tablet_screen_sets (id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE store_tablets
        DROP CONSTRAINT IF EXISTS "FK_store_tablets_current_screen_set"
    `);
    await queryRunner.query(`
      ALTER TABLE store_tablets
        DROP COLUMN IF EXISTS current_screen_set_id
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS store_tablet_screen_blocks`);
    await queryRunner.query(`DROP TABLE IF EXISTS store_tablet_screen_sets`);
  }
}
