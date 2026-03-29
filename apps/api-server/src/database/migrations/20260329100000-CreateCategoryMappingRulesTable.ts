/**
 * WO-NETURE-CATEGORY-MAPPING-RULE-SYSTEM-V1
 *
 * category_mapping_rules: keyword → category_id 매핑 룰 테이블
 * - keyword UNIQUE (lowercase 정규화)
 * - priority 기반 매칭 (높을수록 우선)
 * - 초기 seed: 건강기능식품/의약외품/화장품 키워드
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategoryMappingRulesTable20260329100000
  implements MigrationInterface
{
  name = 'CreateCategoryMappingRulesTable20260329100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS category_mapping_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        keyword VARCHAR(100) NOT NULL,
        category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
        priority INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_category_mapping_rules_keyword UNIQUE (keyword)
      )
    `);

    // 2. Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_category_mapping_rules_category
        ON category_mapping_rules (category_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_category_mapping_rules_active
        ON category_mapping_rules (is_active) WHERE is_active = true
    `);

    // 3. Seed initial mapping rules
    await queryRunner.query(`
      INSERT INTO category_mapping_rules (keyword, category_id, priority, is_active)
      SELECT keyword, cat_id, priority, true
      FROM (VALUES
        ('비타민',       (SELECT id FROM product_categories WHERE slug = 'hf-vitamin-mineral' LIMIT 1), 10),
        ('미네랄',       (SELECT id FROM product_categories WHERE slug = 'hf-vitamin-mineral' LIMIT 1), 10),
        ('프로바이오틱스', (SELECT id FROM product_categories WHERE slug = 'hf-probiotics' LIMIT 1), 10),
        ('유산균',       (SELECT id FROM product_categories WHERE slug = 'hf-probiotics' LIMIT 1), 10),
        ('오메가',       (SELECT id FROM product_categories WHERE slug = 'hf-omega3' LIMIT 1), 10),
        ('피쉬오일',     (SELECT id FROM product_categories WHERE slug = 'hf-omega3' LIMIT 1), 8),
        ('홍삼',         (SELECT id FROM product_categories WHERE slug = 'hf-ginseng' LIMIT 1), 10),
        ('인삼',         (SELECT id FROM product_categories WHERE slug = 'hf-ginseng' LIMIT 1), 8),
        ('치약',         (SELECT id FROM product_categories WHERE slug = 'quasi-drug' LIMIT 1), 5),
        ('소독',         (SELECT id FROM product_categories WHERE slug = 'quasi-drug' LIMIT 1), 5),
        ('마스크',       (SELECT id FROM product_categories WHERE slug = 'quasi-drug' LIMIT 1), 3),
        ('크림',         (SELECT id FROM product_categories WHERE slug = 'cosmetics' LIMIT 1), 3),
        ('세럼',         (SELECT id FROM product_categories WHERE slug = 'cosmetics' LIMIT 1), 5),
        ('선크림',       (SELECT id FROM product_categories WHERE slug = 'cosmetics' LIMIT 1), 7),
        ('로션',         (SELECT id FROM product_categories WHERE slug = 'cosmetics' LIMIT 1), 3)
      ) AS t(keyword, cat_id, priority)
      WHERE cat_id IS NOT NULL
      ON CONFLICT (keyword) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS category_mapping_rules`);
  }
}
