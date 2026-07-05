import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO — 의료기기 상품 데이터 슬림화 (O4O 유통 구조 정렬)
 *
 * 원칙: O4O 는 유통/실행 자산 플랫폼 — 상품은 유통 정보로 구성한다.
 *   규제/허가 정보(MFDS)는 O4O 상품 구조에 자리가 없으므로 보유하지 않는다.
 *   (docs/baseline/O4O-DISTRIBUTION-EVIDENCE-SEED-PRINCIPLE-V1.md)
 *
 * O4O 상품 구조: 상품명 / 제조사 / 제조국 / 포장단위 / 바코드(이후). 카테고리·식별자 미사용.
 *
 * 이 migration 은 **상품(행)을 지우지 않는다.** 한 상품 안의 "유통에 안 쓰는 규제 정보"만 제거한다.
 *
 * candidate (source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE'):
 *   - 포장단위(candidate_unit) ← 모델명 FOML(candidate_spec) 이동
 *   - candidate_spec / candidate_category → NULL
 *   - identifier_type / identifier_value / normalized_identifier_value → NULL
 *       (UDIDI 는 유통 식별자 아님 — import 내부 dedup 전용, 재import HOLD 로 매칭 대상 없음)
 *   - raw_payload → 최소({sourceKind}) — 28MB 규제 블롭 제거. 원본 raw 는 G: 드라이브에 보존(복구 가능).
 *
 * master (regulatory_type='MEDICAL_DEVICE'):
 *   - origin_country ← 허가번호 '제'(제조) 접두어면 '대한민국', 그 외(수입/체외 등) 비움
 *   - mfds_permit_number / medical_device_grade → NULL
 *   - name / manufacturer_name / specification / barcode 은 유지(유통 정보).
 *   - regulatory_type / mfds_product_id 은 identity·routing 키라 유지.
 *
 * 락: DML(UPDATE)만 — ROW EXCLUSIVE. 의료기기만 대상(타 트랙 무영향).
 */
export class SlimMedicalDeviceToDistributionFields20261211000000
  implements MigrationInterface
{
  name = 'SlimMedicalDeviceToDistributionFields20261211000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. candidate 슬림
    await queryRunner.query(`
      UPDATE product_candidates
      SET candidate_unit = COALESCE(candidate_unit, candidate_spec),  -- 모델명 → 포장단위
          candidate_spec = NULL,
          candidate_category = NULL,
          identifier_type = NULL,
          identifier_value = NULL,
          normalized_identifier_value = NULL,
          raw_payload = jsonb_build_object('sourceKind', 'medical_device_standard_code'),
          updated_at = NOW()
      WHERE source_label = 'MFDS_MEDICAL_DEVICE_STANDARD_CODE'
        AND deleted_at IS NULL
    `);

    // 2. master 슬림 (+ 제조국 파생)
    await queryRunner.query(`
      UPDATE product_masters
      SET origin_country = CASE
            WHEN left(mfds_permit_number, 1) = '제' THEN '대한민국'
            ELSE origin_country
          END,
          mfds_permit_number = NULL,
          medical_device_grade = NULL,
          updated_at = NOW()
      WHERE regulatory_type = 'MEDICAL_DEVICE'
    `);
  }

  public async down(): Promise<void> {
    // 복구 불가(규제 정보 제거는 의도된 결과). 필요 시 G: 드라이브 원본 raw 재import 로 복원.
  }
}
