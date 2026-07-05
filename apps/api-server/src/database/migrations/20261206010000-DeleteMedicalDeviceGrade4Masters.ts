import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-MEDICAL-DEVICE-GRADE4-HARD-DELETE-EXECUTE-WITH-COUNT-REPORT-V1 (2/2 — DML)
 *
 * 정부 의료기기 원천 데이터의 법정 등급(4등급)을 기준으로 의료기기 ProductMaster 를 hard delete.
 * 스키마(컬럼/인덱스/감사 테이블)는 1/2 DDL migration 에서 준비됨.
 *
 * 하는 것:
 *   1. product_candidates.raw_payload 등급 필드 → 의료기기 master.medical_device_grade 백필
 *   2. 삭제 전 4등급 master 전체 행 snapshot 을 product_master_cleanup_audits 에 기록
 *   3. RESTRICT/NO ACTION FK 자식(공급 offer / listing / service_product) 방어적 정리 (실측 0행)
 *   4. 4등급 의료기기 master hard delete
 *      - CASCADE 자식(identifiers/aliases/drug_extensions/images/shared_descriptions/
 *        store_product_profiles/tablet_interest_requests) 및 SET NULL 자식
 *        (catalog_products/product_candidates/store_products) 은 FK 정책으로 자동 처리.
 *      - identifiers 삭제의 2차 캐스케이드(product_candidates.matched_identifier_id SET NULL)는
 *        1/2 migration 의 idx_pc_matched_identifier_id 인덱스로 가속됨.
 *
 * 원천 등급 기준 (우선순위):
 *   raw_payload->>'CLSF_NO_GRAD_CD'
 *   → raw_payload->'source'->>'CLSF_NO_GRAD_CD'   (실측: 매칭 master 는 이 경로)
 *   → raw_payload->>'clsfNoGradCd' → raw_payload->>'grade' → raw_payload->>'deviceGrade'
 *
 * 락 전략: DML 전용(ALTER 없음). backfill/delete 는 ROW EXCLUSIVE — 동시 읽기/쓰기 무영향.
 *
 * 롤백: hard delete 는 되돌릴 수 없음. down() 은 no-op(감사 로그로 추적, 재등록은 신규 등록 흐름).
 */
export class DeleteMedicalDeviceGrade4Masters20261206010000 implements MigrationInterface {
  name = 'DeleteMedicalDeviceGrade4Masters20261206010000';

  // 삭제 대상 판정 (backfill 이후). WO §4 삭제 조건과 동일. pm 별칭 전제.
  private readonly GRADE4_TARGET = `
    pm.medical_device_grade = '4'
    AND (
      pm.mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'
      OR pm.regulatory_type IN ('MEDICAL_DEVICE', 'medical_device', '의료기기')
    )
  `;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 등급 백필 — candidate raw_payload 등급 → 의료기기 master.medical_device_grade
    //    DISTINCT ON 으로 master 당 1개(충돌 시 높은 등급 우선; 실측 충돌 0). 의료기기만.
    await queryRunner.query(`
      UPDATE product_masters pm
      SET medical_device_grade = g.grade,
          product_data_status = 'graded',
          product_data_curated_at = NOW()
      FROM (
        SELECT DISTINCT ON (matched_product_master_id)
               matched_product_master_id AS mid,
               COALESCE(
                 raw_payload->>'CLSF_NO_GRAD_CD',
                 raw_payload->'source'->>'CLSF_NO_GRAD_CD',
                 raw_payload->>'clsfNoGradCd',
                 raw_payload->>'grade',
                 raw_payload->>'deviceGrade'
               ) AS grade
        FROM product_candidates
        WHERE matched_product_master_id IS NOT NULL
        ORDER BY matched_product_master_id,
                 COALESCE(
                   raw_payload->>'CLSF_NO_GRAD_CD',
                   raw_payload->'source'->>'CLSF_NO_GRAD_CD',
                   raw_payload->>'clsfNoGradCd',
                   raw_payload->>'grade',
                   raw_payload->>'deviceGrade'
                 ) DESC NULLS LAST
      ) g
      WHERE pm.id = g.mid
        AND g.grade IS NOT NULL
        AND (
          pm.mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'
          OR pm.regulatory_type IN ('MEDICAL_DEVICE', 'medical_device', '의료기기')
        )
    `);

    // 2. 삭제 전 snapshot (to_jsonb 전체 행). cleanup_key 는 WO §8 count 쿼리와 일치. 멱등(NOT EXISTS).
    await queryRunner.query(`
      INSERT INTO product_master_cleanup_audits (
        cleanup_key, action, product_master_id, regulatory_type,
        mfds_product_id, barcode, name, medical_device_grade, snapshot
      )
      SELECT
        'medical_device_grade4_hard_delete_20261204', 'hard_delete',
        pm.id, pm.regulatory_type, pm.mfds_product_id, pm.barcode, pm.name,
        pm.medical_device_grade, to_jsonb(pm.*)
      FROM product_masters pm
      WHERE ${this.GRADE4_TARGET}
        AND NOT EXISTS (
          SELECT 1 FROM product_master_cleanup_audits a
          WHERE a.product_master_id = pm.id
            AND a.cleanup_key = 'medical_device_grade4_hard_delete_20261204'
            AND a.action = 'hard_delete'
        )
    `);

    // 3. 방어적 자식 정리 (RESTRICT/NO ACTION FK — 실측 0행). 대상 master 로 한정.
    const targetIds = `SELECT pm.id FROM product_masters pm WHERE ${this.GRADE4_TARGET}`;
    await queryRunner.query(
      `DELETE FROM supplier_product_offers WHERE master_id IN (${targetIds})`,
    );
    await queryRunner.query(
      `DELETE FROM organization_product_listings WHERE master_id IN (${targetIds})`,
    );
    await queryRunner.query(
      `DELETE FROM service_products WHERE master_id IN (${targetIds})`,
    );

    // 4. 4등급 의료기기 master hard delete (CASCADE/SET NULL 자식 자동 처리)
    await queryRunner.query(`DELETE FROM product_masters pm WHERE ${this.GRADE4_TARGET}`);
  }

  public async down(): Promise<void> {
    // hard delete 는 복구 불가. 감사 로그(product_master_cleanup_audits)로 추적한다.
    // 재등록이 필요한 특수 제품은 공급자/매장/운영자 신규 등록 흐름으로 처리한다.
  }
}
