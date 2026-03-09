import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PRODUCT-AI-CONTENT-PIPELINE-V1
 *
 * product_ocr_texts 테이블 생성.
 * Product Image → Google Vision API → OCR Text 저장.
 */
export class CreateProductOcrTexts1709309400000 implements MigrationInterface {
  name = 'CreateProductOcrTexts20260309400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_ocr_texts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        image_id UUID,
        ocr_text TEXT,
        confidence NUMERIC(3,2) DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_ocr_texts_product"
        ON product_ocr_texts (product_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_ocr_texts_product"`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_ocr_texts`);
  }
}
