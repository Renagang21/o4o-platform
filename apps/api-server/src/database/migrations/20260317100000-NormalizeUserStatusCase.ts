/**
 * NormalizeUserStatusCase
 *
 * Fix: users.status에 대문자('ACTIVE', 'PENDING', 'REJECTED')가 저장된 경우
 * UserStatus enum은 소문자('active', 'pending', 'rejected')를 사용하므로
 * 로그인 시 user.status !== 'active' 비교가 실패하여 "가입 승인 대기 중" 에러 발생.
 *
 * 이 마이그레이션은 모든 대문자 status를 소문자로 정규화한다.
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeUserStatusCase20260317100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Normalize uppercase status values to lowercase (matching UserStatus enum)
    await queryRunner.query(`
      UPDATE users SET status = LOWER(status), "updatedAt" = NOW()
      WHERE status != LOWER(status)
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No rollback needed — lowercase is the correct canonical form
  }
}
