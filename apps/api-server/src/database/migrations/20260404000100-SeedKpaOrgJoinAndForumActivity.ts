import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KPA org_join 시드 데이터 보강
 *
 * WO-KPA-A-OPERATOR-DASHBOARD-ENHANCEMENT-V3: Phase 1
 *
 * 목적: Activity Log에서 org_join 이벤트를 실제로 확인할 수 있도록
 *       kpa_organization_join_requests 테스트 데이터 추가.
 *
 * 기존 SeedKpaOperatorTestData(20260403900000) 사용자 재활용:
 *   - test-yaksa04 → pending (join 요청)
 *   - test-yaksa06 → approved (promotion 요청)
 *   - test-yaksa09 → rejected (join 요청)
 *
 * Idempotent: user_id + status 중복 체크
 */
export class SeedKpaOrgJoinAndForumActivity20260404000100
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verify table exists
    const hasTable = await queryRunner.hasTable('kpa_organization_join_requests');
    if (!hasTable) {
      console.log('[SeedKpaOrgJoin] Table kpa_organization_join_requests does not exist, skipping');
      return;
    }

    const ORG = {
      ASSOCIATION: 'a0000000-0a00-4000-a000-000000000001',
      SEOUL:       'a0000000-0a00-4000-a000-000000000002',
      JONGNO:      'a0000000-0a00-4000-a000-000000000003',
    };

    const requests = [
      {
        email: 'test-yaksa04@o4o.com',
        orgId: ORG.JONGNO,
        requestType: 'join',
        requestedRole: 'member',
        requestedSubRole: null,
        status: 'pending',
        payload: { reason: '종로구약사회 가입 희망' },
      },
      {
        email: 'test-yaksa06@o4o.com',
        orgId: ORG.ASSOCIATION,
        requestType: 'promotion',
        requestedRole: 'manager',
        requestedSubRole: 'education_lead',
        status: 'approved',
        payload: { reason: '교육 담당 관리자 승격 요청' },
      },
      {
        email: 'test-yaksa09@o4o.com',
        orgId: ORG.SEOUL,
        requestType: 'join',
        requestedRole: 'member',
        requestedSubRole: null,
        status: 'rejected',
        payload: { reason: '서울시약사회 가입 요청' },
      },
    ];

    let count = 0;
    for (const r of requests) {
      // Resolve user_id
      const userRows = await queryRunner.query(
        `SELECT id FROM users WHERE email = $1`,
        [r.email],
      );
      if (userRows.length === 0) {
        console.log(`[SeedKpaOrgJoin] User not found: ${r.email}, skipping`);
        continue;
      }
      const userId = userRows[0].id;

      // Idempotent check
      const existing = await queryRunner.query(
        `SELECT id FROM kpa_organization_join_requests
         WHERE user_id = $1 AND organization_id = $2 AND request_type = $3`,
        [userId, r.orgId, r.requestType],
      );
      if (existing.length > 0) {
        console.log(`[SeedKpaOrgJoin] Already exists for ${r.email} (${r.requestType}), skipping`);
        continue;
      }

      const reviewedBy = r.status !== 'pending' ? userId : null;
      const reviewedAt = r.status !== 'pending' ? 'NOW()' : 'NULL';
      const reviewNote = r.status === 'approved'
        ? "'교육 담당자로 승격 승인'"
        : r.status === 'rejected'
          ? "'소속 확인 필요 — 반려'"
          : 'NULL';

      await queryRunner.query(
        `INSERT INTO kpa_organization_join_requests
         (user_id, organization_id, request_type, requested_role, requested_sub_role, payload, status, reviewed_by, reviewed_at, review_note, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${reviewedAt}, ${reviewNote}, NOW() - INTERVAL '${count} hours', NOW())`,
        [
          userId,
          r.orgId,
          r.requestType,
          r.requestedRole,
          r.requestedSubRole,
          JSON.stringify(r.payload),
          r.status,
          reviewedBy,
        ],
      );
      count++;
    }

    console.log(`[SeedKpaOrgJoin] Created ${count} organization join requests`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const emails = ['test-yaksa04@o4o.com', 'test-yaksa06@o4o.com', 'test-yaksa09@o4o.com'];
    for (const email of emails) {
      await queryRunner.query(
        `DELETE FROM kpa_organization_join_requests
         WHERE user_id IN (SELECT id FROM users WHERE email = $1)`,
        [email],
      ).catch(() => {});
    }
    console.log('[SeedKpaOrgJoin] Rollback complete');
  }
}
