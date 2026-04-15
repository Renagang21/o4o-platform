import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Re-create Market Trial forum category.
 *
 * Migration 20260406200000 originally created this category,
 * but 20260412100000 (CleanupForumTestData) deleted all categories
 * except two KEEP_IDs, which did not include the market-trial one.
 *
 * This migration re-inserts the same row idempotently.
 */
export class ReseedMarketTrialForumCategory20260415260000 implements MigrationInterface {
  name = 'ReseedMarketTrialForumCategory20260415260000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('forum_category');
    if (!hasTable) return;

    const categoryId = 'f0000000-0a00-4000-f000-0000000000f1';

    const existing = await queryRunner.query(
      `SELECT id FROM forum_category WHERE id = $1 OR slug = $2`,
      [categoryId, 'kpa-a-market-trial'],
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
