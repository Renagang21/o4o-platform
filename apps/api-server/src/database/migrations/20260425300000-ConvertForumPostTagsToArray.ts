import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-FORUM-TAG-POLICY-ALIGNMENT-PHASE1-V1
 *
 * forum_post.tags: TypeORM simple-array (comma-delimited text) → PostgreSQL text[]
 * 기존 데이터: "tag1,tag2,tag3" → ARRAY['tag1','tag2','tag3']
 */
export class ConvertForumPostTagsToArray20260425300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE forum_post
        ALTER COLUMN tags TYPE text[]
        USING CASE
          WHEN tags IS NULL THEN NULL
          WHEN tags = '' THEN '{}'::text[]
          ELSE string_to_array(tags, ',')
        END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE forum_post
        ALTER COLUMN tags TYPE text
        USING array_to_string(tags, ',')
    `);
  }
}
