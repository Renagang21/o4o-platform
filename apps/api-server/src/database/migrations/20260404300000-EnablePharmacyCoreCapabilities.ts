import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-PHARMACY-HUB-NAVIGATION-RESTRUCTURE-V1 Step 10
 *
 * 기존 매장의 LIBRARY, SIGNAGE, BLOG, LOCAL_PRODUCTS capability를 활성화.
 * source='system'인 레코드만 대상 (관리자 수동 변경 존중).
 *
 * registry.ts에서 defaultEnabled=true로 변경했으므로
 * 신규 매장은 자동 활성화. 이 마이그레이션은 기존 매장 대상.
 */
export class EnablePharmacyCoreCapabilities20260404300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const result = await queryRunner.query(`
      UPDATE store_capabilities
      SET enabled = true, updated_at = now()
      WHERE capability_key IN ('LIBRARY', 'SIGNAGE', 'BLOG', 'LOCAL_PRODUCTS')
        AND enabled = false
        AND source = 'system'
    `);

    const affected = Array.isArray(result) ? result.length : (result?.rowCount ?? result?.[1] ?? 0);
    console.log(`[EnablePharmacyCoreCapabilities] Updated ${affected} rows`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE store_capabilities
      SET enabled = false, updated_at = now()
      WHERE capability_key IN ('LIBRARY', 'SIGNAGE', 'BLOG', 'LOCAL_PRODUCTS')
        AND enabled = true
        AND source = 'system'
    `);
  }
}
