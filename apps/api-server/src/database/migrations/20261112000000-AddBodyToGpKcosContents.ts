import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-GP-KCOS-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1 (Phase A-0)
 *
 * GlycoPharm / K-Cosmetics 회원 작성 콘텐츠(`sub_type='content'`)는 본문을
 * `body`(rich text 문자열, 공통 CommunityContentWriteShell)에 저장한다.
 * 두 테이블은 `blocks`(jsonb)만 가지고 `body` 컬럼이 없으므로 추가한다.
 *
 * content_type 은 프론트가 상수('information')만 전송하고 저장하지 않으므로
 * 별도 컬럼을 추가하지 않는다.
 */
export class AddBodyToGpKcosContents20261112000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE glycopharm_contents ADD COLUMN IF NOT EXISTS body TEXT`);
    await queryRunner.query(`ALTER TABLE cosmetics_contents ADD COLUMN IF NOT EXISTS body TEXT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE cosmetics_contents DROP COLUMN IF EXISTS body`);
    await queryRunner.query(`ALTER TABLE glycopharm_contents DROP COLUMN IF EXISTS body`);
  }
}
