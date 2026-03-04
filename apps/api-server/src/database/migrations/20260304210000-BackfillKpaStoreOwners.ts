/**
 * WO-KPA-B-STORE-CONTAMINATION-CLEANUP-V1 Phase 3A
 *
 * KPA 회원 → organization_members 백필:
 * 1. 약국 개설약사 (activity_type = 'pharmacy_owner') → role = 'owner'
 * 2. KPA admin/operator (kpa_members.role IN ('admin','operator')) → role = 'admin'/'manager'
 *
 * 목적: KPA_STORE_ACCESS_ROLES 바이패스 제거 전, relation-based 접근 경로 확보.
 * Idempotent: NOT EXISTS guard로 중복 삽입 방지.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillKpaStoreOwners20260304210000
  implements MigrationInterface
{
  name = 'BackfillKpaStoreOwners20260304210000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: skip if organization_members table does not exist
    const hasTable = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'organization_members'
      ) AS exists
    `);
    if (!hasTable[0]?.exists) {
      return;
    }

    // 1. 약국 개설약사 → organization_members (role = 'owner')
    const hasActivityType = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'kpa_members' AND column_name = 'activity_type'
      ) AS exists
    `);

    if (hasActivityType[0]?.exists) {
      const ownerResult = await queryRunner.query(`
        INSERT INTO organization_members (
          id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at
        )
        SELECT
          gen_random_uuid(),
          km.organization_id,
          km.user_id,
          'owner',
          true,
          COALESCE(km.joined_at, km.created_at),
          NOW(),
          NOW()
        FROM kpa_members km
        WHERE km.status = 'active'
          AND km.activity_type = 'pharmacy_owner'
          AND NOT EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = km.organization_id
              AND om.user_id = km.user_id
          )
        ON CONFLICT (organization_id, user_id) DO NOTHING
        RETURNING id
      `);
      console.log(`[BackfillKpaStoreOwners] Inserted ${ownerResult.length} pharmacy owner records`);
    }

    // 2. KPA admin/operator → organization_members (role = 'admin'/'manager')
    const adminResult = await queryRunner.query(`
      INSERT INTO organization_members (
        id, organization_id, user_id, role, is_primary, joined_at, created_at, updated_at
      )
      SELECT
        gen_random_uuid(),
        km.organization_id,
        km.user_id,
        CASE WHEN km.role = 'admin' THEN 'admin' ELSE 'manager' END,
        false,
        COALESCE(km.joined_at, km.created_at),
        NOW(),
        NOW()
      FROM kpa_members km
      WHERE km.status = 'active'
        AND km.role IN ('admin', 'operator')
        AND NOT EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.organization_id = km.organization_id
            AND om.user_id = km.user_id
        )
      ON CONFLICT (organization_id, user_id) DO NOTHING
      RETURNING id
    `);
    console.log(`[BackfillKpaStoreOwners] Inserted ${adminResult.length} admin/operator records`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: 이 마이그레이션에서 생성한 레코드만 제거하기 어려우므로
    // created_at 기준으로 제거 (이 마이그레이션 실행 시점 이후 생성된 것)
    // 안전을 위해 down은 no-op — 수동 정리 권장
    console.log('[BackfillKpaStoreOwners] down() is no-op. Manual cleanup required if rollback needed.');
  }
}
