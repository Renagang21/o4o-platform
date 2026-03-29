/**
 * WO-NETURE-CATEGORY-TREE-EXPANSION-V1
 *
 * 1. 카테고리 트리 확장 (건강기기, 의료소모품 대분류 + 하위 중분류)
 * 2. 화장품/생활용품/건강기능식품 하위 세분화
 * 3. 매핑 규칙 확장 (혈당, CGM, 펜니들 등 ~30개 신규)
 * 4. 기존 규칙 카테고리 재배치 (소독 → 의료소모품, 치약 → 생활용품 등)
 *
 * Idempotent: ON CONFLICT DO NOTHING for categories, ON CONFLICT DO UPDATE for rules
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandCategoryTreeAndMappingRules20260329200000
  implements MigrationInterface
{
  name = 'ExpandCategoryTreeAndMappingRules20260329200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ═══ 1. 새 대분류 (depth 0) ═══
    await queryRunner.query(`
      INSERT INTO product_categories (id, name, slug, parent_id, depth, sort_order, is_active, is_regulated)
      VALUES
        (gen_random_uuid(), '건강기기',   'health-device',   NULL, 0, 5, true, false),
        (gen_random_uuid(), '의료소모품', 'medical-supply',  NULL, 0, 6, true, true)
      ON CONFLICT (slug) DO NOTHING
    `);

    // ═══ 2. 건강기기 하위 (depth 1) ═══
    await queryRunner.query(`
      INSERT INTO product_categories (id, name, slug, parent_id, depth, sort_order, is_active, is_regulated)
      VALUES
        (gen_random_uuid(), '혈당관리',       'hd-glucose',        (SELECT id FROM product_categories WHERE slug = 'health-device' LIMIT 1), 1, 1, true, false),
        (gen_random_uuid(), '체온관리',       'hd-temperature',    (SELECT id FROM product_categories WHERE slug = 'health-device' LIMIT 1), 1, 2, true, false),
        (gen_random_uuid(), '혈압관리',       'hd-blood-pressure', (SELECT id FROM product_categories WHERE slug = 'health-device' LIMIT 1), 1, 3, true, false),
        (gen_random_uuid(), '기타 건강기기', 'hd-etc',            (SELECT id FROM product_categories WHERE slug = 'health-device' LIMIT 1), 1, 4, true, false)
      ON CONFLICT (slug) DO NOTHING
    `);

    // ═══ 3. 의료소모품 하위 (depth 1) ═══
    await queryRunner.query(`
      INSERT INTO product_categories (id, name, slug, parent_id, depth, sort_order, is_active, is_regulated)
      VALUES
        (gen_random_uuid(), '주사/인슐린',     'ms-injection',  (SELECT id FROM product_categories WHERE slug = 'medical-supply' LIMIT 1), 1, 1, true, true),
        (gen_random_uuid(), '위생/방역',       'ms-hygiene',    (SELECT id FROM product_categories WHERE slug = 'medical-supply' LIMIT 1), 1, 2, true, true),
        (gen_random_uuid(), '기타 의료소모품', 'ms-etc',        (SELECT id FROM product_categories WHERE slug = 'medical-supply' LIMIT 1), 1, 3, true, true)
      ON CONFLICT (slug) DO NOTHING
    `);

    // ═══ 4. 화장품 하위 (depth 1) ═══
    await queryRunner.query(`
      INSERT INTO product_categories (id, name, slug, parent_id, depth, sort_order, is_active, is_regulated)
      VALUES
        (gen_random_uuid(), '기초',   'cos-basic',      (SELECT id FROM product_categories WHERE slug = 'cosmetics' LIMIT 1), 1, 1, true, false),
        (gen_random_uuid(), '색조',   'cos-color',      (SELECT id FROM product_categories WHERE slug = 'cosmetics' LIMIT 1), 1, 2, true, false),
        (gen_random_uuid(), '기능성', 'cos-functional', (SELECT id FROM product_categories WHERE slug = 'cosmetics' LIMIT 1), 1, 3, true, false)
      ON CONFLICT (slug) DO NOTHING
    `);

    // ═══ 5. 생활용품 하위 (depth 2 — general-living 아래) ═══
    await queryRunner.query(`
      INSERT INTO product_categories (id, name, slug, parent_id, depth, sort_order, is_active, is_regulated)
      VALUES
        (gen_random_uuid(), '개인위생', 'gl-personal-hygiene', (SELECT id FROM product_categories WHERE slug = 'general-living' LIMIT 1), 2, 1, true, false),
        (gen_random_uuid(), '가정용품', 'gl-household',        (SELECT id FROM product_categories WHERE slug = 'general-living' LIMIT 1), 2, 2, true, false)
      ON CONFLICT (slug) DO NOTHING
    `);

    // ═══ 6. 건강기능식품 하위 추가 (depth 1) ═══
    await queryRunner.query(`
      INSERT INTO product_categories (id, name, slug, parent_id, depth, sort_order, is_active, is_regulated)
      VALUES
        (gen_random_uuid(), '콜라겐/미용',   'hf-collagen', (SELECT id FROM product_categories WHERE slug = 'health-functional' LIMIT 1), 1, 5, true, true),
        (gen_random_uuid(), '기타 건강식품', 'hf-etc',      (SELECT id FROM product_categories WHERE slug = 'health-functional' LIMIT 1), 1, 6, true, true)
      ON CONFLICT (slug) DO NOTHING
    `);

    // ═══ 7. 기존 매핑 규칙 카테고리 재배치 ═══
    // 소독: quasi-drug → ms-hygiene
    await queryRunner.query(`
      UPDATE category_mapping_rules SET category_id = (SELECT id FROM product_categories WHERE slug = 'ms-hygiene' LIMIT 1)
      WHERE keyword = '소독' AND (SELECT id FROM product_categories WHERE slug = 'ms-hygiene' LIMIT 1) IS NOT NULL
    `);
    // 마스크: quasi-drug → ms-hygiene
    await queryRunner.query(`
      UPDATE category_mapping_rules SET category_id = (SELECT id FROM product_categories WHERE slug = 'ms-hygiene' LIMIT 1)
      WHERE keyword = '마스크' AND (SELECT id FROM product_categories WHERE slug = 'ms-hygiene' LIMIT 1) IS NOT NULL
    `);
    // 크림, 세럼, 로션: cosmetics → cos-basic
    await queryRunner.query(`
      UPDATE category_mapping_rules SET category_id = (SELECT id FROM product_categories WHERE slug = 'cos-basic' LIMIT 1)
      WHERE keyword IN ('크림', '세럼', '로션') AND (SELECT id FROM product_categories WHERE slug = 'cos-basic' LIMIT 1) IS NOT NULL
    `);
    // 선크림: cosmetics → cos-functional
    await queryRunner.query(`
      UPDATE category_mapping_rules SET category_id = (SELECT id FROM product_categories WHERE slug = 'cos-functional' LIMIT 1)
      WHERE keyword = '선크림' AND (SELECT id FROM product_categories WHERE slug = 'cos-functional' LIMIT 1) IS NOT NULL
    `);
    // 치약: quasi-drug → gl-personal-hygiene
    await queryRunner.query(`
      UPDATE category_mapping_rules SET category_id = (SELECT id FROM product_categories WHERE slug = 'gl-personal-hygiene' LIMIT 1)
      WHERE keyword = '치약' AND (SELECT id FROM product_categories WHERE slug = 'gl-personal-hygiene' LIMIT 1) IS NOT NULL
    `);

    // ═══ 8. 신규 매핑 규칙 추가 ═══
    await queryRunner.query(`
      INSERT INTO category_mapping_rules (keyword, category_id, priority, is_active)
      SELECT keyword, cat_id, priority, true
      FROM (VALUES
        -- 건강기기 > 혈당관리
        ('혈당',       (SELECT id FROM product_categories WHERE slug = 'hd-glucose' LIMIT 1), 10),
        ('cgm',        (SELECT id FROM product_categories WHERE slug = 'hd-glucose' LIMIT 1), 10),
        ('혈당측정',   (SELECT id FROM product_categories WHERE slug = 'hd-glucose' LIMIT 1), 10),
        ('채혈',       (SELECT id FROM product_categories WHERE slug = 'hd-glucose' LIMIT 1), 8),
        ('스트립',     (SELECT id FROM product_categories WHERE slug = 'hd-glucose' LIMIT 1), 8),
        -- 건강기기 > 체온관리
        ('체온',       (SELECT id FROM product_categories WHERE slug = 'hd-temperature' LIMIT 1), 10),
        ('체온계',     (SELECT id FROM product_categories WHERE slug = 'hd-temperature' LIMIT 1), 10),
        -- 건강기기 > 혈압관리
        ('혈압',       (SELECT id FROM product_categories WHERE slug = 'hd-blood-pressure' LIMIT 1), 10),
        ('혈압계',     (SELECT id FROM product_categories WHERE slug = 'hd-blood-pressure' LIMIT 1), 10),
        -- 의료소모품 > 주사/인슐린
        ('펜니들',     (SELECT id FROM product_categories WHERE slug = 'ms-injection' LIMIT 1), 10),
        ('주사기',     (SELECT id FROM product_categories WHERE slug = 'ms-injection' LIMIT 1), 10),
        ('인슐린',     (SELECT id FROM product_categories WHERE slug = 'ms-injection' LIMIT 1), 8),
        -- 의료소모품 > 위생/방역
        ('장갑',       (SELECT id FROM product_categories WHERE slug = 'ms-hygiene' LIMIT 1), 5),
        ('알코올',     (SELECT id FROM product_categories WHERE slug = 'ms-hygiene' LIMIT 1), 5),
        -- 화장품 > 기초
        ('에센스',     (SELECT id FROM product_categories WHERE slug = 'cos-basic' LIMIT 1), 5),
        ('앰플',       (SELECT id FROM product_categories WHERE slug = 'cos-basic' LIMIT 1), 5),
        ('클렌징',     (SELECT id FROM product_categories WHERE slug = 'cos-basic' LIMIT 1), 3),
        ('미스트',     (SELECT id FROM product_categories WHERE slug = 'cos-basic' LIMIT 1), 3),
        ('토너',       (SELECT id FROM product_categories WHERE slug = 'cos-basic' LIMIT 1), 5),
        ('스킨',       (SELECT id FROM product_categories WHERE slug = 'cos-basic' LIMIT 1), 3),
        -- 화장품 > 색조
        ('립',         (SELECT id FROM product_categories WHERE slug = 'cos-color' LIMIT 1), 5),
        -- 화장품 > 기능성
        ('더마',       (SELECT id FROM product_categories WHERE slug = 'cos-functional' LIMIT 1), 7),
        -- 생활용품 > 개인위생
        ('칫솔',       (SELECT id FROM product_categories WHERE slug = 'gl-personal-hygiene' LIMIT 1), 5),
        ('가글',       (SELECT id FROM product_categories WHERE slug = 'gl-personal-hygiene' LIMIT 1), 5),
        ('구강',       (SELECT id FROM product_categories WHERE slug = 'gl-personal-hygiene' LIMIT 1), 5),
        -- 건강기능식품 > 콜라겐/미용
        ('콜라겐',     (SELECT id FROM product_categories WHERE slug = 'hf-collagen' LIMIT 1), 10),
        -- 건강기능식품 > 기타
        ('글루코사민', (SELECT id FROM product_categories WHERE slug = 'hf-etc' LIMIT 1), 8),
        ('밀크씨슬',   (SELECT id FROM product_categories WHERE slug = 'hf-etc' LIMIT 1), 8),
        ('코엔자임',   (SELECT id FROM product_categories WHERE slug = 'hf-etc' LIMIT 1), 8),
        ('프로폴리스', (SELECT id FROM product_categories WHERE slug = 'hf-etc' LIMIT 1), 8),
        ('루테인',     (SELECT id FROM product_categories WHERE slug = 'hf-etc' LIMIT 1), 8),
        ('식이섬유',   (SELECT id FROM product_categories WHERE slug = 'hf-etc' LIMIT 1), 5),
        -- 건강기능식품 > 비타민/미네랄 (추가 키워드)
        ('엽산',       (SELECT id FROM product_categories WHERE slug = 'hf-vitamin-mineral' LIMIT 1), 8),
        ('철분',       (SELECT id FROM product_categories WHERE slug = 'hf-vitamin-mineral' LIMIT 1), 8),
        ('칼슘',       (SELECT id FROM product_categories WHERE slug = 'hf-vitamin-mineral' LIMIT 1), 8),
        ('마그네슘',   (SELECT id FROM product_categories WHERE slug = 'hf-vitamin-mineral' LIMIT 1), 8),
        ('아연',       (SELECT id FROM product_categories WHERE slug = 'hf-vitamin-mineral' LIMIT 1), 8),
        ('영양제',     (SELECT id FROM product_categories WHERE slug = 'hf-vitamin-mineral' LIMIT 1), 3)
      ) AS t(keyword, cat_id, priority)
      WHERE cat_id IS NOT NULL
      ON CONFLICT (keyword) DO NOTHING
    `);

    // Log result
    const catCount = await queryRunner.query(`SELECT COUNT(*)::int as cnt FROM product_categories`);
    const ruleCount = await queryRunner.query(`SELECT COUNT(*)::int as cnt FROM category_mapping_rules WHERE is_active = true`);
    console.log(`[Migration] Category tree expanded: ${catCount[0]?.cnt ?? 0} categories, ${ruleCount[0]?.cnt ?? 0} active rules`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove new mapping rules (by keyword)
    await queryRunner.query(`
      DELETE FROM category_mapping_rules WHERE keyword IN (
        '혈당', 'cgm', '혈당측정', '채혈', '스트립',
        '체온', '체온계', '혈압', '혈압계',
        '펜니들', '주사기', '인슐린', '장갑', '알코올',
        '에센스', '앰플', '클렌징', '미스트', '토너', '스킨',
        '립', '더마',
        '칫솔', '가글', '구강',
        '콜라겐', '글루코사민', '밀크씨슬', '코엔자임', '프로폴리스', '루테인', '식이섬유',
        '엽산', '철분', '칼슘', '마그네슘', '아연', '영양제'
      )
    `);

    // Revert existing rules to original categories
    await queryRunner.query(`
      UPDATE category_mapping_rules SET category_id = (SELECT id FROM product_categories WHERE slug = 'quasi-drug' LIMIT 1)
      WHERE keyword IN ('소독', '마스크', '치약') AND (SELECT id FROM product_categories WHERE slug = 'quasi-drug' LIMIT 1) IS NOT NULL
    `);
    await queryRunner.query(`
      UPDATE category_mapping_rules SET category_id = (SELECT id FROM product_categories WHERE slug = 'cosmetics' LIMIT 1)
      WHERE keyword IN ('크림', '세럼', '로션', '선크림') AND (SELECT id FROM product_categories WHERE slug = 'cosmetics' LIMIT 1) IS NOT NULL
    `);

    // Remove new subcategories (depth 2 first, then depth 1, then depth 0)
    await queryRunner.query(`
      DELETE FROM product_categories WHERE slug IN (
        'gl-personal-hygiene', 'gl-household'
      )
    `);
    await queryRunner.query(`
      DELETE FROM product_categories WHERE slug IN (
        'hd-glucose', 'hd-temperature', 'hd-blood-pressure', 'hd-etc',
        'ms-injection', 'ms-hygiene', 'ms-etc',
        'cos-basic', 'cos-color', 'cos-functional',
        'hf-collagen', 'hf-etc'
      )
    `);
    await queryRunner.query(`
      DELETE FROM product_categories WHERE slug IN (
        'health-device', 'medical-supply'
      )
    `);
  }
}
