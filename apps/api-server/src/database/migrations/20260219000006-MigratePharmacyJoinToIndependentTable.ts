import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-A-PHARMACY-REQUEST-STRUCTURE-REALIGN-V1 — Phase 4: Data Cleanup
 *
 * 1. pharmacy_join 레코드를 kpa_organization_join_requests → kpa_pharmacy_requests로 이관
 * 2. pharmacy_join으로 생성된 OrganizationMember 오염 데이터 정리
 * 3. 원본 pharmacy_join 레코드를 kpa_organization_join_requests에서 삭제
 */
export class MigratePharmacyJoinToIndependentTable20260219000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guard: kpa_pharmacy_requests 테이블이 존재하는지 확인
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'kpa_pharmacy_requests'
      )
    `);
    if (!tableExists[0]?.exists) {
      console.log('[Migration] kpa_pharmacy_requests table does not exist, skipping');
      return;
    }

    // Step 1: pharmacy_join 레코드를 새 테이블로 이관
    const existing = await queryRunner.query(`
      SELECT id, user_id, payload, status, reviewed_by, reviewed_at, review_note, created_at, updated_at
      FROM kpa_organization_join_requests
      WHERE request_type = 'pharmacy_join'
    `);

    console.log(`[Migration] Found ${existing.length} pharmacy_join records to migrate`);

    for (const row of existing) {
      // 이미 이관된 건이 있으면 skip
      const [alreadyMigrated] = await queryRunner.query(
        `SELECT 1 FROM kpa_pharmacy_requests WHERE user_id = $1 AND created_at = $2`,
        [row.user_id, row.created_at]
      );
      if (alreadyMigrated) continue;

      const payload = row.payload || {};
      await queryRunner.query(
        `INSERT INTO kpa_pharmacy_requests
          (user_id, pharmacy_name, business_number, pharmacy_phone, owner_phone, tax_invoice_email, payload, status, review_note, approved_by, approved_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          row.user_id,
          payload.pharmacyName || '미입력',
          payload.businessRegistrationNumber || '0000000000',
          payload.pharmacyPhone || null,
          payload.ownerPhone || null,
          payload.taxInvoiceEmail || null,
          row.payload ? JSON.stringify(row.payload) : null,
          row.status,
          row.review_note,
          row.reviewed_by,
          row.reviewed_at,
          row.created_at,
          row.updated_at,
        ]
      );
    }

    console.log(`[Migration] Migrated pharmacy_join records to kpa_pharmacy_requests`);

    // Step 2: pharmacy_join으로 인한 OrganizationMember 오염 정리
    // 대한약사회 UUID로 생성된 pharmacy_join 관련 멤버십 삭제
    const deleted = await queryRunner.query(`
      DELETE FROM organization_members
      WHERE organization_id = 'a0000000-0a00-4000-a000-000000000001'
        AND user_id IN (
          SELECT user_id FROM kpa_organization_join_requests
          WHERE request_type = 'pharmacy_join'
        )
    `);
    console.log(`[Migration] Cleaned up OrganizationMember contamination: ${deleted[1] || 0} rows`);

    // Step 3: 원본 pharmacy_join 레코드 삭제
    const removedJoinRequests = await queryRunner.query(`
      DELETE FROM kpa_organization_join_requests
      WHERE request_type = 'pharmacy_join'
    `);
    console.log(`[Migration] Removed pharmacy_join from kpa_organization_join_requests: ${removedJoinRequests[1] || 0} rows`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse migration is not supported — data has been cleaned up
    console.log('[Migration] Reverse migration not supported for data cleanup');
  }
}
