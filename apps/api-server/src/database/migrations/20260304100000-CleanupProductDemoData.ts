import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-STORE-LIBRARY-EDIT-V1: 상품 데모 데이터 정리
 *
 * 삭제 대상:
 * 1. seed-demo.controller.ts가 생성한 데모 데이터 (UUID d0000000-de*)
 *    - checkout_orders, glycopharm_products, care_coaching_sessions,
 *      care_kpi_snapshots, glucoseview_customers, pharmacies, organizations
 * 2. seed-sample-products.ts가 생성한 데이터
 *    - glycopharm_products (supplier: 메디팜코리아, 헬스앤뉴트리션, 더마케어코스메틱, 라이프헬스케어, 이노베이션랩)
 *    - neture.neture_products (같은 공급사)
 *    - cosmetics.cosmetics_products (같은 공급사)
 *
 * 안전 장치: WHERE 조건으로 데모 데이터만 타겟팅
 */
export class CleanupProductDemoData1709560000000 implements MigrationInterface {
  name = 'CleanupProductDemoData1709560000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ──────────────────────────────────────
    // 1. seed-demo.controller 데모 데이터 삭제
    //    UUID 패턴: d0000000-de0X-4000-*
    // ──────────────────────────────────────

    // 1a. checkout_orders (depends on glycopharm_products)
    await queryRunner.query(`
      DELETE FROM checkout_orders
      WHERE id::text LIKE 'd0000000-de05-4000-%'
    `).catch(() => { /* table may not exist */ });

    // 1b. care_coaching_sessions
    await queryRunner.query(`
      DELETE FROM care_coaching_sessions
      WHERE id::text LIKE 'd0000000-de06-4000-%'
    `).catch(() => { /* table may not exist */ });

    // 1c. care_kpi_snapshots
    await queryRunner.query(`
      DELETE FROM care_kpi_snapshots
      WHERE id::text LIKE 'd0000000-de07-4000-%'
    `).catch(() => { /* table may not exist */ });

    // 1d. glycopharm_products (demo)
    await queryRunner.query(`
      DELETE FROM glycopharm_products
      WHERE id::text LIKE 'd0000000-de04-4000-%'
    `).catch(() => { /* table may not exist */ });

    // 1e. glucoseview_customers (demo patients)
    await queryRunner.query(`
      DELETE FROM glucoseview_customers
      WHERE id::text LIKE 'd0000000-de03-4000-%'
    `).catch(() => { /* table may not exist */ });

    // 1f. pharmacies (demo)
    await queryRunner.query(`
      DELETE FROM pharmacies
      WHERE id::text LIKE 'd0000000-de01-4000-%'
    `).catch(() => { /* table may not exist */ });

    // 1g. organizations (demo) — [DEMO] prefix
    await queryRunner.query(`
      DELETE FROM organizations
      WHERE name LIKE '[DEMO]%'
        AND id::text LIKE 'd0000000-de01-4000-%'
    `).catch(() => { /* table may not exist */ });

    // ──────────────────────────────────────
    // 2. seed-sample-products 시드 데이터 삭제
    //    공급사명으로 타겟팅
    // ──────────────────────────────────────

    const seedSuppliers = [
      '메디팜코리아',
      '헬스앤뉴트리션',
      '더마케어코스메틱',
      '라이프헬스케어',
      '이노베이션랩',
    ];
    const supplierList = seedSuppliers.map(s => `'${s}'`).join(',');

    // 2a. glycopharm_products (seeded)
    await queryRunner.query(`
      DELETE FROM glycopharm_products
      WHERE supplier_name IN (${supplierList})
    `).catch(() => { /* table may not exist or column missing */ });

    // 2b. neture.neture_products (seeded)
    await queryRunner.query(`
      DELETE FROM neture.neture_products
      WHERE supplier_name IN (${supplierList})
    `).catch(() => { /* schema/table may not exist */ });

    // 2c. cosmetics.cosmetics_products (seeded)
    await queryRunner.query(`
      DELETE FROM cosmetics.cosmetics_products
      WHERE brand_id IN (
        SELECT id FROM cosmetics.cosmetics_brands
        WHERE name IN (${supplierList})
      )
    `).catch(() => { /* schema/table may not exist */ });

    // 2d. cosmetics.cosmetics_brands (seeded)
    await queryRunner.query(`
      DELETE FROM cosmetics.cosmetics_brands
      WHERE name IN (${supplierList})
    `).catch(() => { /* schema/table may not exist */ });
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // 데모 데이터 복원 불필요 — 시드 스크립트 자체를 삭제함
  }
}
