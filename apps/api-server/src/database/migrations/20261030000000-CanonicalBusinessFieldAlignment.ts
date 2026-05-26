import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-BUSINESS-REGISTRATION-FIELD-NAMING-STANDARD-V1
 *
 * 사업자등록 Canonical 필드 정렬:
 *   1. neture_suppliers.tax_email → tax_invoice_email (rename)
 *   2. neture_suppliers: business_item 컬럼 추가 (종목)
 *   3. users.businessInfo JSONB 백필:
 *      - ceoName → representativeName
 *      - address → businessAddress / address2 → businessAddressDetail
 *      - businessCategory → businessItem
 */
export class CanonicalBusinessFieldAlignment20261030000000 implements MigrationInterface {
  name = 'CanonicalBusinessFieldAlignment20261030000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. neture_suppliers: tax_email → tax_invoice_email
    await queryRunner.query(
      `ALTER TABLE neture_suppliers RENAME COLUMN tax_email TO tax_invoice_email`,
    );

    // 2. neture_suppliers: business_item 컬럼 추가
    await queryRunner.query(
      `ALTER TABLE neture_suppliers ADD COLUMN IF NOT EXISTS business_item VARCHAR(100) NULL`,
    );

    // 3. users.businessInfo JSONB 백필 — ceoName → representativeName
    await queryRunner.query(`
      UPDATE users
      SET "businessInfo" = jsonb_set(
        "businessInfo",
        '{representativeName}',
        to_jsonb("businessInfo"->>'ceoName'),
        true
      )
      WHERE "businessInfo" IS NOT NULL
        AND "businessInfo"->>'ceoName' IS NOT NULL
        AND ("businessInfo"->>'representativeName' IS NULL OR "businessInfo"->>'representativeName' = '')
    `);

    // 4. users.businessInfo JSONB 백필 — address → businessAddress
    await queryRunner.query(`
      UPDATE users
      SET "businessInfo" = jsonb_set(
        "businessInfo",
        '{businessAddress}',
        to_jsonb("businessInfo"->>'address'),
        true
      )
      WHERE "businessInfo" IS NOT NULL
        AND "businessInfo"->>'address' IS NOT NULL
        AND ("businessInfo"->>'businessAddress' IS NULL OR "businessInfo"->>'businessAddress' = '')
    `);

    // 5. users.businessInfo JSONB 백필 — address2 → businessAddressDetail
    await queryRunner.query(`
      UPDATE users
      SET "businessInfo" = jsonb_set(
        "businessInfo",
        '{businessAddressDetail}',
        to_jsonb("businessInfo"->>'address2'),
        true
      )
      WHERE "businessInfo" IS NOT NULL
        AND "businessInfo"->>'address2' IS NOT NULL
        AND ("businessInfo"->>'businessAddressDetail' IS NULL OR "businessInfo"->>'businessAddressDetail' = '')
    `);

    // 6. users.businessInfo JSONB 백필 — businessCategory → businessItem
    await queryRunner.query(`
      UPDATE users
      SET "businessInfo" = jsonb_set(
        "businessInfo",
        '{businessItem}',
        to_jsonb("businessInfo"->>'businessCategory'),
        true
      )
      WHERE "businessInfo" IS NOT NULL
        AND "businessInfo"->>'businessCategory' IS NOT NULL
        AND ("businessInfo"->>'businessItem' IS NULL OR "businessInfo"->>'businessItem' = '')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // JSONB 백필은 되돌리지 않음 (추가 키는 무해)
    await queryRunner.query(
      `ALTER TABLE neture_suppliers DROP COLUMN IF EXISTS business_item`,
    );
    await queryRunner.query(
      `ALTER TABLE neture_suppliers RENAME COLUMN tax_invoice_email TO tax_email`,
    );
  }
}
