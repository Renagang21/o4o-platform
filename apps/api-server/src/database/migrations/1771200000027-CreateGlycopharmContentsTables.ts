import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-GLYCOPHARM-RESOURCES-BACKEND-V1
 *
 * glycopharm_contents 테이블 생성.
 * KPA kpa_contents 구조 기반 — GlycoPharm Resource Layer 도입.
 *
 * Resource → Content → Store 흐름의 첫 단계.
 */
export class CreateGlycopharmContentsTables1771200000027 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS glycopharm_contents (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title        VARCHAR(300)  NOT NULL,
        summary      TEXT,
        blocks       JSONB         NOT NULL DEFAULT '[]',
        tags         JSONB         NOT NULL DEFAULT '[]',
        category     VARCHAR(100),
        thumbnail_url VARCHAR(500),

        -- Resource 분류 (sub_type = 'resource' 로 자료실 항목 구분)
        sub_type     VARCHAR(50),

        -- 원본 유형: upload | external | manual
        source_type  VARCHAR(20)   NOT NULL DEFAULT 'manual',
        source_url   VARCHAR(500),
        source_file_name VARCHAR(200),

        -- 활용 방식: READ | LINK | DOWNLOAD | COPY
        usage_type   VARCHAR(20),

        -- 공개 상태: draft | published | private
        status       VARCHAR(20)   NOT NULL DEFAULT 'draft',

        -- 작성자
        created_by   UUID,
        updated_by   UUID,
        author_name  VARCHAR(100),

        -- 매장 자료함 가져가기 허용 정책: restricted | platform
        reusable_policy VARCHAR(20) NOT NULL DEFAULT 'platform',

        -- 통계
        like_count   INTEGER       NOT NULL DEFAULT 0,
        view_count   INTEGER       NOT NULL DEFAULT 0,

        is_deleted   BOOLEAN       NOT NULL DEFAULT false,
        created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_glycopharm_contents_created_by ON glycopharm_contents (created_by, is_deleted)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_glycopharm_contents_status ON glycopharm_contents (status, is_deleted)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_glycopharm_contents_sub_type ON glycopharm_contents (sub_type, is_deleted)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS glycopharm_contents`);
  }
}
