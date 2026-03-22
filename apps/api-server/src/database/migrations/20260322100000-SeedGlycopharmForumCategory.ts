import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-GLYCOPHARM-FORUM-CATEGORY-SEED-V1
 *
 * GlycoPharm 약국 커뮤니티 포럼에 초기 카테고리 1개 추가:
 *   - "당뇨 케어 사례 공유" (open, accessLevel: all)
 *
 * 사전 조건:
 *   - FORUM_GLYCOPHARM organization이 CleanupDemoSeedData에서 삭제되었으므로 재생성
 *   - forum_category 테이블 존재 필요
 *
 * Idempotent: ON CONFLICT DO NOTHING / slug 중복 체크
 */

const GLYCOPHARM_FORUM_ORG_ID = 'a1b2c3d4-0001-4000-a000-forum00000001';
const GLYCOPHARM_CARE_FORUM_ID = 'f0000000-0a00-4000-f000-glycopharm01';
const GLYCOPHARM_CARE_FORUM_SLUG = 'glycopharm-diabetes-care-sharing';

export class SeedGlycopharmForumCategory20260322100000 implements MigrationInterface {
  name = 'SeedGlycopharmForumCategory20260322100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[SEED] GlycoPharm Forum Category - Starting...');

    // Step 1: Ensure FORUM_GLYCOPHARM organization exists
    const orgExists = await queryRunner.query(
      `SELECT id FROM organizations WHERE code = 'FORUM_GLYCOPHARM'`,
    );

    if (orgExists.length === 0) {
      await queryRunner.query(`
        INSERT INTO organizations (id, name, code, type, level, path, metadata, "isActive", "childrenCount", "createdAt", "updatedAt")
        VALUES (
          $1,
          'GlycoPharm',
          'FORUM_GLYCOPHARM',
          'division',
          0,
          '/glycopharm',
          '{"purpose": "forum-service-organization", "serviceCode": "glycopharm"}'::jsonb,
          true,
          0,
          NOW(),
          NOW()
        )
        ON CONFLICT (code) DO NOTHING
      `, [GLYCOPHARM_FORUM_ORG_ID]);
      console.log('[SEED] Re-created FORUM_GLYCOPHARM organization');
    } else {
      console.log('[SEED] FORUM_GLYCOPHARM organization already exists');
    }

    // Step 2: Check if forum_category table exists
    const hasTable = await queryRunner.hasTable('forum_category');
    if (!hasTable) {
      console.log('[SEED] forum_category table does not exist, skipping');
      return;
    }

    // Step 3: Create forum category if not exists
    const existing = await queryRunner.query(
      `SELECT id FROM forum_category WHERE slug = $1`,
      [GLYCOPHARM_CARE_FORUM_SLUG],
    );

    if (existing.length > 0) {
      console.log(`[SEED] Forum category already exists: ${GLYCOPHARM_CARE_FORUM_SLUG}, skipping`);
      return;
    }

    await queryRunner.query(`
      INSERT INTO forum_category (
        "id", "name", "description", "slug", "color",
        "sortOrder", "isActive", "requireApproval", "accessLevel",
        "postCount", "createdBy",
        "organizationId", "isOrganizationExclusive",
        "created_at", "updated_at"
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, true, false, $7,
        0, NULL,
        $8, false,
        NOW(), NOW()
      )
    `, [
      GLYCOPHARM_CARE_FORUM_ID,
      '당뇨 케어 사례 공유',
      '약국에서의 당뇨 환자 케어 경험과 사례를 나누는 공간입니다. 현장 노하우, 코칭 팁, 가이드라인 개선 의견을 자유롭게 공유하세요.',
      GLYCOPHARM_CARE_FORUM_SLUG,
      '#3B82F6',
      1,
      'all',
      GLYCOPHARM_FORUM_ORG_ID,
    ]);

    console.log('[SEED] Created forum category: 당뇨 케어 사례 공유');
    console.log('[SEED] GlycoPharm Forum Category - Complete');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM forum_category WHERE id = $1`,
      [GLYCOPHARM_CARE_FORUM_ID],
    );
    console.log('[SEED] Deleted GlycoPharm forum category');
  }
}
