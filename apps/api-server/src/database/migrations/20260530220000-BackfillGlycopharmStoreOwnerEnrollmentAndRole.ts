import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-GLYCOPHARM-STORE-OWNER-ENROLLMENT-BACKFILL-AND-APPROVAL-FLOW-FIX-V1
 *
 * 선행 IR: docs/investigations/IR-O4O-GLYCOPHARM-STORE-PAGE-INTERNAL-API-AUTH-AND-COCKPIT-AUDIT-V1.md (commit e38818475)
 *
 * 배경:
 *   IR 의 분석 결과 GlycoPharm 약국 경영자의 backend 4-tier 정합성이 일부 사용자에서
 *   누락되어 있다.
 *
 *   - service_memberships.glycopharm (role='pharmacy' or 'pharmacist', status='active')      ✅ 있음
 *   - organizations (created_by_user_id = user_id, isActive=true)                              ✅ 있음
 *   - organization_service_enrollments (org_id, 'glycopharm', 'active')                        ❌ 누락
 *   - role_assignments (user_id, 'glycopharm:store_owner', is_active=true)                     ❌ 누락
 *
 *   결과: `/api/v1/glycopharm/store-hub/capabilities` → 403 STORE_OWNER_REQUIRED,
 *         `/api/v1/glycopharm/pharmacy/products` → 403 GLYCOPHARM_NOT_ENROLLED.
 *
 *   기존 backfill 마이그레이션 한계:
 *     - 20260331100000-BackfillGlycopharmPharmacyOrganizations: organization 자체가 없는 케이스만 처리
 *     - 20260900000000-BackfillStoreOwnerRoles: glycopharm_members.sub_role='pharmacy_owner' AND status='approved'
 *       을 기준으로 store_owner role 부여 — glycopharm_members 가 아예 없는 service_memberships-only
 *       사용자 (renagang21 케이스) 는 미커버.
 *
 *   본 마이그레이션은 위 두 backfill 이 커버하지 못한 "organization 은 있지만 enrollment/role 이 누락된" 사용자에
 *   대해 정합성 복구를 수행한다.
 *
 * 대상 사용자 (둘 다 충족):
 *   A. service_memberships(user_id, service_key='glycopharm', role IN ('pharmacy','pharmacist'), status='active')
 *      ('pharmacy' 는 legacy canonical, 'pharmacist' 는 현행 controller 흐름)
 *   B. organizations(created_by_user_id = user_id, "isActive"=true) — 약국 등록 의도가 명시된 organization
 *
 * 처리 (두 단계, 각각 idempotent):
 *   1. organization_service_enrollments(org_id, 'glycopharm', 'active') INSERT — 누락 시
 *   2. role_assignments(user_id, 'glycopharm:store_owner', is_active=true) INSERT — 누락 시
 *
 * 멱등성:
 *   재실행 안전. INSERT...WHERE NOT EXISTS + ON CONFLICT DO NOTHING.
 *   영향 0건이면 no-op.
 *
 * Scope guard:
 *   - service_key='glycopharm' 만 처리 — KPA / K-Cosmetics 영향 없음.
 *   - backend 권한 정책 (createRequireStoreOwner / pharmacy-context middleware) 무수정.
 *   - frontend 무수정.
 *
 * 참조 모델:
 *   - 20260930000000-BackfillCosmeticsServiceEnrollments (K-Cosmetics 동일 enrollment backfill)
 *   - 20260900000000-BackfillStoreOwnerRoles (role_assignments 동일 패턴)
 */
