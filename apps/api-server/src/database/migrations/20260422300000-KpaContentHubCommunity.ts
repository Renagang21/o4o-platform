import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-CONTENT-HUB-FOUNDATION-V1
 *
 * kpa_contents 테이블을 커뮤니티 콘텐츠 허브로 확장:
 * - body, content_type, sub_type, like_count, view_count, author_name 컬럼 추가
 * - status: ready → published 전환
 * - kpa_content_recommendations 테이블 생성 (1인 1추천)
 */
export class KpaContentHubCommunity20260422300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1a. kpa_contents에 새 컬럼 추가
    await queryRunner.query(`
      ALTER TABLE kpa_contents
        ADD COLUMN IF NOT EXISTS body TEXT,
        ADD COLUMN IF NOT EXISTS content_type VARCHAR(30) NOT NULL DEFAULT 'information',
        ADD COLUMN IF NOT EXISTS sub_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS like_count INT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS author_name VARCHAR(100)
    `);

    // 1b. status: ready → published 일괄 전환
    await queryRunner.query(`
      UPDATE kpa_contents SET status = 'published' WHERE status = 'ready'
    `);

    // 1c. kpa_content_recommendations 테이블 생성
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kpa_content_recommendations (
        id UUID NOT NULL DEFAULT gen_random_uuid(),
        content_id UUID NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT pk_kpa_content_rec PRIMARY KEY (id),
        CONSTRAINT uq_kpa_content_rec_user UNIQUE (content_id, user_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpa_content_rec_content
        ON kpa_content_recommendations(content_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpa_content_rec_user
        ON kpa_content_recommendations(user_id)
    `);

    // 1d. content_type 인덱스
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpa_contents_content_type
        ON kpa_contents(content_type, is_deleted)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_kpa_contents_content_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_kpa_content_rec_user`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_kpa_content_rec_content`);
    await queryRunner.query(`DROP TABLE IF EXISTS kpa_content_recommendations`);

    await queryRunner.query(`UPDATE kpa_contents SET status = 'ready' WHERE status = 'published'`);

    await queryRunner.query(`
      ALTER TABLE kpa_contents
        DROP COLUMN IF EXISTS body,
        DROP COLUMN IF EXISTS content_type,
        DROP COLUMN IF EXISTS sub_type,
        DROP COLUMN IF EXISTS like_count,
        DROP COLUMN IF EXISTS view_count,
        DROP COLUMN IF EXISTS author_name
    `);
  }
}
