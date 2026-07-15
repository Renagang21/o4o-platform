import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-TABLET-CORNER-CONTENT-ASSIGNMENT-MODEL-V1
 *
 * 코너(store_tablets) × 태블릿 콘텐츠(store_tablet_screen_sets) 다대다 연결 테이블.
 * 한 코너에 여러 Screen Set 을 "연결"(선택 가능 목록)로 두고, current_screen_set_id 는
 * 그중 현재 표시 콘텐츠 1개를 계속 나타낸다(역할 분리).
 *
 * - 연결 = 링크만(원본 복사 없음). 연결 삭제 ≠ Screen Set 원본 삭제/보관.
 * - UNIQUE(tablet_id, screen_set_id): 같은 코너에 같은 콘텐츠 중복 연결 금지.
 * - FK CASCADE: 코너/원본 삭제 시 연결만 자동 정리.
 * - up() 에서 기존 current_screen_set_id 를 연결로 멱등 백필(ON CONFLICT DO NOTHING).
 *
 * additive. 기존 store_tablets.current_screen_set_id / screen_set / QR 무변경.
 */
export class CreateStoreTabletCornerContents20270208000000 implements MigrationInterface {
  name = 'CreateStoreTabletCornerContents20270208000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_tablet_corner_contents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        tablet_id UUID NOT NULL,
        screen_set_id UUID NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_visible BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_stcc_tablet_set" UNIQUE (tablet_id, screen_set_id),
        CONSTRAINT "FK_stcc_tablet" FOREIGN KEY (tablet_id)
          REFERENCES store_tablets (id) ON DELETE CASCADE,
        CONSTRAINT "FK_stcc_screen_set" FOREIGN KEY (screen_set_id)
          REFERENCES store_tablet_screen_sets (id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stcc_org_tablet
        ON store_tablet_corner_contents (organization_id, tablet_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stcc_screen_set
        ON store_tablet_corner_contents (screen_set_id)
    `);

    // 백필: 기존 current_screen_set_id → 연결 행(org 일치 + 미삭제 set 만). 멱등.
    await queryRunner.query(`
      INSERT INTO store_tablet_corner_contents (organization_id, tablet_id, screen_set_id, sort_order, is_visible)
      SELECT t.organization_id, t.id, t.current_screen_set_id, 0, TRUE
        FROM store_tablets t
        JOIN store_tablet_screen_sets s
          ON s.id = t.current_screen_set_id
         AND s.organization_id = t.organization_id
         AND s.deleted_at IS NULL
       WHERE t.current_screen_set_id IS NOT NULL
      ON CONFLICT (tablet_id, screen_set_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS store_tablet_corner_contents`);
  }
}
