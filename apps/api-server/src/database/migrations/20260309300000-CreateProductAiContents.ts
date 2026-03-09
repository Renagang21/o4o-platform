import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * IR-O4O-AI-CONTENT-ENGINE-IMPLEMENTATION-V1
 *
 * product_ai_contents 테이블 생성.
 * Product Master 기반 AI 생성 콘텐츠 저장.
 */
export class CreateProductAiContents1709309300000 implements MigrationInterface {
  name = 'CreateProductAiContents20260309300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_ai_contents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        content_type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        model VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_ai_contents_product"
        ON product_ai_contents (product_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_ai_contents_type"
        ON product_ai_contents (product_id, content_type)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_ai_contents_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_ai_contents_product"`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_ai_contents`);
  }
}
