import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KPA 테스트 계정 전체 삭제 (운영자 2개 제외)
 *
 * 보존: kpa-a-admin@o4o.com, kpa-a-operator@o4o.com
 * 삭제: yaksa*@o4o.com, student*@o4o.com 및 관련 데이터
 */
export class CleanupAllKpaTestAccounts1712203200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const KEEP = ['kpa-a-admin@o4o.com', 'kpa-a-operator@o4o.com'];

    // 삭제 대상 user_id 수집
    const targets = await queryRunner.query(
      `SELECT id FROM users
       WHERE (email LIKE 'yaksa%@o4o.com' OR email LIKE 'student%@o4o.com')
         AND email NOT IN ($1, $2)`,
      KEEP,
    );

    if (targets.length === 0) {
      console.log('[CleanupAllKpaTestAccounts] No target users found');
      return;
    }

    const userIds = targets.map((r: any) => r.id);
    console.log(`[CleanupAllKpaTestAccounts] Deleting ${userIds.length} test accounts...`);

    // 1. kpa_members 기반 연쇄 삭제 (kpa_member_services는 FK CASCADE)
    await queryRunner.query(
      `DELETE FROM kpa_members WHERE user_id = ANY($1)`,
      [userIds],
    );

    // 2. 프로필 삭제
    await queryRunner.query(
      `DELETE FROM kpa_pharmacist_profiles WHERE user_id = ANY($1)`,
      [userIds],
    ).catch(() => {});
    await queryRunner.query(
      `DELETE FROM kpa_student_profiles WHERE user_id = ANY($1)`,
      [userIds],
    ).catch(() => {});

    // 3. service_memberships 삭제
    await queryRunner.query(
      `DELETE FROM service_memberships WHERE user_id = ANY($1)`,
      [userIds],
    ).catch(() => {});

    // 4. role_assignments 삭제
    await queryRunner.query(
      `DELETE FROM role_assignments WHERE user_id = ANY($1)`,
      [userIds],
    ).catch(() => {});

    // 5. users 삭제
    const result = await queryRunner.query(
      `DELETE FROM users WHERE id = ANY($1)`,
      [userIds],
    );

    console.log(`[CleanupAllKpaTestAccounts] Deleted ${result?.[1] ?? userIds.length} users`);
  }

  public async down(): Promise<void> {
    console.log('[CleanupAllKpaTestAccounts] Rollback not supported — re-run seed migration to restore');
  }
}
