import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-SCHEMA-CONTRACT-V1
 *
 * store_tablet_screen_blocks.block_type CHECK 제약에 'content_list' 추가(additive).
 * 기존 값 삭제 없음 — 허용 목록에 신규 카드 목록 블록 타입만 확장.
 * 원본 CHECK: 20270120000000-CreateTabletScreenSetsAndBlocks (CHK_store_tablet_screen_blocks_type).
 */
export class AddContentListToTabletBlockTypeCheck20270206000000 implements MigrationInterface {
  name = 'AddContentListToTabletBlockTypeCheck20270206000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_blocks
        DROP CONSTRAINT IF EXISTS "CHK_store_tablet_screen_blocks_type"
    `);
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_blocks
        ADD CONSTRAINT "CHK_store_tablet_screen_blocks_type"
        CHECK (block_type IN (
          'idle_media', 'product_list', 'product_content',
          'corner_description', 'health_info', 'staff_inquiry', 'qr_guide',
          'content_list'
        ))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // content_list 를 제거한 원본 7종으로 복귀. content_list row 가 있으면 제약 위반이므로 먼저 제거.
    await queryRunner.query(`
      DELETE FROM store_tablet_screen_blocks WHERE block_type = 'content_list'
    `);
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_blocks
        DROP CONSTRAINT IF EXISTS "CHK_store_tablet_screen_blocks_type"
    `);
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_blocks
        ADD CONSTRAINT "CHK_store_tablet_screen_blocks_type"
        CHECK (block_type IN (
          'idle_media', 'product_list', 'product_content',
          'corner_description', 'health_info', 'staff_inquiry', 'qr_guide'
        ))
    `);
  }
}
