import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitializeDropshippingCPTs1758897000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Initialize dropshipping CPTs
    await queryRunner.query(`
      INSERT INTO custom_post_types (id, slug, name, description, icon, active, public, has_archive, show_in_menu, supports, taxonomies, menu_position, capability_type, rewrite, created_at, updated_at)
      VALUES 
      (gen_random_uuid(), 'ds_supplier', '공급자', '드롭쉬핑 상품 공급자', 'store', true, false, false, true, '["title","editor","custom-fields","revisions"]', '[]', 25, 'post', '{"slug":"ds-supplier"}', NOW(), NOW()),
      (gen_random_uuid(), 'ds_partner', '파트너', '드롭쉬핑 제휴 파트너', 'groups', true, false, false, true, '["title","editor","custom-fields","revisions","thumbnail"]', '[]', 26, 'post', '{"slug":"ds-partner"}', NOW(), NOW()),
      (gen_random_uuid(), 'ds_product', '드롭쉬핑 상품', '드롭쉬핑 플랫폼 상품', 'cart', true, true, true, true, '["title","editor","custom-fields","revisions","thumbnail","excerpt"]', '["ds_product_category","ds_product_tag"]', 24, 'post', '{"slug":"ds-products"}', NOW(), NOW()),
      (gen_random_uuid(), 'ds_commission_policy', '수수료 정책', '드롭쉬핑 수수료 정책', 'money-alt', true, false, false, true, '["title","editor","custom-fields","revisions"]', '[]', 27, 'post', '{"slug":"ds-commission-policy"}', NOW(), NOW())
      ON CONFLICT (slug) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM custom_post_types 
      WHERE slug IN ('ds_supplier', 'ds_partner', 'ds_product', 'ds_commission_policy')
    `);
  }
}