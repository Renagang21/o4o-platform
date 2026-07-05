import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-MEDICAL-DEVICE-GRADE2-CONSUMER-VS-PROFESSIONAL-CATEGORY-DELETE-MARK-AND-BULK-DELETE-V1 (2/2 — 일괄 삭제)
 *
 * 1/2 migration 에서 delete_marked(reason=...professional_category_delete_marked)로 표시된
 * 2등급 의료기기 master 만 hard delete. review_required / active 는 삭제 대상에서 제외.
 *
 * 하는 것:
 *   1. 삭제 전 delete_marked 2등급 master 전체 행 snapshot → product_master_cleanup_audits
 *      (cleanup_key='medical_device_grade2_category_based_hard_delete_20260705')
 *   2. RESTRICT/NO ACTION FK 자식(offer/listing/service_product) 방어적 정리
 *   3. delete_marked 2등급 의료기기 master hard delete
 *      - CASCADE/SET NULL 자식 자동. identifier→candidate.matched_identifier_id 2차 캐스케이드는
 *        기존 idx_pc_matched_identifier_id(grade-4 WO 생성)로 가속.
 *
 * 락: DML 전용 — ROW EXCLUSIVE, 동시 읽기 무영향.
 * 롤백: hard delete 복구 불가. 감사 로그로 추적.
 */
export class DeleteMedicalDeviceGrade2DeleteMarked20261208010000 implements MigrationInterface {
  name = 'DeleteMedicalDeviceGrade2DeleteMarked20261208010000';

  private readonly CLEANUP_KEY = 'medical_device_grade2_category_based_hard_delete_20260705';

  // 삭제 대상: 2등급 + delete_marked + professional reason + 의료기기. pm 별칭 전제.
  private readonly TARGET = `
    pm.medical_device_grade = '2'
    AND pm.product_data_status = 'delete_marked'
    AND pm.product_data_curation_reason = 'medical_device_grade2_professional_category_delete_marked'
    AND (
      pm.mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'
      OR pm.regulatory_type IN ('MEDICAL_DEVICE', 'medical_device', '의료기기')
    )
  `;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. snapshot (멱등)
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

    // 2. 방어적 자식 정리 (RESTRICT/NO ACTION FK)
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

    // 3. delete_marked 2등급 의료기기 master hard delete (CASCADE/SET NULL 자식 자동)
    await queryRunner.query(`DELETE FROM product_masters pm WHERE ${this.TARGET}`);
  }

  public async down(): Promise<void> {
    // hard delete 는 복구 불가. product_master_cleanup_audits 로 추적.
  }
}
