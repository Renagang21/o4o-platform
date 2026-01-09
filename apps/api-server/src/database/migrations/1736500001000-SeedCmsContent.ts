/**
 * Migration: SeedCmsContent
 *
 * WO-P2-MIGRATION-SEED-CONTENT: Seed minimal initial content for active services
 *
 * Creates:
 * - Glycopharm: Home Hero (1), Operator Notice (1)
 * - KPA Society: Intranet Hero (1), Notice (1)
 *
 * Rules:
 * - No sample/demo text
 * - Production-ready neutral text only
 * - Minimal footprint
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCmsContent1736500001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if seed data already exists (idempotent)
    const existingContent = await queryRunner.query(`
      SELECT COUNT(*) as count FROM cms_contents
    `);

    if (parseInt(existingContent[0].count) > 0) {
      console.log('Seed data already exists, skipping...');
      return;
    }

    // =========================================================================
    // GLYCOPHARM CONTENT
    // =========================================================================

    // Glycopharm Home Hero
    const glycopharmHeroId = await queryRunner.query(`
      INSERT INTO cms_contents (
        "serviceKey", "organizationId", type, title, summary,
        "imageUrl", "linkUrl", "linkText", status, "publishedAt",
        "sortOrder", "isPinned", "isOperatorPicked", metadata
      ) VALUES (
        'glycopharm', NULL, 'hero',
        '글라이코팜에 오신 것을 환영합니다',
        '약국 전문 의약품 관리 플랫폼',
        NULL, '/about', '자세히 보기', 'published', NOW(),
        0, false, false, '{"backgroundColor": "#1e40af"}'
      ) RETURNING id
    `);

    // Create slot for Glycopharm Home Hero
    await queryRunner.query(`
      INSERT INTO cms_content_slots (
        "serviceKey", "organizationId", "slotKey", "contentId",
        "sortOrder", "isActive"
      ) VALUES (
        'glycopharm', NULL, 'home-hero', $1, 0, true
      )
    `, [glycopharmHeroId[0].id]);

    // Glycopharm Operator Notice
    await queryRunner.query(`
      INSERT INTO cms_contents (
        "serviceKey", "organizationId", type, title, summary,
        "linkUrl", status, "publishedAt",
        "sortOrder", "isPinned", "isOperatorPicked", metadata
      ) VALUES (
        'glycopharm', NULL, 'notice',
        '서비스 이용 안내',
        '글라이코팜 플랫폼 운영 정책 및 이용 안내입니다.',
        '/notice/1', 'published', NOW(),
        0, true, false, '{}'
      )
    `);

    // =========================================================================
    // KPA SOCIETY CONTENT
    // =========================================================================

    // KPA Intranet Hero
    const kpaHeroId = await queryRunner.query(`
      INSERT INTO cms_contents (
        "serviceKey", "organizationId", type, title, summary,
        "imageUrl", "linkUrl", "linkText", status, "publishedAt",
        "sortOrder", "isPinned", "isOperatorPicked", metadata
      ) VALUES (
        'kpa', NULL, 'hero',
        '대한약사회에 오신 것을 환영합니다',
        '약사 전문직 단체의 공식 인트라넷',
        NULL, '/intranet', '인트라넷 이용하기', 'published', NOW(),
        0, false, false, '{"backgroundColor": "#166534"}'
      ) RETURNING id
    `);

    // Create slot for KPA Intranet Hero
    await queryRunner.query(`
      INSERT INTO cms_content_slots (
        "serviceKey", "organizationId", "slotKey", "contentId",
        "sortOrder", "isActive"
      ) VALUES (
        'kpa', NULL, 'intranet-hero', $1, 0, true
      )
    `, [kpaHeroId[0].id]);

    // KPA Notice
    await queryRunner.query(`
      INSERT INTO cms_contents (
        "serviceKey", "organizationId", type, title, summary,
        "linkUrl", status, "publishedAt",
        "sortOrder", "isPinned", "isOperatorPicked", metadata
      ) VALUES (
        'kpa', NULL, 'notice',
        '인트라넷 이용 안내',
        '대한약사회 인트라넷 서비스 이용 안내입니다.',
        '/intranet/notice/1', 'published', NOW(),
        0, true, false, '{}'
      )
    `);

    console.log('Seed content created successfully');
    console.log('- Glycopharm: 1 Hero, 1 Notice');
    console.log('- KPA Society: 1 Hero, 1 Notice');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete seed content (only if we want to rollback)
    await queryRunner.query(`
      DELETE FROM cms_content_slots
      WHERE "serviceKey" IN ('glycopharm', 'kpa')
    `);

    await queryRunner.query(`
      DELETE FROM cms_contents
      WHERE "serviceKey" IN ('glycopharm', 'kpa')
      AND type IN ('hero', 'notice')
    `);

    console.log('Seed content removed');
  }
}
