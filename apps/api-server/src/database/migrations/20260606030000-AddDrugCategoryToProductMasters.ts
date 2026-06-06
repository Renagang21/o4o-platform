import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-PRODUCT-DRUG-CATEGORY-ACTIVE-MODEL-F1-V1 (additive)
 * Baseline: docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md §9
 *
 * product_masters 에 drug_category(varchar nullable) 추가.
 * regulatoryType 이 'DRUG'까지만 구분하는 한계를 보완해 OTC/Rx/QUASI 를 런타임 판정.
 *
 * 불변 보장:
 *   - regulatory_type / barcode 등 기존 컬럼 변경하지 않음 (drug_category 만 추가)
 *
 * 백필 (보수적 — OTC/Rx 임의 추정 금지):
 *   - regulatory_type ∈ {DRUG, 의약품}        → 'drug_unspecified'  (OTC/Rx 미확정)
 *   - regulatory_type ∈ {QUASI_DRUG, 의약외품} → 'quasi_drug'
 *   - 그 외(비의약품)                          → NULL (기존 데이터 변경 최소화)
 *   - 이미 drug_category 가 있으면 건드리지 않음
 */
export class AddDrugCategoryToProductMasters20260606030000 implements MigrationInterface {
  name = 'AddDrugCategoryToProductMasters20260606030000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_masters
        ADD COLUMN IF NOT EXISTS drug_category VARCHAR(32)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_masters_drug_category
        ON product_masters (drug_category)
    `);

    // 보수적 백필 — DRUG 은 drug_unspecified, QUASI 는 quasi_drug, 나머지는 NULL 유지
    await queryRunner.query(`
      UPDATE product_masters
        SET drug_category = 'drug_unspecified'
        WHERE drug_category IS NULL
          AND regulatory_type IN ('DRUG', '의약품')
    `);
    await queryRunner.query(`
      UPDATE product_masters
        SET drug_category = 'quasi_drug'
        WHERE drug_category IS NULL
          AND regulatory_type IN ('QUASI_DRUG', '의약외품')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_product_masters_drug_category`);
    await queryRunner.query(`ALTER TABLE product_masters DROP COLUMN IF EXISTS drug_category`);
  }
}
