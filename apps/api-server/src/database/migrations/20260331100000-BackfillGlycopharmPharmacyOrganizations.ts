/**
 * BackfillGlycopharmPharmacyOrganizations
 *
 * glycopharm pharmacy role을 가진 사용자 중 organization이 없는 경우
 * organization + enrollment + member 레코드를 자동 생성.
 *
 * 원인: 사용자가 migration 20260318130000 이후에 생성되어 organization이 누락됨.
 * Idempotent: 이미 organization이 있으면 skip.
 */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillGlycopharmPharmacyOrganizations20260331100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. glycopharm pharmacy role을 가졌으나 organization이 없는 사용자 찾기
    const orphanedPharmacists = await queryRunner.query(`
      SELECT u.id AS user_id, u.email, u."firstName", u."lastName", u.nickname
      FROM users u
      JOIN service_memberships sm
        ON sm.user_id = u.id
        AND sm.service_key = 'glycopharm'
        AND sm.role = 'pharmacy'
        AND sm.status = 'active'
      WHERE u."isActive" = true
        AND NOT EXISTS (
          SELECT 1 FROM organizations o
          WHERE o.created_by_user_id = u.id
            AND o."isActive" = true
        )
        AND NOT EXISTS (
          SELECT 1 FROM organization_members om
          JOIN organizations o2 ON o2.id = om.organization_id
          JOIN organization_service_enrollments ose ON ose.organization_id = o2.id
            AND ose.service_code = 'glycopharm'
          WHERE om.user_id = u.id
            AND om.left_at IS NULL
        )
    `);

    if (orphanedPharmacists.length === 0) {
      console.log('[Migration] No orphaned glycopharm pharmacists found');
      return;
    }

    console.log(`[Migration] Found ${orphanedPharmacists.length} orphaned glycopharm pharmacists`);

    for (const user of orphanedPharmacists) {
      const displayName = user.nickname
        || [user.lastName, user.firstName].filter(Boolean).join('')
        || user.email.split('@')[0];
      const orgCode = `GP-AUTO-${user.user_id.substring(0, 8).toUpperCase()}`;

      // 2. Create organization
      const orgResult = await queryRunner.query(
        `INSERT INTO organizations (id, name, code, type, level, path, "isActive", created_by_user_id, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, 'pharmacy', 0, $3, true, $4, NOW(), NOW())
         ON CONFLICT (code) DO UPDATE SET created_by_user_id = $4, "updatedAt" = NOW()
         RETURNING id`,
        [displayName, orgCode, `/${orgCode}`, user.user_id],
      );
      const orgId = orgResult[0].id;

      // 3. Create organization_members
      await queryRunner.query(
        `INSERT INTO organization_members (id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, 'owner', true, NOW(), NOW(), NOW())
         ON CONFLICT ON CONSTRAINT "UQ_org_member_org_user" DO NOTHING`,
        [orgId, user.user_id],
      );

      // 4. Create service enrollments (glycopharm + glucoseview)
      for (const serviceCode of ['glycopharm', 'glucoseview']) {
        await queryRunner.query(
          `INSERT INTO organization_service_enrollments (id, organization_id, service_code, status, enrolled_at, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, 'active', NOW(), NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          [orgId, serviceCode],
        );
      }

      console.log(`[Migration] Created org ${orgId} (${displayName}) for user ${user.email}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Idempotent forward migration — no rollback
  }
}
