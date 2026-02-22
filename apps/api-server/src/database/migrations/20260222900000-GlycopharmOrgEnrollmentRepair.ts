import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-GLYCOPHARM-ORG-ENROLLMENT-REPAIR-V1
 *
 * Data repair: 사용자 2c8c2838-8e67-459e-a8c1-1b05fdc92f99 의
 * glycopharm organization + enrollment 연결 복구.
 *
 * 문제: resolveGlycopharmPharmacyId() → null
 * 원인: organizations 테이블에 해당 사용자의 약국이 없거나,
 *       organization_service_enrollments에 glycopharm 등록이 없음.
 *
 * 수행:
 *   1. organizations에 해당 사용자의 약국 확인/생성
 *   2. organization_service_enrollments에 glycopharm 등록 확인/생성
 *   3. glucoseview_customers 백필 (테이블 존재 시)
 *   4. 검증 로그 출력
 */
export class GlycopharmOrgEnrollmentRepair20260222900000 implements MigrationInterface {
  name = 'GlycopharmOrgEnrollmentRepair20260222900000';

  private readonly TARGET_USER_ID = '2c8c2838-8e67-459e-a8c1-1b05fdc92f99';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const userId = this.TARGET_USER_ID;

    // ============================================================
    // Step 1: Check/create organization for the user
    // ============================================================

    const existingOrg = await queryRunner.query(
      `SELECT id, name, code, "isActive" FROM organizations
       WHERE created_by_user_id = $1 LIMIT 1`,
      [userId],
    );

    let orgId: string;

    if (existingOrg.length > 0) {
      orgId = existingOrg[0].id;
      console.log(`[Enrollment Repair] Step 1: Organization exists — id=${orgId}, name=${existingOrg[0].name}`);

      // Ensure isActive
      if (!existingOrg[0].isActive) {
        await queryRunner.query(
          `UPDATE organizations SET "isActive" = true, "updatedAt" = NOW() WHERE id = $1`,
          [orgId],
        );
        console.log(`[Enrollment Repair] Step 1: Activated organization ${orgId}`);
      }
    } else {
      // Create new organization for this pharmacist
      const newOrg = await queryRunner.query(
        `INSERT INTO organizations (
           name, code, type, level, path, "isActive", "childrenCount",
           created_by_user_id, "createdAt", "updatedAt"
         )
         VALUES (
           '약국', 'gp-' || REPLACE($1::text, '-', ''),
           'pharmacy', 0, '/pharmacy/' || $1::text,
           true, 0,
           $1, NOW(), NOW()
         )
         RETURNING id`,
        [userId],
      );
      orgId = newOrg[0].id;
      console.log(`[Enrollment Repair] Step 1: Created new organization — id=${orgId}`);
    }

    // ============================================================
    // Step 2: Check/create glycopharm enrollment
    // ============================================================

    // Ensure 'glycopharm' exists in platform_services (should already exist from seed)
    const serviceExists = await queryRunner.query(
      `SELECT code FROM platform_services WHERE code = 'glycopharm'`,
    );
    if (serviceExists.length === 0) {
      console.error('[Enrollment Repair] CRITICAL: glycopharm not found in platform_services!');
      throw new Error('glycopharm service not found in platform_services catalog');
    }

    const existingEnrollment = await queryRunner.query(
      `SELECT id, status FROM organization_service_enrollments
       WHERE organization_id = $1 AND service_code = 'glycopharm'`,
      [orgId],
    );

    if (existingEnrollment.length > 0) {
      console.log(`[Enrollment Repair] Step 2: Enrollment exists — id=${existingEnrollment[0].id}, status=${existingEnrollment[0].status}`);

      // Ensure status is 'active'
      if (existingEnrollment[0].status !== 'active') {
        await queryRunner.query(
          `UPDATE organization_service_enrollments
           SET status = 'active', updated_at = NOW()
           WHERE id = $1`,
          [existingEnrollment[0].id],
        );
        console.log(`[Enrollment Repair] Step 2: Activated enrollment`);
      }
    } else {
      await queryRunner.query(
        `INSERT INTO organization_service_enrollments (organization_id, service_code, status, enrolled_at, created_at, updated_at)
         VALUES ($1, 'glycopharm', 'active', NOW(), NOW(), NOW())`,
        [orgId],
      );
      console.log(`[Enrollment Repair] Step 2: Created glycopharm enrollment for org ${orgId}`);
    }

    // ============================================================
    // Step 3: Update glucoseview_customers (safe — table may not exist)
    // ============================================================

    try {
      const gvTableCheck = await queryRunner.query(`
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'glucoseview_customers' AND table_schema = 'public'
      `);

      if (gvTableCheck.length > 0) {
        // Check if organization_id column exists
        const hasOrgCol = await queryRunner.query(`
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'glucoseview_customers'
            AND column_name = 'organization_id'
            AND table_schema = 'public'
        `);

        if (hasOrgCol.length > 0) {
          const updated = await queryRunner.query(
            `UPDATE glucoseview_customers
             SET organization_id = $1
             WHERE pharmacist_id = $2
               AND organization_id IS NULL`,
            [orgId, userId],
          );
          console.log(`[Enrollment Repair] Step 3: Updated glucoseview_customers — ${updated?.[1] ?? 0} rows`);
        } else {
          console.log('[Enrollment Repair] Step 3: organization_id column not found, skipping');
        }
      } else {
        console.log('[Enrollment Repair] Step 3: glucoseview_customers table not found, skipping');
      }
    } catch (err) {
      console.warn('[Enrollment Repair] Step 3: glucoseview_customers update failed (non-fatal):', err);
    }

    // ============================================================
    // Step 4: Verify — resolveGlycopharmPharmacyId query
    // ============================================================

    const verify = await queryRunner.query(
      `SELECT o.id
       FROM organizations o
       JOIN organization_service_enrollments ose
         ON ose.organization_id = o.id
        AND ose.service_code = 'glycopharm'
       WHERE o.created_by_user_id = $1
         AND o."isActive" = true
       LIMIT 1`,
      [userId],
    );

    if (verify.length > 0) {
      console.log(`[Enrollment Repair] Step 4: VERIFIED — resolveGlycopharmPharmacyId('${userId}') → ${verify[0].id}`);
    } else {
      console.error(`[Enrollment Repair] Step 4: FAILED — resolveGlycopharmPharmacyId still returns null!`);
      throw new Error('Enrollment repair verification failed');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Data repair — intentionally one-way
    console.warn('[Enrollment Repair] down: Data repair migration, no automatic rollback');
  }
}
