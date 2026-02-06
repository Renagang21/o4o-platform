import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Set default name for existing users
 *
 * 기존 사용자 중 name이 NULL인 경우 '운영자'로 설정
 * User entity의 name 필드 기본값과 일치시킴
 */
export class SetDefaultNameForExistingUsers20260206100000 implements MigrationInterface {
  name = 'SetDefaultNameForExistingUsers20260206100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. name이 NULL인 사용자를 '운영자'로 업데이트
    await queryRunner.query(`
      UPDATE users
      SET name = '운영자'
      WHERE name IS NULL OR name = ''
    `);

    // 2. name 컬럼 기본값 설정 및 NOT NULL 변경
    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN name SET DEFAULT '운영자'
    `);

    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN name SET NOT NULL
    `);

    console.log('[Migration] Updated users with NULL name to "운영자"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // name 컬럼을 다시 nullable로 변경
    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN name DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN name DROP DEFAULT
    `);
  }
}
