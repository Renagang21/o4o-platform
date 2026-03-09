import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PRODUCT-AI-TAGGING-V1
 *
 * product_ai_tags — 상품별 AI 생성/수동 태그 (개별 행, confidence/source 메타데이터)
 */
export class CreateProductAiTags1709309200000 implements MigrationInterface {
  name = 'CreateProductAiTags20260309200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_ai_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        tag VARCHAR(100) NOT NULL,
        confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
        source VARCHAR(20) NOT NULL DEFAULT 'ai',
        model VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_ai_tags_product
      ON product_ai_tags (product_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_ai_tags_tag
      ON product_ai_tags (tag)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS product_ai_tags`);
  }
}
