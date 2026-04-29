import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-GUIDE-INLINE-EDIT-V1
 *
 * guide_contents 테이블 생성
 * - 운영자가 가이드/서비스 페이지의 "설명 텍스트 블록"을 수정할 수 있는 DB 저장소
 * - pageKey + sectionKey 조합으로 unique (서비스키 격리 포함)
 */
export class CreateGuideContents2026042900001 implements MigrationInterface {
  name = 'CreateGuideContents2026042900001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS guide_contents (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_key VARCHAR(100) NOT NULL,
        page_key    VARCHAR(300) NOT NULL,
        section_key VARCHAR(100) NOT NULL,
        content     TEXT NOT NULL DEFAULT '',
        updated_by  UUID,
        updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_guide_contents_service_page_section
          UNIQUE (service_key, page_key, section_key)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_guide_contents_service_page
        ON guide_contents (service_key, page_key)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_guide_contents_service_page`);
    await queryRunner.query(`DROP TABLE IF EXISTS guide_contents`);
  }
}
