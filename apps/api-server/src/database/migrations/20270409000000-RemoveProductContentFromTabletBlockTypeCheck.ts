import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-SCHEMA-COMPATIBILITY-RESIDUE-AND-ORPHANED-TABLE-CLOSURE-V1 — §2
 *
 * store_tablet_screen_blocks.block_type CHECK 에서 'product_content' 허용값 제거(축소).
 *
 * product_content 블록 타입은 선행 WO
 * (WO-O4O-KPA-TABLET-GENERATION-CONSOLIDATION-AND-CANONICAL-REFERENCE-V1)
 * 가 쓰기 허용 목록 · resolver · 뷰어에서 은퇴시켰고, CHECK 제약 축소만 "별도 승인" 으로 남겨 이관했다 —
 * 그 승인이 이 WO 다.
 *
 * 실측(read-only, 이 WO census):
 *   - 프로덕션 block_type 분포: corner_description 46 · qr_guide 42 · content_list 41 · idle_media 38 · product_list 32
 *   - block_type='product_content' 행 = 0 → 축소는 어떤 기존 행도 위반시키지 않는다
 *
 * 현재 CHECK(원본 20270120000000 + 20270206000000 이 content_list 추가):
 *   ('idle_media','product_list','product_content','corner_description','health_info','staff_inquiry','qr_guide','content_list')
 * up: product_content 제거한 7종으로 재정의.
 * down: product_content 를 되돌린 8종으로 복구(=현재 상태).
 */
export class RemoveProductContentFromTabletBlockTypeCheck20270409000000 implements MigrationInterface {
  name = 'RemoveProductContentFromTabletBlockTypeCheck20270409000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 방어: 축소 전에 위반 행이 없음을 재확인(있으면 DDL 이 실패하므로 명시적으로 막는다).
    const rows: Array<{ n: string }> = await queryRunner.query(
      `SELECT COUNT(*)::text AS n FROM store_tablet_screen_blocks WHERE block_type = 'product_content'`,
    );
    if (Number(rows[0]?.n ?? '0') > 0) {
      throw new Error(
        `store_tablet_screen_blocks 에 block_type='product_content' 행이 ${rows[0].n} 개 있어 CHECK 축소를 중단한다`,
      );
    }
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_blocks
        DROP CONSTRAINT IF EXISTS "CHK_store_tablet_screen_blocks_type"
    `);
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_blocks
        ADD CONSTRAINT "CHK_store_tablet_screen_blocks_type"
        CHECK (block_type IN (
          'idle_media', 'product_list',
          'corner_description', 'health_info', 'staff_inquiry', 'qr_guide',
          'content_list'
        ))
    `);
    console.log("[Migration] store_tablet_screen_blocks.block_type CHECK narrowed (removed 'product_content')");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
    console.log("[Migration] store_tablet_screen_blocks.block_type CHECK restored ('product_content' re-added)");
  }
}
