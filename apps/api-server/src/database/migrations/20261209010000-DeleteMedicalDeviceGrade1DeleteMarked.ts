import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-MEDICAL-DEVICE-GRADE1-CONSUMER-VS-PROFESSIONAL-CATEGORY-AUDIT-AND-CLEANUP-V1 (2/2 — 일괄 삭제)
 *
 * 1/2 migration 에서 delete_marked(reason=...grade1_professional_category_delete_marked)로 표시된
 * 1등급 의료기기 master 만 hard delete. review_required / active 는 삭제 대상에서 제외.
 *
 * 하는 것: snapshot(cleanup_key=medical_device_grade1_category_based_hard_delete_20260705) →
 *   RESTRICT/NO ACTION FK 자식 방어적 정리 → hard delete.
 *   CASCADE/SET NULL 자식 자동, idx_pc_matched_identifier_id 로 캐스케이드 가속.
 *
 * 락: DML 전용 — ROW EXCLUSIVE. 롤백: hard delete 복구 불가(감사 로그 추적).
 */
export class DeleteMedicalDeviceGrade1DeleteMarked20261209010000 implements MigrationInterface {
  name = 'DeleteMedicalDeviceGrade1DeleteMarked20261209010000';

  private readonly CLEANUP_KEY = 'medical_device_grade1_category_based_hard_delete_20260705';

  private readonly TARGET = `
    pm.medical_device_grade = '1'
    AND pm.product_data_status = 'delete_marked'
    AND pm.product_data_curation_reason = 'medical_device_grade1_professional_category_delete_marked'
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
