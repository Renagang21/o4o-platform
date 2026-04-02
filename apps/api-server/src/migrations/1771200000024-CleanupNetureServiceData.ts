import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-NETURE-LEGACY-NETURE-SERVICE-SELECTION-DATA-CLEANUP-V1
 *
 * 정책 변경: neture는 서비스 신청/승인 대상이 아님.
 * 기존 데이터에서 neture 서비스 흔적을 정비한다.
 *
 * 1. offer_service_approvals에서 service_key='neture' 레코드 삭제
 * 2. supplier_product_offers.service_keys에서 'neture' 제거
 */
export class CleanupNetureServiceData1771200000024 implements MigrationInterface {
  name = 'CleanupNetureServiceData1771200000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: offer_service_approvals에서 neture 승인 레코드 삭제
    const deleted = await queryRunner.query(
      `DELETE FROM offer_service_approvals WHERE service_key = 'neture'`,
    );
    console.log(`[CleanupNetureServiceData] Deleted ${deleted?.[1] ?? 0} neture approval records`);

    // Step 2: supplier_product_offers.service_keys에서 'neture' 제거
    const updated = await queryRunner.query(
      `UPDATE supplier_product_offers
       SET service_keys = array_remove(service_keys, 'neture'),
           updated_at = NOW()
       WHERE 'neture' = ANY(service_keys)`,
    );
    console.log(`[CleanupNetureServiceData] Updated ${updated?.[1] ?? 0} offers to remove neture from service_keys`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 되돌리지 않음 — 정책 변경에 따른 정비
    console.log('[CleanupNetureServiceData] down: no-op (policy change)');
  }
}
