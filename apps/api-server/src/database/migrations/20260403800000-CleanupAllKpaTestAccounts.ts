import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KPA 테스트 계정 전체 삭제 (운영자 2개 제외)
 *
 * 보존: kpa-a-admin@o4o.com, kpa-a-operator@o4o.com
 * 삭제: yaksa*@o4o.com, student*@o4o.com 및 관련 데이터
 *
 * NOTE: .catch() does NOT prevent PostgreSQL transaction abort.
 * Use SAVEPOINT pattern for tables that may not exist.
 */
export class CleanupAllKpaTestAccounts1712203200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const KEEP = ['kpa-a-admin@o4o.com', 'kpa-a-operator@o4o.com'];

    // SAVEPOINT-based safe delete: prevents PG transaction abort on missing table/column
    const safeDel = async (sql: string, params: any[]) => {
      await queryRunner.query('SAVEPOINT safe_del');
      try {
        await queryRunner.query(sql, params);
        await queryRunner.query('RELEASE SAVEPOINT safe_del');
      } catch (e) {
        console.log(`[CleanupAllKpaTestAccounts] Skipped (safe): ${(e as Error).message?.slice(0, 80)}`);
        await queryRunner.query('ROLLBACK TO SAVEPOINT safe_del');
      }
    };

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
    await safeDel(`DELETE FROM kpa_members WHERE user_id = ANY($1)`, [userIds]);

    // 2. 프로필 삭제
    await safeDel(`DELETE FROM kpa_pharmacist_profiles WHERE user_id = ANY($1)`, [userIds]);
    await safeDel(`DELETE FROM kpa_student_profiles WHERE user_id = ANY($1)`, [userIds]);

    // 3. service_memberships 삭제
    await safeDel(`DELETE FROM service_memberships WHERE user_id = ANY($1)`, [userIds]);

    // 4. role_assignments 삭제
    await safeDel(`DELETE FROM role_assignments WHERE user_id = ANY($1)`, [userIds]);

    // 4.5. FK 참조 테이블 정리
    await safeDel(`DELETE FROM forum_comment WHERE author_id = ANY($1)`, [userIds]);
    await safeDel(`DELETE FROM forum_post WHERE author_id = ANY($1)`, [userIds]);
    await safeDel(`DELETE FROM kpa_applications WHERE user_id = ANY($1)`, [userIds]);
    await safeDel(`DELETE FROM kpa_pharmacy_requests WHERE user_id = ANY($1)`, [userIds]);
    await safeDel(`DELETE FROM kpa_organization_join_requests WHERE user_id = ANY($1)`, [userIds]);
    await safeDel(`DELETE FROM kpa_operator_audit_logs WHERE operator_id = ANY($1)`, [userIds]);
    await safeDel(`DELETE FROM kpa_approval_requests WHERE requester_id = ANY($1)`, [userIds]);

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
