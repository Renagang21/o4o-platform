import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-TABLET-DISPLAY-CONTENT-SELECTION-V1
 * 선행: WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-ACTIONS-V1 (콘텐츠 연결 + by-product)
 *
 * 타블렛 진열 레코드(store_tablet_displays)에 진열별 선택 콘텐츠 참조 추가.
 *   - content_id UUID NULL → kpa_store_contents(id) ON DELETE SET NULL
 *   - 콘텐츠 삭제 시 진열 제품 자체는 유지하고 선택만 해제(SET NULL).
 *   - 기본/대표 상세설명 지정 컬럼(is_default 등)은 만들지 않는다 — 진열마다 직접 선택.
 *
 * 기존 진열 row 는 content_id=NULL (선택 없음) → 회귀 0.
 */
export class AddContentIdToStoreTabletDisplays20261129000000 implements MigrationInterface {
  name = 'AddContentIdToStoreTabletDisplays20261129000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE store_tablet_displays
       ADD COLUMN IF NOT EXISTS content_id UUID NULL
       REFERENCES kpa_store_contents(id) ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_store_tablet_displays_content
       ON store_tablet_displays (content_id)`,
    );
    console.log('[Migration] store_tablet_displays.content_id added (tablet display selected content, FK SET NULL)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_store_tablet_displays_content`);
    await queryRunner.query(`ALTER TABLE store_tablet_displays DROP COLUMN IF EXISTS content_id`);
    console.log('[Migration] store_tablet_displays.content_id dropped');
  }
}
