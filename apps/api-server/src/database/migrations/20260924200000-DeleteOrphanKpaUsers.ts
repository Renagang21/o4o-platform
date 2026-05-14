import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-ORPHAN-ROLE-CLEANUP-V1 — Phase 2
 *
 * kpa_members 레코드 없이 KPA 데이터만 존재하는 orphan 사용자 정리.
 *
 * 완전 삭제 (모든 서비스에서 제거):
 *   - test-yaksa04~10@o4o.com, test-student03@o4o.com — KPA 전용 테스트 계정
 *   - codein3@hanmail.net — 재가입 예정, 전체 삭제 동의
 *
 * KPA 데이터만 삭제 (계정 유지):
 *   - sohae21@naver.com — neture 공급자로 활성 데이터 있음.
 *     kpa-society service_membership + kpa:* role_assignments 만 제거.
 */
export class DeleteOrphanKpaUsers20260924200000 implements MigrationInterface {
  name = 'DeleteOrphanKpaUsers20260924200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // SAVEPOINT 패턴: 테이블 미존재 또는 FK 오류 시 트랜잭션 abort 방지
    const safeDel = async (sql: string, params: any[]) => {
      await queryRunner.query('SAVEPOINT safe_del');
      try {
        const result = await queryRunner.query(sql, params);
        await queryRunner.query('RELEASE SAVEPOINT safe_del');
        return result;
      } catch (e) {
        console.error(`[DeleteOrphanKpaUsers] Skipped (safe): ${(e as Error).message?.slice(0, 100)}`);
        await queryRunner.query('ROLLBACK TO SAVEPOINT safe_del');
        return null;
      }
    };

    /* ------------------------------------------------------------------ */
    /* 1. 완전 삭제 대상                                                   */
    /* ------------------------------------------------------------------ */
    const FULL_DELETE_EMAILS = [
      'test-yaksa04@o4o.com',
      'test-yaksa05@o4o.com',
      'test-yaksa07@o4o.com',
      'test-yaksa09@o4o.com',
      'test-yaksa10@o4o.com',
      'test-student03@o4o.com',
      'codein3@hanmail.net',
    ];

    const fullTargets = await queryRunner.query(
      `SELECT id, email FROM users WHERE email = ANY($1)`,
      [FULL_DELETE_EMAILS],
    );

    if (fullTargets.length === 0) {
      console.error('[DeleteOrphanKpaUsers] No full-delete target users found (already deleted?)');
    } else {
      const fullIds = fullTargets.map((r: any) => r.id);
      const emails = fullTargets.map((r: any) => r.email).join(', ');
      console.error(`[DeleteOrphanKpaUsers] Full delete targets (${fullIds.length}): ${emails}`);

      // KPA 데이터
      await safeDel(`DELETE FROM kpa_members WHERE user_id = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM kpa_pharmacist_profiles WHERE user_id = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM kpa_student_profiles WHERE user_id = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM kpa_applications WHERE user_id = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM kpa_pharmacy_requests WHERE user_id = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM kpa_organization_join_requests WHERE user_id = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM kpa_operator_audit_logs WHERE operator_id = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM kpa_approval_requests WHERE requester_id = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM qualification_requests WHERE user_id = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM member_qualifications WHERE user_id = ANY($1)`, [fullIds]);

      // Forum 데이터
      await safeDel(`DELETE FROM forum_comment WHERE author_id = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM forum_post WHERE author_id = ANY($1)`, [fullIds]);

      // Auth/Platform 데이터
      await safeDel(`DELETE FROM role_assignments WHERE user_id = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM service_memberships WHERE user_id = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM refresh_tokens WHERE user_id = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM login_attempts WHERE user_id = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM notifications WHERE "userId" = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM action_logs WHERE user_id = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM ai_query_logs WHERE user_id = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM kyc_documents WHERE user_id = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM role_applications WHERE user_id = ANY($1)`, [fullIds]);
      await safeDel(`DELETE FROM approval_logs WHERE user_id = ANY($1)`, [fullIds]);

      // 최종: users 삭제
      const deleted = await queryRunner.query(
        `DELETE FROM users WHERE id = ANY($1) RETURNING email`,
        [fullIds],
      );
      const deletedEmails = (deleted as any[]).map((r: any) => r.email).join(', ');
      console.error(`[DeleteOrphanKpaUsers] ✅ Fully deleted users: ${deletedEmails}`);
    }

    /* ------------------------------------------------------------------ */
    /* 2. sohae21@naver.com — KPA 데이터만 삭제 (계정 유지)               */
    /* ------------------------------------------------------------------ */
    const [sohae] = await queryRunner.query(
      `SELECT id FROM users WHERE email = 'sohae21@naver.com' LIMIT 1`,
    );

    if (!sohae) {
      console.error('[DeleteOrphanKpaUsers] sohae21@naver.com not found — skipping KPA cleanup');
    } else {
      const sohaeId = sohae.id;

      // kpa-society service_membership 삭제
      await safeDel(
        `DELETE FROM service_memberships WHERE user_id = $1 AND service_key = 'kpa-society'`,
        [sohaeId],
      );

      // kpa:* role_assignments 삭제 (is_active=false 상태였지만 완전 제거)
      await safeDel(
        `DELETE FROM role_assignments WHERE user_id = $1 AND role LIKE 'kpa:%'`,
        [sohaeId],
      );

      console.error(`[DeleteOrphanKpaUsers] ✅ sohae21 KPA data removed (account preserved)`);
    }

    /* ------------------------------------------------------------------ */
    /* 3. 검증                                                             */
    /* ------------------------------------------------------------------ */
    const remaining = await queryRunner.query(
      `SELECT email FROM users WHERE email = ANY($1)`,
      [FULL_DELETE_EMAILS],
    );
    if (remaining.length > 0) {
      throw new Error(
        `[DeleteOrphanKpaUsers] Validation FAILED: ${remaining.map((r: any) => r.email).join(', ')} still exist`,
      );
    }
    console.error('[DeleteOrphanKpaUsers] ✅ Validation passed: all full-delete targets removed');
  }

  public async down(): Promise<void> {
    console.error('[DeleteOrphanKpaUsers] down: no-op — data cannot be restored automatically');
  }
}
