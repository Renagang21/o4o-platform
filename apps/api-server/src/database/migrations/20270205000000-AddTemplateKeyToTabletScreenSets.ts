import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-TABLET-SCREEN-SET-TEMPLATE-KEY-SCHEMA-V1
 * 설계: CHECK-O4O-KPA-TABLET-TEMPLATE-CONTRACT-DESIGN-V1 §4 (A안)
 *
 * store_tablet_screen_sets 에 template_key(nullable) 추가.
 * NULL = 기본 템플릿 corner_information_basic_v1 (resolveTemplateKey 가 이미 처리).
 * additive only — 기존 세트 무변경(전부 NULL → 기본 유지). CHECK 제약 없음(코드 화이트리스트 검증).
 */
export class AddTemplateKeyToTabletScreenSets20270205000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_sets
        ADD COLUMN IF NOT EXISTS template_key VARCHAR(50)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE store_tablet_screen_sets
        DROP COLUMN IF EXISTS template_key
    `);
  }
}
