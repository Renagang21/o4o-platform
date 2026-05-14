import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * IR-O4O-SERVICE-MEMBERSHIP-GATE-IMPACT-AUDIT-V1
 *
 * 조사 전용 마이그레이션 — 데이터 변경 없음, SELECT only.
 * 서비스 멤버십 게이트 부재 영향 범위를 실제 DB 데이터로 조사한다.
 */
export class DiagnosticMembershipGateAudit20260924300000 implements MigrationInterface {
  name = 'DiagnosticMembershipGateAudit20260924300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.error('=== IR-O4O-SERVICE-MEMBERSHIP-GATE-IMPACT-AUDIT-V1 시작 ===');

    /* ------------------------------------------------------------------ */
    /* 1. 서비스별 전체 사용자 현황                                         */
    /* ------------------------------------------------------------------ */
    const totalUsers = await queryRunner.query(`SELECT COUNT(*) AS cnt FROM users`);
    console.error(`[1] 전체 users 수: ${totalUsers[0].cnt}`);

    const smByService = await queryRunner.query(`
      SELECT service_key, status, COUNT(*) AS cnt
      FROM service_memberships
      GROUP BY service_key, status
      ORDER BY service_key, status
    `);
    console.error('[1] service_memberships 현황:');
    for (const r of smByService) {
      console.error(`    ${r.service_key} / ${r.status}: ${r.cnt}명`);
    }

    /* ------------------------------------------------------------------ */
    /* 2. 서비스별 orphan 사용자 (membership 없이 login 가능한 사용자)      */
    /* ------------------------------------------------------------------ */
    const services = ['kpa-society', 'glycopharm', 'neture', 'k-cosmetics'];

    console.error('[2] 서비스별 orphan 사용자 (service_membership 없는 users):');
    for (const svc of services) {
      const orphans = await queryRunner.query(`
        SELECT COUNT(*) AS cnt
        FROM users u
        WHERE NOT EXISTS (
          SELECT 1 FROM service_memberships sm
          WHERE sm.user_id = u.id AND sm.service_key = $1
        )
        AND u.id IN (
          SELECT DISTINCT ra.user_id FROM role_assignments ra
          WHERE ra.role LIKE $2 AND ra.is_active = true
        )
      `, [svc, `${svc.replace('-society', '')}:%`]);

      const prefix = svc === 'kpa-society' ? 'kpa' : svc === 'k-cosmetics' ? 'cosmetics' : svc;
      const orphans2 = await queryRunner.query(`
        SELECT COUNT(*) AS cnt
        FROM users u
        WHERE NOT EXISTS (
          SELECT 1 FROM service_memberships sm
          WHERE sm.user_id = u.id AND sm.service_key = $1
        )
        AND u.id IN (
          SELECT DISTINCT ra.user_id FROM role_assignments ra
          WHERE ra.role LIKE $2 AND ra.is_active = true
        )
      `, [svc, `${prefix}:%`]);
      console.error(`    ${svc}: role 있지만 membership 없는 orphan ${orphans2[0].cnt}명`);
    }

    /* ------------------------------------------------------------------ */
    /* 3. 전체 orphan (어떤 서비스에도 membership 없는 users)               */
    /* ------------------------------------------------------------------ */
    const totalOrphan = await queryRunner.query(`
      SELECT COUNT(*) AS cnt
      FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM service_memberships sm WHERE sm.user_id = u.id
      )
      AND EXISTS (
        SELECT 1 FROM role_assignments ra WHERE ra.user_id = u.id AND ra.is_active = true
      )
    `);
    console.error(`[3] 어떤 membership도 없이 active role만 있는 users: ${totalOrphan[0].cnt}명`);

    /* 대표 예시 5명 */
    const orphanSamples = await queryRunner.query(`
      SELECT u.email, array_agg(ra.role) AS roles
      FROM users u
      JOIN role_assignments ra ON ra.user_id = u.id AND ra.is_active = true
      WHERE NOT EXISTS (
        SELECT 1 FROM service_memberships sm WHERE sm.user_id = u.id
      )
      GROUP BY u.email
      ORDER BY u.email
      LIMIT 5
    `);
    console.error('[3] 대표 예시 (최대 5명):');
    for (const r of orphanSamples) {
      console.error(`    ${r.email}: ${r.roles}`);
    }

    /* ------------------------------------------------------------------ */
    /* 4. role-only orphan: role_assignments 있지만 service_memberships 없음 */
    /* ------------------------------------------------------------------ */
    const roleOrphanByService = await queryRunner.query(`
      SELECT
        CASE
          WHEN ra.role LIKE 'kpa:%' THEN 'kpa-society'
          WHEN ra.role LIKE 'glycopharm:%' THEN 'glycopharm'
          WHEN ra.role LIKE 'cosmetics:%' THEN 'k-cosmetics'
          WHEN ra.role LIKE 'neture:%' OR ra.role LIKE 'supplier%' THEN 'neture'
          ELSE 'platform'
        END AS service,
        COUNT(DISTINCT ra.user_id) AS orphan_user_cnt,
        COUNT(*) AS orphan_role_cnt
      FROM role_assignments ra
      WHERE ra.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM service_memberships sm
          WHERE sm.user_id = ra.user_id
            AND sm.service_key = CASE
              WHEN ra.role LIKE 'kpa:%' THEN 'kpa-society'
              WHEN ra.role LIKE 'glycopharm:%' THEN 'glycopharm'
              WHEN ra.role LIKE 'cosmetics:%' THEN 'k-cosmetics'
              WHEN ra.role LIKE 'neture:%' OR ra.role LIKE 'supplier%' THEN 'neture'
              ELSE NULL
            END
        )
        AND ra.role NOT IN ('admin', 'super_admin', 'operator', 'user', 'lms:instructor', 'lms:student')
        AND ra.role NOT LIKE 'platform:%'
      GROUP BY 1
      ORDER BY 1
    `);
    console.error('[4] role-only orphan (service_membership 없이 service role 보유):');
    for (const r of roleOrphanByService) {
      console.error(`    ${r.service}: ${r.orphan_user_cnt}명 / ${r.orphan_role_cnt}개 역할`);
    }