export class BackfillGlycopharmStoreOwnerEnrollmentAndRole20260530220000
  implements MigrationInterface
{
  name = 'BackfillGlycopharmStoreOwnerEnrollmentAndRole20260530220000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 0. 사전 진단 ────────────────────────────────────────────
    const eligibleRows = await queryRunner.query(`
      SELECT COUNT(*)::int AS eligible_count
      FROM service_memberships sm
      JOIN organizations o
        ON o.created_by_user_id = sm.user_id
        AND o."isActive" = true
      WHERE sm.service_key = 'glycopharm'
        AND sm.role IN ('pharmacy', 'pharmacist')
        AND sm.status = 'active'
    `);
    const eligibleCount: number = eligibleRows[0]?.eligible_count ?? 0;

    const missingEnrollmentRows = await queryRunner.query(`
      SELECT COUNT(*)::int AS missing_count
      FROM service_memberships sm
      JOIN organizations o
        ON o.created_by_user_id = sm.user_id
        AND o."isActive" = true
      WHERE sm.service_key = 'glycopharm'
        AND sm.role IN ('pharmacy', 'pharmacist')
        AND sm.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM organization_service_enrollments e
          WHERE e.organization_id = o.id
            AND e.service_code = 'glycopharm'
            AND e.status = 'active'
        )
    `);
    const missingEnrollmentCount: number = missingEnrollmentRows[0]?.missing_count ?? 0;

    const missingRoleRows = await queryRunner.query(`
      SELECT COUNT(*)::int AS missing_count
      FROM service_memberships sm
      JOIN organizations o
        ON o.created_by_user_id = sm.user_id
        AND o."isActive" = true
      WHERE sm.service_key = 'glycopharm'
        AND sm.role IN ('pharmacy', 'pharmacist')
        AND sm.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM role_assignments ra
          WHERE ra.user_id = sm.user_id
            AND ra.role = 'glycopharm:store_owner'
            AND ra.is_active = true
        )
    `);
    const missingRoleCount: number = missingRoleRows[0]?.missing_count ?? 0;

    const orphanRows = await queryRunner.query(`
      SELECT COUNT(*)::int AS orphan_count
      FROM service_memberships sm
      WHERE sm.service_key = 'glycopharm'
        AND sm.role IN ('pharmacy', 'pharmacist')
        AND sm.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM organizations o
          WHERE o.created_by_user_id = sm.user_id
            AND o."isActive" = true
        )
    `);
    const orphanCount: number = orphanRows[0]?.orphan_count ?? 0;

    console.log(
      `[Migration] BackfillGlycopharmStoreOwnerEnrollmentAndRole: pre-check — ` +
        `eligible=${eligibleCount}, missing_enrollment=${missingEnrollmentCount}, ` +
        `missing_role=${missingRoleCount}, orphan_no_org=${orphanCount}`,
    );

    if (orphanCount > 0) {
      console.warn(
        `[Migration] BackfillGlycopharmStoreOwnerEnrollmentAndRole: ${orphanCount} active glycopharm members have NO organization — ` +
          `NOT backfilled (handled by 20260331100000-BackfillGlycopharmPharmacyOrganizations or signup flow)`,
      );
    }

    if (missingEnrollmentCount === 0 && missingRoleCount === 0) {
      console.log('[Migration] BackfillGlycopharmStoreOwnerEnrollmentAndRole: no-op (all 4-tier rows present)');
      return;
    }

    // ─── 1. organization_service_enrollments 누락 보충 ────────────
    let enrollmentInserted = 0;
    if (missingEnrollmentCount > 0) {
      const enrollmentResult = await queryRunner.query(`
        INSERT INTO organization_service_enrollments (
          id,
          organization_id,
          service_code,
          status,
          enrolled_at,
          created_at,
          updated_at
        )
        SELECT
          gen_random_uuid(),
          o.id,
          'glycopharm',
          'active',
          NOW(),
          NOW(),
          NOW()
        FROM service_memberships sm
        JOIN organizations o
          ON o.created_by_user_id = sm.user_id
          AND o."isActive" = true
        WHERE sm.service_key = 'glycopharm'
          AND sm.role IN ('pharmacy', 'pharmacist')
          AND sm.status = 'active'
          AND NOT EXISTS (
            SELECT 1 FROM organization_service_enrollments e
            WHERE e.organization_id = o.id
              AND e.service_code = 'glycopharm'
          )
        ON CONFLICT DO NOTHING
      `);
      enrollmentInserted = Array.isArray(enrollmentResult)
        ? enrollmentResult.length
        : (enrollmentResult as { rowCount?: number }).rowCount ?? 0;
      console.log(
        `[Migration] BackfillGlycopharmStoreOwnerEnrollmentAndRole: inserted ${enrollmentInserted} ` +
          `organization_service_enrollments (glycopharm, active)`,
      );
    }

    // ─── 2. role_assignments.glycopharm:store_owner 누락 보충 ─────
    // 별도 SAVEPOINT — unique_active_role_per_user 제약 위반 시 본 단계만 롤백 (멱등 보장).
    let roleInserted = 0;
    if (missingRoleCount > 0) {
      await queryRunner.query('SAVEPOINT glyco_role_backfill');
      try {
        const roleResult = await queryRunner.query(`
          INSERT INTO role_assignments (
            user_id,
            role,
            is_active,
            valid_from,
            assigned_at,
            scope_type,
            created_at,
            updated_at
          )
          SELECT DISTINCT
            sm.user_id,
            'glycopharm:store_owner',
            true,
            NOW(),
            NOW(),
            'global',
            NOW(),
            NOW()
          FROM service_memberships sm
          JOIN organizations o
            ON o.created_by_user_id = sm.user_id
            AND o."isActive" = true
          WHERE sm.service_key = 'glycopharm'
            AND sm.role IN ('pharmacy', 'pharmacist')
            AND sm.status = 'active'
            AND NOT EXISTS (
              SELECT 1 FROM role_assignments ra
              WHERE ra.user_id = sm.user_id
                AND ra.role = 'glycopharm:store_owner'
                AND ra.is_active = true
            )
          ON CONFLICT ON CONSTRAINT unique_active_role_per_user DO NOTHING
        `);
        roleInserted = Array.isArray(roleResult)
          ? roleResult.length
          : (roleResult as { rowCount?: number }).rowCount ?? 0;
        console.log(
          `[Migration] BackfillGlycopharmStoreOwnerEnrollmentAndRole: inserted ${roleInserted} ` +
            `role_assignments (glycopharm:store_owner)`,
        );
        await queryRunner.query('RELEASE SAVEPOINT glyco_role_backfill');
      } catch (e: any) {
        console.warn(
          `[Migration] BackfillGlycopharmStoreOwnerEnrollmentAndRole: role insert failed — ${e.message}`,
        );
        await queryRunner.query('ROLLBACK TO SAVEPOINT glyco_role_backfill');
      }
    }

    // ─── 3. 사후 검증 ────────────────────────────────────────────
    const afterEnrollment = await queryRunner.query(`
      SELECT COUNT(*)::int AS remaining
      FROM service_memberships sm
      JOIN organizations o
        ON o.created_by_user_id = sm.user_id
        AND o."isActive" = true
      WHERE sm.service_key = 'glycopharm'
        AND sm.role IN ('pharmacy', 'pharmacist')
        AND sm.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM organization_service_enrollments e
          WHERE e.organization_id = o.id
            AND e.service_code = 'glycopharm'
            AND e.status = 'active'
        )
    `);
    const afterRole = await queryRunner.query(`
      SELECT COUNT(*)::int AS remaining
      FROM service_memberships sm
      JOIN organizations o
        ON o.created_by_user_id = sm.user_id
        AND o."isActive" = true
      WHERE sm.service_key = 'glycopharm'
        AND sm.role IN ('pharmacy', 'pharmacist')
        AND sm.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM role_assignments ra
          WHERE ra.user_id = sm.user_id
            AND ra.role = 'glycopharm:store_owner'
            AND ra.is_active = true
        )
    `);
    const remainingEnrollment: number = afterEnrollment[0]?.remaining ?? 0;
    const remainingRole: number = afterRole[0]?.remaining ?? 0;

    console.log(
      `[Migration] BackfillGlycopharmStoreOwnerEnrollmentAndRole: DONE — ` +
        `enrollment_inserted=${enrollmentInserted}, role_inserted=${roleInserted}, ` +
        `remaining_missing_enrollment=${remainingEnrollment}, remaining_missing_role=${remainingRole}, ` +
        `orphan_no_org=${orphanCount}`,
    );

    if (remainingEnrollment > 0 || remainingRole > 0) {
      console.warn(
        `[Migration] BackfillGlycopharmStoreOwnerEnrollmentAndRole: WARNING — residual gaps after backfill ` +
          `(enrollment=${remainingEnrollment}, role=${remainingRole}). Manual investigation may be needed.`,
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // down() no-op — 백필이 만든 row 만 정확히 식별할 metadata 가 없고,
    // 임의 DELETE 시 운영 가드 (membership / role guard) 가 다시 차단될 수 있어 안전상 명시적 no-op.
    // (20260930000000-BackfillCosmeticsServiceEnrollments 동일 정책)
    console.log(
      '[Migration] BackfillGlycopharmStoreOwnerEnrollmentAndRole down: no-op',
    );
  }
}
