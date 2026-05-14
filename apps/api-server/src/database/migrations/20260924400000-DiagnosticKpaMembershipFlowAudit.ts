import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * IR-O4O-KPA-MEMBERSHIP-FLOW-AUDIT-V1
 *
 * SELECT only — 데이터 변경 없음.
 * kpa_members vs service_memberships 불일치 원인 DB 레벨 조사.
 */
export class DiagnosticKpaMembershipFlowAudit20260924400000 implements MigrationInterface {
  name = 'DiagnosticKpaMembershipFlowAudit20260924400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.error('=== IR-O4O-KPA-MEMBERSHIP-FLOW-AUDIT-V1 시작 ===');

    /* ------------------------------------------------------------------ */
    /* 1. kpa-society service_memberships 19건 상세 분석                   */
    /* ------------------------------------------------------------------ */
    const kpaSmDetail = await queryRunner.query(`
      SELECT
        u.email,
        sm.status,
        sm.role AS sm_role,
        sm.service_key,
        sm.created_at,
        CASE WHEN km.user_id IS NOT NULL THEN true ELSE false END AS has_kpa_member
      FROM service_memberships sm
      JOIN users u ON u.id = sm.user_id
      LEFT JOIN kpa_members km ON km.user_id = sm.user_id
      WHERE sm.service_key IN ('kpa-society', 'kpa')
      ORDER BY sm.service_key, sm.status, sm.created_at
    `);

    console.error(`[1] kpa/kpa-society service_memberships 전체 (${kpaSmDetail.length}건):`);
    for (const r of kpaSmDetail) {
      const hasMember = r.has_kpa_member ? '✅kpa_members있음' : '❌kpa_members없음';
      console.error(`    [${r.service_key}] ${r.email} | status:${r.status} | role:${r.sm_role} | ${hasMember} | created:${String(r.created_at).slice(0,10)}`);
    }

    /* ------------------------------------------------------------------ */
    /* 2. kpa_members 실제 데이터 확인                                     */
    /* ------------------------------------------------------------------ */
    const kpaMembers = await queryRunner.query(`
      SELECT
        u.email,
        km.status,
        km.membership_type,
        km.role AS km_role,
        km.activity_type,
        km.created_at,
        CASE WHEN sm.user_id IS NOT NULL THEN sm.service_key ELSE '없음' END AS sm_service_key
      FROM kpa_members km
      JOIN users u ON u.id = km.user_id
      LEFT JOIN service_memberships sm ON sm.user_id = km.user_id AND sm.service_key IN ('kpa-society','kpa')
      ORDER BY km.created_at
    `);
    console.error(`[2] kpa_members 전체 (${kpaMembers.length}건):`);
    for (const r of kpaMembers) {
      console.error(`    ${r.email} | km_status:${r.status} | type:${r.membership_type} | role:${r.km_role} | sm:${r.sm_service_key} | created:${String(r.created_at).slice(0,10)}`);
    }

    /* ------------------------------------------------------------------ */
    /* 3. kpa_members 없는 service_membership 상태 분포                    */
    /* ------------------------------------------------------------------ */
    const missingKpaMember = await queryRunner.query(`
      SELECT sm.status, sm.service_key, sm.role, COUNT(*) AS cnt
      FROM service_memberships sm
      WHERE sm.service_key IN ('kpa-society', 'kpa')
        AND NOT EXISTS (SELECT 1 FROM kpa_members km WHERE km.user_id = sm.user_id)
      GROUP BY sm.status, sm.service_key, sm.role
      ORDER BY sm.service_key, sm.status
    `);
    console.error('[3] kpa_members 없는 service_membership 상태 분포:');
    for (const r of missingKpaMember) {
      console.error(`    [${r.service_key}] status:${r.status} / role:${r.role}: ${r.cnt}건`);
    }

    /* ------------------------------------------------------------------ */
    /* 4. service_memberships 생성 시각 분포 (kpa-society, kpa_members 없는 건) */
    /* ------------------------------------------------------------------ */
    const createdDist = await queryRunner.query(`
      SELECT
        DATE(sm.created_at) AS created_date,
        sm.service_key,
        COUNT(*) AS cnt
      FROM service_memberships sm
      WHERE sm.service_key IN ('kpa-society', 'kpa')
        AND NOT EXISTS (SELECT 1 FROM kpa_members km WHERE km.user_id = sm.user_id)
      GROUP BY 1, 2
      ORDER BY 1
    `);
    console.error('[4] kpa_members 없는 service_membership 생성 날짜 분포:');
    for (const r of createdDist) {
      console.error(`    ${r.created_date} [${r.service_key}]: ${r.cnt}건`);
    }