    /* ------------------------------------------------------------------ */
    /* 5. operator/admin 계정의 service_memberships 현황                   */
    /* ------------------------------------------------------------------ */
    const adminAccounts = await queryRunner.query(`
      SELECT u.email, array_agg(ra.role ORDER BY ra.role) AS roles,
             array_agg(DISTINCT sm.service_key) FILTER (WHERE sm.service_key IS NOT NULL) AS memberships
      FROM users u
      JOIN role_assignments ra ON ra.user_id = u.id AND ra.is_active = true
      LEFT JOIN service_memberships sm ON sm.user_id = u.id
      WHERE ra.role IN ('admin', 'super_admin', 'kpa:admin', 'kpa:operator',
                        'glycopharm:admin', 'glycopharm:operator',
                        'cosmetics:admin', 'cosmetics:operator')
      GROUP BY u.email
      ORDER BY u.email
    `);
    console.error('[5] admin/operator 계정의 membership 현황:');
    for (const r of adminAccounts) {
      console.error(`    ${r.email}`);
      console.error(`      roles: ${r.roles}`);
      console.error(`      memberships: ${r.memberships?.length ? r.memberships : '없음'}`);
    }

    /* ------------------------------------------------------------------ */
    /* 6. users.businessInfo 보유 현황                                     */
    /* ------------------------------------------------------------------ */
    const bizInfoCount = await queryRunner.query(`
      SELECT COUNT(*) AS cnt FROM users WHERE "businessInfo" IS NOT NULL
    `);
    console.error(`[6] users.businessInfo 보유 users: ${bizInfoCount[0].cnt}명`);

    const bizInfoWithNoSm = await queryRunner.query(`
      SELECT u.email, u."businessInfo"->>'businessName' AS biz_name,
             array_agg(DISTINCT sm.service_key) FILTER (WHERE sm.service_key IS NOT NULL) AS memberships
      FROM users u
      LEFT JOIN service_memberships sm ON sm.user_id = u.id
      WHERE u."businessInfo" IS NOT NULL
        AND u."businessInfo"->>'businessName' IS NOT NULL
      GROUP BY u.email, u."businessInfo"->>'businessName'
      ORDER BY u.email
      LIMIT 10
    `);
    console.error('[6] businessInfo.businessName 보유 users (최대 10명):');
    for (const r of bizInfoWithNoSm) {
      console.error(`    ${r.email} / 사업장명: ${r.biz_name} / memberships: ${r.memberships?.length ? r.memberships.join(', ') : '없음'}`);
    }

    /* ------------------------------------------------------------------ */
    /* 7. kpa-society: membership 있는 사용자 현황                         */
    /* ------------------------------------------------------------------ */
    const kpaSmStatus = await queryRunner.query(`
      SELECT sm.status, COUNT(*) AS cnt
      FROM service_memberships sm
      WHERE sm.service_key = 'kpa-society'
      GROUP BY sm.status
    `);
    console.error('[7] kpa-society service_memberships 현황:');
    for (const r of kpaSmStatus) {
      console.error(`    ${r.status}: ${r.cnt}명`);
    }

    const kpaMemberVsSm = await queryRunner.query(`
      SELECT
        (SELECT COUNT(*) FROM kpa_members) AS kpa_members_total,
        (SELECT COUNT(*) FROM service_memberships WHERE service_key = 'kpa-society') AS kpa_sm_total,
        (SELECT COUNT(*) FROM kpa_members km WHERE NOT EXISTS (
          SELECT 1 FROM service_memberships sm WHERE sm.user_id = km.user_id AND sm.service_key = 'kpa-society'
        )) AS kpa_members_without_sm,
        (SELECT COUNT(*) FROM service_memberships sm WHERE sm.service_key = 'kpa-society' AND NOT EXISTS (
          SELECT 1 FROM kpa_members km WHERE km.user_id = sm.user_id
        )) AS kpa_sm_without_member
    `);
    const kv = kpaMemberVsSm[0];
    console.error('[7] kpa_members vs service_memberships 불일치:');
    console.error(`    kpa_members 전체: ${kv.kpa_members_total}명`);
    console.error(`    kpa-society service_memberships 전체: ${kv.kpa_sm_total}명`);
    console.error(`    kpa_members 있지만 service_membership 없음: ${kv.kpa_members_without_sm}명`);
    console.error(`    service_membership 있지만 kpa_members 없음: ${kv.kpa_sm_without_member}명`);

    console.error('=== IR-O4O-SERVICE-MEMBERSHIP-GATE-IMPACT-AUDIT-V1 완료 ===');
  }

  public async down(): Promise<void> {
    // SELECT only — no-op
  }
}
