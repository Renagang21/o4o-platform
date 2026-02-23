/**
 * Migration: SeedHubSlotContent
 *
 * WO-O4O-HUB-DATA-UNIFICATION-V1
 *
 * Creates Hub-specific CMS content + slots for all 3 services.
 * Each service gets 1 hero content + 1 hero slot.
 * Idempotent via ON CONFLICT (id) DO NOTHING.
 *
 * Slot Keys:
 *   - kpa-hub-hero / kpa-hub-promo
 *   - glycopharm-hub-hero / glycopharm-hub-promo
 *   - kcos-hub-hero / kcos-hub-promo
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

// UUID Scheme (hex-safe, unique prefix for hub seeds)
// Content: e2000000-0a00-4000-e200-000000000{001..010}
// Slots:   e3000000-0a00-4000-e300-000000000{001..010}

function contentId(n: number): string {
  return `e2000000-0a00-4000-e200-${n.toString().padStart(12, '0')}`;
}
function slotId(n: number): string {
  return `e3000000-0a00-4000-e300-${n.toString().padStart(12, '0')}`;
}

interface HubHeroSeed {
  contentIdx: number;
  slotIdx: number;
  serviceKey: string;
  slotKey: string;
  title: string;
  summary: string;
  backgroundColor: string;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string | null;
}

const HUB_HEROES: HubHeroSeed[] = [
  {
    contentIdx: 1,
    slotIdx: 1,
    serviceKey: 'kpa',
    slotKey: 'kpa-hub-hero',
    title: '약국 HUB',
    summary: '플랫폼이 제공하는 자원을 탐색하고 내 매장으로 가져갑니다',
    backgroundColor: '#1E3A8A',
    imageUrl: null,
    linkUrl: null,
    linkText: null,
  },
  {
    contentIdx: 2,
    slotIdx: 2,
    serviceKey: 'glycopharm',
    slotKey: 'glycopharm-hub-hero',
    title: 'GlycoPharm HUB',
    summary: '혈당관리 전문 플랫폼이 제공하는 자원을 탐색하세요',
    backgroundColor: '#0d9488',
    imageUrl: null,
    linkUrl: null,
    linkText: null,
  },
  {
    contentIdx: 3,
    slotIdx: 3,
    serviceKey: 'cosmetics',
    slotKey: 'kcos-hub-hero',
    title: 'K-Cosmetics HUB',
    summary: 'K-뷰티 플랫폼이 제공하는 자원을 탐색하세요',
    backgroundColor: '#DB2777',
    imageUrl: null,
    linkUrl: null,
    linkText: null,
  },
];

export class SeedHubSlotContent1708675200000 implements MigrationInterface {
  name = 'SeedHubSlotContent1708675200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert hero contents (camelCase column names — TypeORM default)
    for (const hero of HUB_HEROES) {
      await queryRunner.query(`
        INSERT INTO cms_contents (
          id, "serviceKey", "organizationId", type, title, summary, body,
          "imageUrl", "linkUrl", "linkText",
          status, "publishedAt", "sortOrder", "isPinned", "isOperatorPicked",
          metadata, "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, NULL, 'hero', $3, $4, NULL,
          $5, $6, $7,
          'published', NOW(), 0, false, false,
          $8, NOW(), NOW()
        ) ON CONFLICT (id) DO NOTHING;
      `, [
        contentId(hero.contentIdx),
        hero.serviceKey,
        hero.title,
        hero.summary,
        hero.imageUrl,
        hero.linkUrl,
        hero.linkText,
        JSON.stringify({ backgroundColor: hero.backgroundColor, source: 'hub-seed' }),
      ]);
    }

    // Insert hero slots (camelCase column names)
    for (const hero of HUB_HEROES) {
      await queryRunner.query(`
        INSERT INTO cms_content_slots (
          id, "serviceKey", "organizationId", "slotKey", "contentId",
          "sortOrder", "isActive", "startsAt", "endsAt",
          "isLocked", "lockedBy", "lockedReason", "lockedUntil",
          "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, NULL, $3, $4,
          1, true, NULL, NULL,
          false, NULL, NULL, NULL,
          NOW(), NOW()
        ) ON CONFLICT (id) DO NOTHING;
      `, [
        slotId(hero.slotIdx),
        hero.serviceKey,
        hero.slotKey,
        contentId(hero.contentIdx),
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove slots first (FK cascade would handle this but be explicit)
    for (const hero of HUB_HEROES) {
      await queryRunner.query(`DELETE FROM cms_content_slots WHERE id = $1`, [slotId(hero.slotIdx)]);
    }
    // Remove contents
    for (const hero of HUB_HEROES) {
      await queryRunner.query(`DELETE FROM cms_contents WHERE id = $1`, [contentId(hero.contentIdx)]);
    }
  }
}
