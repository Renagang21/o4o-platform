import type { MigrationInterface, QueryRunner } from 'typeorm';
import bcrypt from 'bcryptjs';

/**
 * KPA Operator 테스트 데이터 시드
 *
 * WO-KPA-A-OPERATOR-DASHBOARD-FIRST-STABILIZATION-V1
 *
 * 목적: operator 대시보드 KPI·승인 큐·Activity Log 검증용 데이터 복원
 *
 * 생성 데이터:
 * - 13 users (10 pharmacists + 3 students), password: O4oTestPass
 * - kpa_members (4 pending, 8 active, 1 suspended)
 * - kpa_member_services (kpa-a)
 * - kpa_pharmacist_profiles / kpa_student_profiles
 * - service_memberships / role_assignments (active members only)
 * - kpa_applications x3 (submitted)
 * - kpa_pharmacy_requests x2 (pending)
 * - product_approvals (conditional, only if supplier_product_offers exist)
 */
export class SeedKpaOperatorTestData1712203200001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hashedPassword = await bcrypt.hash('O4oTestPass', 10);

    // ── KPA Organization UUIDs (기존 시드) ──
    const ORG = {
      ASSOCIATION: 'a0000000-0a00-4000-a000-000000000001', // 대한약사회
      SEOUL:       'a0000000-0a00-4000-a000-000000000002', // 서울특별시약사회
      JONGNO:      'a0000000-0a00-4000-a000-000000000003', // 종로구약사회
      GANGNAM:     'a0000000-0a00-4000-a000-000000000004', // 강남구약사회
    };

    // ── 1. Users 생성 ──
    const pharmacists = [
      // pending (KPI 표시용)
      { email: 'test-yaksa01@o4o.com', name: '테스트약사01', orgId: ORG.JONGNO,  status: 'pending',   license: 'TEST-P-001', pharmacy: '테스트약국01', address: '서울시 종로구', actType: 'pharmacy_owner' },
      { email: 'test-yaksa02@o4o.com', name: '테스트약사02', orgId: ORG.GANGNAM, status: 'pending',   license: 'TEST-P-002', pharmacy: '테스트약국02', address: '서울시 강남구', actType: 'pharmacy_owner' },
      { email: 'test-yaksa03@o4o.com', name: '테스트약사03', orgId: ORG.ASSOCIATION, status: 'pending', license: 'TEST-P-003', pharmacy: null, address: null, actType: 'general' },
      // active
      { email: 'test-yaksa04@o4o.com', name: '테스트약사04', orgId: ORG.JONGNO,  status: 'active', license: 'TEST-P-004', pharmacy: '테스트약국04', address: '서울시 종로구', actType: 'pharmacy_owner' },
      { email: 'test-yaksa05@o4o.com', name: '테스트약사05', orgId: ORG.GANGNAM, status: 'active', license: 'TEST-P-005', pharmacy: '테스트약국05', address: '서울시 강남구', actType: 'pharmacy_owner' },
      { email: 'test-yaksa06@o4o.com', name: '테스트약사06', orgId: ORG.ASSOCIATION, status: 'active', license: 'TEST-P-006', pharmacy: null, address: null, actType: 'general' },
      { email: 'test-yaksa07@o4o.com', name: '테스트약사07', orgId: ORG.SEOUL,   status: 'active', license: 'TEST-P-007', pharmacy: null, address: null, actType: 'hospital' },
      // suspended
      { email: 'test-yaksa08@o4o.com', name: '테스트약사08', orgId: ORG.ASSOCIATION, status: 'suspended', license: 'TEST-P-008', pharmacy: null, address: null, actType: 'industry' },
      // more active
      { email: 'test-yaksa09@o4o.com', name: '테스트약사09', orgId: ORG.JONGNO,  status: 'active', license: 'TEST-P-009', pharmacy: '테스트약국09', address: '서울시 종로구', actType: 'pharmacy_owner' },
      { email: 'test-yaksa10@o4o.com', name: '테스트약사10', orgId: ORG.GANGNAM, status: 'active', license: 'TEST-P-010', pharmacy: '테스트약국10', address: '서울시 강남구', actType: 'pharmacy_owner' },
    ];

    const students = [
      { email: 'test-student01@o4o.com', name: '테스트학생01', orgId: ORG.ASSOCIATION, status: 'pending', university: '서울대학교 약학대학', year: 3 },
      { email: 'test-student02@o4o.com', name: '테스트학생02', orgId: ORG.ASSOCIATION, status: 'active',  university: '연세대학교 약학대학', year: 4 },
      { email: 'test-student03@o4o.com', name: '테스트학생03', orgId: ORG.SEOUL,       status: 'active',  university: '고려대학교 약학대학', year: 5 },
    ];

    const userIds: Record<string, string> = {};
    let userCount = 0;

    for (const p of pharmacists) {
      const existing = await queryRunner.query(`SELECT id FROM users WHERE email = $1`, [p.email]);
      if (existing.length > 0) { userIds[p.email] = existing[0].id; continue; }
      const [row] = await queryRunner.query(
        `INSERT INTO users (email, password, name, role, roles, status, "isActive", "isEmailVerified", service_key, permissions, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'user', ARRAY['kpa:pharmacist']::text[], 'active', true, true, 'kpa-society', '[]', NOW(), NOW())
         RETURNING id`,
        [p.email, hashedPassword, p.name],
      );
      userIds[p.email] = row.id;
      userCount++;
    }
    for (const s of students) {
      const existing = await queryRunner.query(`SELECT id FROM users WHERE email = $1`, [s.email]);
      if (existing.length > 0) { userIds[s.email] = existing[0].id; continue; }
      const [row] = await queryRunner.query(
        `INSERT INTO users (email, password, name, role, roles, status, "isActive", "isEmailVerified", service_key, permissions, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'user', ARRAY['kpa:student']::text[], 'active', true, true, 'kpa-society', '[]', NOW(), NOW())
         RETURNING id`,
        [s.email, hashedPassword, s.name],
      );
      userIds[s.email] = row.id;
      userCount++;
    }
    console.log(`[SeedKpaOperatorTestData] Users created: ${userCount}/13`);

    // ── 2. kpa_members ──
    const memberIds: Record<string, string> = {};
    let memberCount = 0;

    for (const p of pharmacists) {
      const userId = userIds[p.email];
      const existing = await queryRunner.query(
        `SELECT id FROM kpa_members WHERE user_id = $1`, [userId],
      );
      if (existing.length > 0) { memberIds[p.email] = existing[0].id; continue; }
      const [row] = await queryRunner.query(
        `INSERT INTO kpa_members (user_id, organization_id, role, status, membership_type, license_number, pharmacy_name, pharmacy_address, activity_type, joined_at, created_at, updated_at)
         VALUES ($1, $2, 'member', $3, 'pharmacist', $4, $5, $6, $7, ${p.status === 'active' ? 'CURRENT_DATE' : 'NULL'}, NOW(), NOW())
         RETURNING id`,
        [userId, p.orgId, p.status, p.license, p.pharmacy, p.address, p.actType],
      );
      memberIds[p.email] = row.id;
      memberCount++;
    }
    for (const s of students) {
      const userId = userIds[s.email];
      const existing = await queryRunner.query(
        `SELECT id FROM kpa_members WHERE user_id = $1`, [userId],
      );
      if (existing.length > 0) { memberIds[s.email] = existing[0].id; continue; }
      const [row] = await queryRunner.query(
        `INSERT INTO kpa_members (user_id, organization_id, role, status, membership_type, university_name, student_year, joined_at, created_at, updated_at)
         VALUES ($1, $2, 'member', $3, 'student', $4, $5, ${s.status === 'active' ? 'CURRENT_DATE' : 'NULL'}, NOW(), NOW())
         RETURNING id`,
        [userId, s.orgId, s.status, s.university, s.year],
      );
      memberIds[s.email] = row.id;
      memberCount++;
    }
    console.log(`[SeedKpaOperatorTestData] Members created: ${memberCount}/13`);

    // ── 3. kpa_member_services ──
    let svcCount = 0;
    for (const [email, memberId] of Object.entries(memberIds)) {
      const memberStatus = [...pharmacists, ...students].find(x => x.email === email)!.status;
      const svcStatus = memberStatus === 'active' ? 'approved' : 'pending';
      const existing = await queryRunner.query(
        `SELECT id FROM kpa_member_services WHERE member_id = $1 AND service_key = 'kpa-a'`, [memberId],
      );
      if (existing.length > 0) continue;
      await queryRunner.query(
        `INSERT INTO kpa_member_services (member_id, service_key, status, created_at, updated_at)
         VALUES ($1, 'kpa-a', $2, NOW(), NOW())`,
        [memberId, svcStatus],
      );
      svcCount++;
    }
    console.log(`[SeedKpaOperatorTestData] Member services created: ${svcCount}`);

    // ── 4. Profiles ──
    let profileCount = 0;
    for (const p of pharmacists) {
      const userId = userIds[p.email];
      const existing = await queryRunner.query(`SELECT id FROM kpa_pharmacist_profiles WHERE user_id = $1`, [userId]);
      if (existing.length > 0) continue;
      await queryRunner.query(
        `INSERT INTO kpa_pharmacist_profiles (user_id, license_number, license_verified, activity_type, verified_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [userId, p.license, p.status === 'active', p.actType, p.status === 'active' ? new Date() : null],
      );
      profileCount++;
    }
    for (const s of students) {
      const userId = userIds[s.email];
      const existing = await queryRunner.query(`SELECT id FROM kpa_student_profiles WHERE user_id = $1`, [userId]);
      if (existing.length > 0) continue;
      await queryRunner.query(
        `INSERT INTO kpa_student_profiles (user_id, university_name, student_year, enrollment_status, created_at, updated_at)
         VALUES ($1, $2, $3, 'enrolled', NOW(), NOW())`,
        [userId, s.university, s.year],
      );
      profileCount++;
    }
    console.log(`[SeedKpaOperatorTestData] Profiles created: ${profileCount}`);

    // ── 5. service_memberships + role_assignments (active members only) ──
    const activeAll = [
      ...pharmacists.filter(p => p.status === 'active').map(p => ({ email: p.email, orgId: p.orgId, role: 'kpa:pharmacist', smRole: 'member' })),
      ...students.filter(s => s.status === 'active').map(s => ({ email: s.email, orgId: s.orgId, role: 'kpa:student', smRole: 'student' })),
    ];

    let smCount = 0;
    let raCount = 0;
    for (const a of activeAll) {
      const userId = userIds[a.email];

      // service_memberships
      const existingSm = await queryRunner.query(
        `SELECT id FROM service_memberships WHERE user_id = $1 AND service_key = 'kpa-society'`, [userId],
      );
      if (existingSm.length === 0) {
        await queryRunner.query(
          `INSERT INTO service_memberships (user_id, service_key, status, role, created_at, updated_at)
           VALUES ($1, 'kpa-society', 'active', $2, NOW(), NOW())`,
          [userId, a.smRole],
        );
        smCount++;
      }

      // role_assignments
      const existingRa = await queryRunner.query(
        `SELECT id FROM role_assignments WHERE user_id = $1 AND role = $2 AND is_active = true`, [userId, a.role],
      );
      if (existingRa.length === 0) {
        await queryRunner.query(
          `INSERT INTO role_assignments (user_id, role, is_active, scope_type, scope_id, valid_from, assigned_at, created_at, updated_at)
           VALUES ($1, $2, true, 'organization', $3, NOW(), NOW(), NOW(), NOW())`,
          [userId, a.role, a.orgId],
        );
        raCount++;
      }
    }
    console.log(`[SeedKpaOperatorTestData] service_memberships: ${smCount}, role_assignments: ${raCount}`);

    // ── 6. kpa_applications (submitted) ──
    const pendingEmails = ['test-yaksa01@o4o.com', 'test-yaksa02@o4o.com', 'test-student01@o4o.com'];
    let appCount = 0;
    for (const email of pendingEmails) {
      const userId = userIds[email];
      const entry = [...pharmacists, ...students].find(x => x.email === email)!;
      const existing = await queryRunner.query(
        `SELECT id FROM kpa_applications WHERE user_id = $1 AND type = 'membership' AND status = 'submitted'`, [userId],
      );
      if (existing.length > 0) continue;
      await queryRunner.query(
        `INSERT INTO kpa_applications (user_id, organization_id, type, payload, status, created_at, updated_at)
         VALUES ($1, $2, 'membership', $3, 'submitted', NOW(), NOW())`,
        [userId, entry.orgId, JSON.stringify({ source: 'test_seed', name: entry.name })],
      );
      appCount++;
    }
    console.log(`[SeedKpaOperatorTestData] Applications created: ${appCount}`);

    // ── 7. kpa_pharmacy_requests (pending) ──
    const pharmaReqs = [
      { email: 'test-yaksa04@o4o.com', pharmacy: '테스트약국04', biz: '123-45-67890', phone: '02-1234-5678', mobile: '010-1234-5678' },
      { email: 'test-yaksa05@o4o.com', pharmacy: '테스트약국05', biz: '987-65-43210', phone: '02-8765-4321', mobile: '010-8765-4321' },
    ];
    let prCount = 0;
    for (const r of pharmaReqs) {
      const userId = userIds[r.email];
      const existing = await queryRunner.query(
        `SELECT id FROM kpa_pharmacy_requests WHERE user_id = $1 AND status = 'pending'`, [userId],
      );
      if (existing.length > 0) continue;
      await queryRunner.query(
        `INSERT INTO kpa_pharmacy_requests (user_id, pharmacy_name, business_number, pharmacy_phone, owner_phone, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())`,
        [userId, r.pharmacy, r.biz, r.phone, r.mobile],
      );
      prCount++;
    }
    console.log(`[SeedKpaOperatorTestData] Pharmacy requests created: ${prCount}`);

    // ── 8. product_approvals (conditional) ──
    try {
      const tableExists = await queryRunner.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_product_offers')`,
      );
      if (tableExists[0].exists) {
        const offers = await queryRunner.query(`SELECT id FROM supplier_product_offers LIMIT 2`);
        if (offers.length > 0) {
          let paCount = 0;
          for (const offer of offers) {
            const existing = await queryRunner.query(
              `SELECT id FROM product_approvals WHERE offer_id = $1 AND organization_id = $2`,
              [offer.id, ORG.ASSOCIATION],
            );
            if (existing.length > 0) continue;
            await queryRunner.query(
              `INSERT INTO product_approvals (offer_id, organization_id, service_key, approval_type, approval_status, requested_by, metadata, created_at, updated_at)
               VALUES ($1, $2, 'kpa', 'service', 'pending', $3, '{"source":"test_seed"}', NOW(), NOW())`,
              [offer.id, ORG.ASSOCIATION, userIds['test-yaksa04@o4o.com']],
            );
            paCount++;
          }
          console.log(`[SeedKpaOperatorTestData] Product approvals created: ${paCount}`);
        } else {
          console.log(`[SeedKpaOperatorTestData] Skipped product_approvals (no offers)`);
        }
      }
    } catch {
      console.log(`[SeedKpaOperatorTestData] Skipped product_approvals (table not found)`);
    }

    console.log('[SeedKpaOperatorTestData] Complete. Password: O4oTestPass');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const LIKE = `(email LIKE 'test-yaksa%@o4o.com' OR email LIKE 'test-student%@o4o.com')`;

    await queryRunner.query(`DELETE FROM product_approvals WHERE metadata->>'source' = 'test_seed'`).catch(() => {});
    await queryRunner.query(`DELETE FROM kpa_pharmacy_requests WHERE user_id IN (SELECT id FROM users WHERE ${LIKE})`).catch(() => {});
    await queryRunner.query(`DELETE FROM kpa_applications WHERE user_id IN (SELECT id FROM users WHERE ${LIKE})`).catch(() => {});
    await queryRunner.query(`DELETE FROM role_assignments WHERE user_id IN (SELECT id FROM users WHERE ${LIKE})`).catch(() => {});
    await queryRunner.query(`DELETE FROM service_memberships WHERE user_id IN (SELECT id FROM users WHERE ${LIKE})`).catch(() => {});
    await queryRunner.query(`DELETE FROM kpa_student_profiles WHERE user_id IN (SELECT id FROM users WHERE ${LIKE})`).catch(() => {});
    await queryRunner.query(`DELETE FROM kpa_pharmacist_profiles WHERE user_id IN (SELECT id FROM users WHERE ${LIKE})`).catch(() => {});
    // kpa_member_services는 kpa_members FK CASCADE로 자동 삭제
    await queryRunner.query(`DELETE FROM kpa_members WHERE user_id IN (SELECT id FROM users WHERE ${LIKE})`).catch(() => {});
    await queryRunner.query(`DELETE FROM users WHERE ${LIKE}`).catch(() => {});

    console.log('[SeedKpaOperatorTestData] Rollback complete');
  }
}
