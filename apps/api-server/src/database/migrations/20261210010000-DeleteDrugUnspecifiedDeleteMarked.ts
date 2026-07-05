import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-DRUG-UNSPECIFIED-CATEGORY-AUDIT-AND-CLEANUP-V1 (2/2 — 일괄 삭제)
 * CHECK: docs/checks/CHECK-O4O-DRUG-UNSPECIFIED-CATEGORY-AUDIT-V1.md
 *
 * 1/2 migration(20261210000000)에서 `product_data_status='delete_marked'` 로 표시된
 * drug_unspecified DRUG master 53,428건만 hard delete. review_required 293 은 삭제 제외.
 *
 * 삭제 대상(내역, 프로덕션 검증됨): 한약재 39,666 + NULL한약재 12,209 + 원료의약품 1,147
 *   + 한국희귀필수의약품센터 345 + 주사제 61 = 53,428. 연결 보호 대상(link_guard 4)은 review 잔류.
 *
 * 하는 것:
 *   1. 삭제 전 delete_marked master 전체 행 snapshot → product_master_cleanup_audits
 *      (cleanup_key='drug_unspecified_raw_gubun_hard_delete_20260705'). 멱등(NOT EXISTS).
 *   2. RESTRICT/NO ACTION FK 자식(offer/listing/service_product) 방어적 정리
 *      (대상군엔 실측 0건이나 안전상 수행).
 *   3. delete_marked master hard delete.
 *      - CASCADE 자식(product_identifiers/product_drug_extensions/product_images/
 *        shared_product_descriptions/store_product_profiles/product_aliases/
 *        tablet_interest_requests) 자동 삭제.
 *      - SET NULL(product_candidates.matched_product_master_id / matched_identifier_id,
 *        catalog_products, store_products) 자동. 2차 캐스케이드는
 *        idx_product_candidates_matched_product_master_id / idx_pc_matched_identifier_id 로 가속.
 *
 * 락: DML 전용 — ROW EXCLUSIVE, 동시 읽기 무영향. drug_unspecified + delete_marked 만 대상.
 * 롤백: hard delete 복구 불가. product_master_cleanup_audits snapshot 으로 추적, 재등록은 신규 흐름.
 */
export class DeleteDrugUnspecifiedDeleteMarked20261210010000 implements MigrationInterface {
  name = 'DeleteDrugUnspecifiedDeleteMarked20261210010000';

  private readonly CLEANUP_KEY = 'drug_unspecified_raw_gubun_hard_delete_20260705';

  // 삭제 대상: drug_unspecified + delete_marked + DRUG. pm 별칭 전제.
  private readonly TARGET = `
    pm.regulatory_type = 'DRUG'
    AND pm.drug_category = 'drug_unspecified'
    AND pm.product_data_status = 'delete_marked'
  `;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. snapshot (to_jsonb 전체 행). 멱등(NOT EXISTS).
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

    // 2. 방어적 자식 정리 (RESTRICT/NO ACTION FK). 대상 master 로 한정.
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

    // 3. delete_marked drug_unspecified master hard delete (CASCADE/SET NULL 자식 자동 처리)
    await queryRunner.query(`DELETE FROM product_masters pm WHERE ${this.TARGET}`);
  }

  public async down(): Promise<void> {
    // hard delete 는 복구 불가. product_master_cleanup_audits 로 추적.
  }
}
