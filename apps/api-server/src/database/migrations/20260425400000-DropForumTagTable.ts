import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-FORUM-TAG-POLICY-ALIGNMENT-PHASE2-V1
 *
 * forum_tag 테이블 제거 — O4O 태그 정책 v1 (자유입력형) 정렬
 * 태그는 각 엔티티의 text[] 컬럼에 직접 저장. 별도 정규화 테이블 불필요.
 */
export class DropForumTagTable20260425400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS forum_tag`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forum_tag (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(50) UNIQUE NOT NULL,
        slug varchar(60) UNIQUE NOT NULL,
        description text,
        color varchar(50),
        "usageCount" int DEFAULT 0,
        "isActive" boolean DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
  }
}
