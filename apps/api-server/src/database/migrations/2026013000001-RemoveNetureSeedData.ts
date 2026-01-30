/**
 * Migration: Remove Neture mock/seed data
 *
 * Removes all seed data inserted by SeedNetureData1737100300000:
 * - 3 mock suppliers (farmfresh-korea, health-plus, daily-essentials) and their products
 * - 3 mock partnership requests and their products
 * - 3 mock CMS contents (serviceKey: 'neture')
 *
 * These were test/demo data with picsum.photos placeholder images.
 * Real supplier data will be registered through the admin workflow.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveNetureSeedData2026013000001 implements MigrationInterface {
  name = 'RemoveNetureSeedData2026013000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Remove mock supplier products (child records first)
    const mockSlugs = ['farmfresh-korea', 'health-plus', 'daily-essentials'];

    for (const slug of mockSlugs) {
      const supplier = await queryRunner.query(
        `SELECT id FROM neture_suppliers WHERE slug = $1`,
        [slug]
      );

      if (supplier.length > 0) {
        const supplierId = supplier[0].id;

        // Delete supplier products
        await queryRunner.query(
          `DELETE FROM neture_supplier_products WHERE supplier_id = $1`,
          [supplierId]
        );

        // Delete supplier requests and their events
        const requests = await queryRunner.query(
          `SELECT id FROM neture_supplier_requests WHERE supplier_id = $1`,
          [supplierId]
        );
        for (const req of requests) {
          await queryRunner.query(
            `DELETE FROM neture_supplier_request_events WHERE request_id = $1`,
            [req.id]
          );
        }
        await queryRunner.query(
          `DELETE FROM neture_supplier_requests WHERE supplier_id = $1`,
          [supplierId]
        );

        // Delete supplier contents
        await queryRunner.query(
          `DELETE FROM neture_supplier_contents WHERE supplier_id = $1`,
          [supplierId]
        );

        // Delete the supplier itself
        await queryRunner.query(
          `DELETE FROM neture_suppliers WHERE id = $1`,
          [supplierId]
        );

        console.log(`[RemoveNetureSeedData] Removed mock supplier: ${slug}`);
      }
    }

    // 2. Remove mock partnership requests
    const mockSellerIds = ['seller-glycopharm-001', 'seller-kcosmetics-001', 'seller-pharmacy-001'];

    for (const sellerId of mockSellerIds) {
      // Delete partnership products first
      const requests = await queryRunner.query(
        `SELECT id FROM neture_partnership_requests WHERE seller_id = $1`,
        [sellerId]
      );

      for (const req of requests) {
        await queryRunner.query(
          `DELETE FROM neture_partnership_products WHERE partnership_request_id = $1`,
          [req.id]
        );
      }

      // Delete partnership requests
      await queryRunner.query(
        `DELETE FROM neture_partnership_requests WHERE seller_id = $1`,
        [sellerId]
      );

      console.log(`[RemoveNetureSeedData] Removed mock partnership requests for: ${sellerId}`);
    }

    // 3. Remove mock CMS contents for neture
    // Only remove the 3 specific seed entries by title
    const seedTitles = [
      '네뚜레 플랫폼 오픈 안내',
      '공급자 등록 가이드',
      '파트너십 신청 안내',
    ];

    for (const title of seedTitles) {
      await queryRunner.query(
        `DELETE FROM cms_contents WHERE "serviceKey" = 'neture' AND title = $1`,
        [title]
      );
    }

    console.log('[RemoveNetureSeedData] Removed mock CMS contents');
    console.log('');
    console.log('=== Neture Mock Data Removal Complete ===');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Seed data is not re-inserted on rollback.
    // Use the original SeedNetureData migration if needed.
    console.log('[RemoveNetureSeedData] Rollback: seed data not re-inserted');
  }
}
