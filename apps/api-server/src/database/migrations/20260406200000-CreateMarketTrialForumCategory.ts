import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-MARKET-TRIAL-KPA-FORUM-INTEGRATION-V1
 *
 * KPA-a 내 Market Trial 전용 포럼 카테고리 생성.
 * - 약국 회원(member 등급) 접근만 허용
 * - 운영자 승인 시 trial별 게시글이 이 카테고리에 자동 생성됨
 */
export class CreateMarketTrialForumCategory20260406200000 implements MigrationInterface {
  name = 'CreateMarketTrialForumCategory20260406200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('forum_category');
    if (!hasTable) return;

    const categoryId = 'f0000000-0a00-4000-f000-0000000000f1';

    // 멱등 INSERT
    const existing = await queryRunner.query(
      `SELECT id FROM forum_category WHERE slug = $1`,
      ['kpa-a-market-trial'],
    );
    if (existing.length > 0) return;

    await queryRunner.query(
      `INSERT INTO forum_category (
        "id", "name", "description", "slug", "color",
        "sortOrder", "isActive", "requireApproval", "accessLevel",
        "postCount", "createdBy",
        "organizationId", "isOrganizationExclusive",
        "created_at", "updated_at"
      ) VALUES (
        $1, $2, $3, $4, $5,
        100, true, false, 'member',
        0, NULL,
        NULL, false,
        NOW(), NOW()
      )`,
      [
        categoryId,
        '시범판매 (Market Trial)',
        '공급자가 제안한 시범판매 trial을 약국 회원이 검토·참여·의견을 나누는 공간입니다.',
        'kpa-a-market-trial',
        '#7c3aed',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM forum_category WHERE slug = 'kpa-a-market-trial'`,
    );
  }
}
