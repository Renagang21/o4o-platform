/**
 * CreateProductMarketingAssets
 *
 * WO-O4O-PRODUCT-MARKETING-GRAPH-V1
 *
 * 상품 ↔ 마케팅 자산(QR, POP, Library, Signage) 연결 테이블.
 * Display Domain — Commerce Object 아님.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductMarketingAssets20260304200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_marketing_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        product_id UUID NOT NULL,
        asset_type VARCHAR(50) NOT NULL,
        asset_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pma_org_product"
        ON product_marketing_assets (organization_id, product_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pma_org_asset"
        ON product_marketing_assets (organization_id, asset_type, asset_id);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_pma_product_asset"
        ON product_marketing_assets (product_id, asset_type, asset_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS product_marketing_assets;`);
  }
}
