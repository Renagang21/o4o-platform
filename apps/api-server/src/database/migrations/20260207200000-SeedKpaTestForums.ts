/**
 * Migration: SeedKpaTestForums
 *
 * WO-KPA-SOCIETY-DATA-SEED-V1.2 — Phase 2
 *
 * Creates 6 forum categories for KPA Society alpha testing:
 *   KPA-a (커뮤니티, scope: community):
 *     1. 약국 운영 정보 나눔 (open, accessLevel: all)
 *     2. 개국약사 실무 토론방 (membership, accessLevel: member)
 *   KPA-b (데모, scope: demo):
 *     3. 지역 약사 소식 공유 (open, accessLevel: all)
 *     4. 지역 약사회 내부 논의 (membership, accessLevel: member)
 *   KPA-c (분회, scope: organization):
 *     5. 분회 활동 소식 게시판 (open, accessLevel: all)
 *     6. 분회 운영진 전용 토론 (membership, accessLevel: member)
 *
 * Also updates kpa_members for yaksa10-12 to status='pending'
 * to provide diverse membership states for testing.
 *
 * Idempotent: ON CONFLICT (slug) DO NOTHING
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

// Fixed UUIDs for forum categories (deterministic)
const FORUM_IDS = {
  KPA_A_OPEN:       'f0000000-kpa0-4000-f000-000000000001',
  KPA_A_MEMBERSHIP: 'f0000000-kpa0-4000-f000-000000000002',
  KPA_B_OPEN:       'f0000000-kpa0-4000-f000-000000000003',
  KPA_B_MEMBERSHIP: 'f0000000-kpa0-4000-f000-000000000004',
  KPA_C_OPEN:       'f0000000-kpa0-4000-f000-000000000005',
  KPA_C_MEMBERSHIP: 'f0000000-kpa0-4000-f000-000000000006',
};

// Organization UUIDs from Phase 1 seed
const ORG_IDS = {
  SEOUL_BRANCH: 'a0000000-kpa0-4000-a000-000000000002',  // 서울특별시약사회
  JONGNO_GROUP: 'a0000000-kpa0-4000-a000-000000000003',  // 종로구약사회
};

// Emails for pending membership test
const PENDING_MEMBER_EMAILS = [
  'yaksa10@o4o.com',
  'yaksa11@o4o.com',
  'yaksa12@o4o.com',
];

interface ForumCategoryDef {
  id: string;
  name: string;
  description: string;
  slug: string;
  color: string;
  sortOrder: number;
  accessLevel: 'all' | 'member';
  organizationId: string | null;
  isOrganizationExclusive: boolean;
  creatorEmail: string;
  service: string;
}

const FORUM_CATEGORIES: ForumCategoryDef[] = [
  // KPA-a: 커뮤니티 서비스 (scope: community, organizationId IS NULL)
  {
    id: FORUM_IDS.KPA_A_OPEN,
    name: '약국 운영 정보 나눔',
    description: '약국 운영에 관한 정보를 자유롭게 나누는 공간입니다. 누구나 읽고 쓸 수 있습니다.',
    slug: 'kpa-a-pharmacy-info-sharing',
    color: '#4CAF50',
    sortOrder: 1,
    accessLevel: 'all',
    organizationId: null,
    isOrganizationExclusive: false,
    creatorEmail: 'yaksa01@o4o.com',
    service: 'KPA-a',
  },
  {
    id: FORUM_IDS.KPA_A_MEMBERSHIP,
    name: '개국약사 실무 토론방',
    description: '개국약사를 위한 실무 토론방입니다. 회원만 접근할 수 있습니다.',
    slug: 'kpa-a-pharmacist-practice-forum',
    color: '#2196F3',
    sortOrder: 2,
    accessLevel: 'member',
    organizationId: null,
    isOrganizationExclusive: false,
    creatorEmail: 'yaksa02@o4o.com',
    service: 'KPA-a',
  },
  // KPA-b: 데모 서비스 (scope: demo — 현재 API는 빈 결과 반환, 포럼은 리소스로 존재)
  {
    id: FORUM_IDS.KPA_B_OPEN,
    name: '지역 약사 소식 공유',
    description: '지역 약사들의 소식을 나누는 게시판입니다.',
    slug: 'kpa-b-local-pharmacist-news',
    color: '#FF9800',
    sortOrder: 1,
    accessLevel: 'all',
    organizationId: ORG_IDS.SEOUL_BRANCH,
    isOrganizationExclusive: false,
    creatorEmail: 'yaksa01@o4o.com',
    service: 'KPA-b',
  },
  {
    id: FORUM_IDS.KPA_B_MEMBERSHIP,
    name: '지역 약사회 내부 논의',
    description: '지역 약사회 회원 전용 토론 공간입니다.',
    slug: 'kpa-b-local-branch-internal',
    color: '#E91E63',
    sortOrder: 2,
    accessLevel: 'member',
    organizationId: ORG_IDS.SEOUL_BRANCH,
    isOrganizationExclusive: true,
    creatorEmail: 'yaksa02@o4o.com',
    service: 'KPA-b',
  },
  // KPA-c: 분회 서비스 (scope: organization, organizationId = 종로구약사회)
  {
    id: FORUM_IDS.KPA_C_OPEN,
    name: '분회 활동 소식 게시판',
    description: '분회 활동 관련 소식을 공유하는 게시판입니다.',
    slug: 'kpa-c-group-activity-news',
    color: '#9C27B0',
    sortOrder: 1,
    accessLevel: 'all',
    organizationId: ORG_IDS.JONGNO_GROUP,
    isOrganizationExclusive: false,
    creatorEmail: 'yaksa01@o4o.com',
    service: 'KPA-c',
  },
  {
    id: FORUM_IDS.KPA_C_MEMBERSHIP,
    name: '분회 운영진 전용 토론',
    description: '분회 운영진만 접근 가능한 내부 토론 공간입니다.',
    slug: 'kpa-c-group-admin-only',
    color: '#F44336',
    sortOrder: 2,
    accessLevel: 'member',
    organizationId: ORG_IDS.JONGNO_GROUP,
    isOrganizationExclusive: true,
    creatorEmail: 'yaksa02@o4o.com',
    service: 'KPA-c',
  },
];

export class SeedKpaTestForums20260207200000 implements MigrationInterface {
  name = 'SeedKpaTestForums20260207200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[SEED] KPA Forum Categories - Starting...');

    // Check if forum_category table exists
    const hasTable = await queryRunner.hasTable('forum_category');
    if (!hasTable) {
      console.log('[SEED] forum_category table does not exist, skipping forum seed');
      console.log('[SEED] Run forum-core migrations first');
      return;
    }

    // Step 1: Create forum categories
    let createdCategories = 0;

    for (const cat of FORUM_CATEGORIES) {
      // Look up creator user_id by email
      const userResult = await queryRunner.query(
        `SELECT id FROM users WHERE email = $1`,
        [cat.creatorEmail]
      );

      const createdBy = userResult.length > 0 ? userResult[0].id : null;

      // Check if slug already exists
      const existing = await queryRunner.query(
        `SELECT id FROM forum_category WHERE slug = $1`,
        [cat.slug]
      );

      if (existing.length > 0) {
        console.log(`[SEED] Forum category already exists: ${cat.slug}, skipping`);
        continue;
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
          0, $8,
          $9, $10,
          NOW(), NOW()
        )
      `, [
        cat.id,
        cat.name,
        cat.description,
        cat.slug,
        cat.color,
        cat.sortOrder,
        cat.accessLevel,
        createdBy,
        cat.organizationId,
        cat.isOrganizationExclusive,
      ]);

      createdCategories++;
      console.log(`[SEED] Created forum: [${cat.service}] ${cat.name} (${cat.accessLevel})`);
    }

    // Step 2: Update yaksa10-12 to pending status for membership testing
    let pendingUpdated = 0;
    for (const email of PENDING_MEMBER_EMAILS) {
      const result = await queryRunner.query(`
        UPDATE kpa_members SET status = 'pending', joined_at = NULL
        WHERE user_id = (SELECT id FROM users WHERE email = $1)
          AND status = 'active'
      `, [email]);

      if (result?.[1] > 0) {
        pendingUpdated++;
        console.log(`[SEED] Updated ${email} kpa_member to pending`);
      }
    }

    // Step 3: Summary
    console.log('');
    console.log('=== KPA Forum Seed Complete ===');
    console.log(`  Categories created: ${createdCategories} / ${FORUM_CATEGORIES.length}`);
    console.log(`  Members set to pending: ${pendingUpdated} / ${PENDING_MEMBER_EMAILS.length}`);
    console.log('');
    console.log('  KPA-a (커뮤니티, scope: community):');
    console.log('    - 약국 운영 정보 나눔 (open, accessLevel: all)');
    console.log('    - 개국약사 실무 토론방 (membership, accessLevel: member)');
    console.log('');
    console.log('  KPA-b (데모, scope: demo):');
    console.log('    - 지역 약사 소식 공유 (open, org: 서울특별시약사회)');
    console.log('    - 지역 약사회 내부 논의 (membership, org: 서울특별시약사회)');
    console.log('');
    console.log('  KPA-c (분회, scope: organization):');
    console.log('    - 분회 활동 소식 게시판 (open, org: 종로구약사회)');
    console.log('    - 분회 운영진 전용 토론 (membership, org: 종로구약사회)');
    console.log('');
    console.log('  Membership states:');
    console.log('    - yaksa03-09: active (approved)');
    console.log('    - yaksa10-12: pending (awaiting approval)');
    console.log('    - yaksa31-65: non-member of branch orgs (본회 소속)');
    console.log('');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[SEED] Cleaning up KPA forum categories...');

    const forumIds = Object.values(FORUM_IDS);

    // 1. Delete forum categories
    const catResult = await queryRunner.query(`
      DELETE FROM forum_category
      WHERE id = ANY($1::uuid[])
    `, [forumIds]);
    console.log(`[SEED] Deleted forum categories: ${catResult?.[1] ?? 0} rows`);

    // 2. Restore yaksa10-12 to active status
    for (const email of PENDING_MEMBER_EMAILS) {
      await queryRunner.query(`
        UPDATE kpa_members SET status = 'active', joined_at = CURRENT_DATE
        WHERE user_id = (SELECT id FROM users WHERE email = $1)
          AND status = 'pending'
      `, [email]);
    }
    console.log(`[SEED] Restored ${PENDING_MEMBER_EMAILS.length} members to active`);

    console.log('[SEED] Forum cleanup complete');
  }
}
