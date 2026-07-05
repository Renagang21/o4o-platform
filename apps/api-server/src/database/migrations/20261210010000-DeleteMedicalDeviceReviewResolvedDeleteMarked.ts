import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-MEDICAL-DEVICE-REVIEW-REQUIRED-712-MARKET-EVIDENCE-RESOLUTION-V1 (2/2 — 일괄 삭제)
 *
 * 1/2 migration 에서 시장성 조사 결과 delete_marked
 * (reason=medical_device_review_professional_delete_marked)로 표시된 의료기기 master 만 hard delete.
 * active / review_required 는 삭제 대상 제외. (실측 삭제 대상 11건 / 8 카테고리)
 *
 * snapshot(cleanup_key=medical_device_review_required_resolved_hard_delete_20260705) → 방어적 자식
 * 정리 → hard delete. CASCADE/SET NULL 자식 자동, idx_pc_matched_identifier_id 가속.
 * 락: DML 전용 — ROW EXCLUSIVE. 롤백: hard delete 복구 불가(감사 로그 추적).
 */
export class DeleteMedicalDeviceReviewResolvedDeleteMarked20261210010000
  implements MigrationInterface
{
  name = 'DeleteMedicalDeviceReviewResolvedDeleteMarked20261210010000';

  private readonly CLEANUP_KEY = 'medical_device_review_required_resolved_hard_delete_20260705';

  private readonly TARGET = `
    pm.product_data_status = 'delete_marked'
    AND pm.product_data_curation_reason = 'medical_device_review_professional_delete_marked'
    AND (
      pm.mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'
      OR pm.regulatory_type IN ('MEDICAL_DEVICE', 'medical_device', '의료기기')
    )
  `;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO product_master_cleanup_audits (
        cleanup_key, action, product_master_id, regulatory_type,
        mfds_product_id, barcode, name, medical_device_grade, snapshot
      )
      SELECT
        '${this.CLEANUP_KEY}', 'hard_delete',
        pm.id, pm.regulatory_type, pm.mfds_product_id, pm.barcode, pm.name,
        pm.medical_device_grade, to_jsonb(pm.*)
      FROM product_masters pm
      WHERE ${this.TARGET}
        AND NOT EXISTS (
          SELECT 1 FROM product_master_cleanup_audits a
          WHERE a.product_master_id = pm.id
            AND a.cleanup_key = '${this.CLEANUP_KEY}'
            AND a.action = 'hard_delete'
        )
    `);

    const targetIds = `SELECT pm.id FROM product_masters pm WHERE ${this.TARGET}`;
    await queryRunner.query(
      `DELETE FROM supplier_product_offers WHERE master_id IN (${targetIds})`,
    );
    await queryRunner.query(
      `DELETE FROM organization_product_listings WHERE master_id IN (${targetIds})`,
    );
    await queryRunner.query(
      `DELETE FROM service_products WHERE master_id IN (${targetIds})`,
    );

    await queryRunner.query(`DELETE FROM product_masters pm WHERE ${this.TARGET}`);
  }

  public async down(): Promise<void> {
    // hard delete 는 복구 불가. product_master_cleanup_audits 로 추적.
  }
}