    /* ------------------------------------------------------------------ */
    /* 5. kpa_pharmacist_profiles 현황 (kpa_members 없는 사용자 중)        */
    /* ------------------------------------------------------------------ */
    const pharmacistWithoutMember = await queryRunner.query(`
      SELECT
        u.email,
        pp.activity_type,
        pp.license_number,
        pp.created_at
      FROM kpa_pharmacist_profiles pp
      JOIN users u ON u.id = pp.user_id
      WHERE NOT EXISTS (SELECT 1 FROM kpa_members km WHERE km.user_id = pp.user_id)
      ORDER BY pp.created_at
    `);
    console.error(`[5] kpa_pharmacist_profiles 있지만 kpa_members 없는 사용자 (${pharmacistWithoutMember.length}명):`);
    for (const r of pharmacistWithoutMember) {
      console.error(`    ${r.email} | activity:${r.activity_type} | license:${r.license_number ? '있음' : '없음'} | created:${String(r.created_at).slice(0,10)}`);
    }

    /* ------------------------------------------------------------------ */
    /* 6. kpa_organization_join_requests 현황 (있는 경우)                  */
    /* ------------------------------------------------------------------ */
    await queryRunner.query('SAVEPOINT audit_join_req');
    try {
      const joinReqs = await queryRunner.query(`
        SELECT
          u.email,
          jr.status,
          jr.created_at
        FROM kpa_organization_join_requests jr
        JOIN users u ON u.id = jr.user_id
        ORDER BY jr.created_at DESC
        LIMIT 10
      `);
      console.error(`[6] kpa_organization_join_requests (최근 10건):`);
      for (const r of joinReqs) {
        console.error(`    ${r.email} | status:${r.status} | created:${String(r.created_at).slice(0,10)}`);
      }
      await queryRunner.query('RELEASE SAVEPOINT audit_join_req');
    } catch (e) {
      console.error(`[6] kpa_organization_join_requests: ${(e as Error).message?.slice(0,60)}`);
      await queryRunner.query('ROLLBACK TO SAVEPOINT audit_join_req');
    }

    /* ------------------------------------------------------------------ */
    /* 7. users.status 분포 (kpa-society membership 있는 사용자)           */
    /* ------------------------------------------------------------------ */
    const userStatus = await queryRunner.query(`
      SELECT u.status AS user_status, COUNT(*) AS cnt
      FROM service_memberships sm
      JOIN users u ON u.id = sm.user_id
      WHERE sm.service_key IN ('kpa-society', 'kpa')
      GROUP BY u.status
    `);
    console.error('[7] kpa-society membership 보유자의 users.status 분포:');
    for (const r of userStatus) {
      console.error(`    ${r.user_status || 'null'}: ${r.cnt}명`);
    }

    /* ------------------------------------------------------------------ */
    /* 8. kpa:* role_assignments vs kpa_members vs service_memberships 3중 비교 */
    /* ------------------------------------------------------------------ */
    const tripleCheck = await queryRunner.query(`
      SELECT
        u.email,
        CASE WHEN EXISTS(SELECT 1 FROM role_assignments ra WHERE ra.user_id=u.id AND ra.role LIKE 'kpa:%' AND ra.is_active=true) THEN '✅' ELSE '❌' END AS has_kpa_role,
        CASE WHEN EXISTS(SELECT 1 FROM service_memberships sm WHERE sm.user_id=u.id AND sm.service_key IN ('kpa-society','kpa')) THEN '✅' ELSE '❌' END AS has_kpa_sm,
        CASE WHEN EXISTS(SELECT 1 FROM kpa_members km WHERE km.user_id=u.id) THEN '✅' ELSE '❌' END AS has_kpa_member
      FROM users u
      WHERE
        EXISTS(SELECT 1 FROM role_assignments ra WHERE ra.user_id=u.id AND ra.role LIKE 'kpa:%' AND ra.is_active=true)
        OR EXISTS(SELECT 1 FROM service_memberships sm WHERE sm.user_id=u.id AND sm.service_key IN ('kpa-society','kpa'))
        OR EXISTS(SELECT 1 FROM kpa_members km WHERE km.user_id=u.id)
      ORDER BY u.email
    `);
    console.error(`[8] KPA 관련 데이터 3중 비교 (role / service_membership / kpa_members):`);
    for (const r of tripleCheck) {
      console.error(`    ${r.email} | role:${r.has_kpa_role} | sm:${r.has_kpa_sm} | kpa_member:${r.has_kpa_member}`);
    }

    /* ------------------------------------------------------------------ */
    /* 9. role_assignments에서 kpa:* 전체 현황                             */
    /* ------------------------------------------------------------------ */
    const kpaRoles = await queryRunner.query(`
      SELECT ra.role, COUNT(*) AS cnt
      FROM role_assignments ra
      WHERE ra.role LIKE 'kpa:%' AND ra.is_active = true
      GROUP BY ra.role
      ORDER BY ra.role
    `);
    console.error('[9] 현재 active kpa:* role 현황:');
    for (const r of kpaRoles) {
      console.error(`    ${r.role}: ${r.cnt}명`);
    }

    console.error('=== IR-O4O-KPA-MEMBERSHIP-FLOW-AUDIT-V1 완료 ===');
  }

  public async down(): Promise<void> {
    // SELECT only — no-op
  }
}
