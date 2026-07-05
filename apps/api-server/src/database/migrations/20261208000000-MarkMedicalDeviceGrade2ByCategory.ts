import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-MEDICAL-DEVICE-GRADE2-CONSUMER-VS-PROFESSIONAL-CATEGORY-DELETE-MARK-AND-BULK-DELETE-V1 (1/2 — 삭제표시)
 *
 * 2등급 의료기기 ProductMaster 를 품목분류명(카테고리) 기준으로 3분류 표시(product_data_status).
 * 실제 삭제는 2/2 migration(delete_marked 대상)에서 수행.
 *
 * 분류 방법: 2등급 의료기기 name(=regulatory_name)은 식약처 품목분류명이며 159개 distinct
 *   카테고리로 수렴. 소비자/약국 취급 가능 카테고리(active) 와 애매 카테고리(review_required)를
 *   카테고리명 정확일치로 지정하고, 나머지(전문/기관용 — 치과기공재료·전기수술기전극·카테터·
 *   내시경·검사시약·영상장비·멸균기 등)는 delete_marked. 소비자 계열은 delete_marked 에서 배제.
 *   (159 카테고리 전수 판정 결과: delete_marked 111/12,125, review 27/286, active 21/122)
 *
 * 락: DML(UPDATE)만 — ROW EXCLUSIVE, 동시 읽기/쓰기 무영향. 2등급 의료기기만 대상(1/3/4등급 무변경).
 */
export class MarkMedicalDeviceGrade2ByCategory20261208000000 implements MigrationInterface {
  name = 'MarkMedicalDeviceGrade2ByCategory20261208000000';

  /** 소비자·약국·개인용 — 유지 (21 카테고리) */
  private readonly ACTIVE = [
    '기도형 보청기', '점착성 투명 창상피복재', '국소 폼제 창상피복재', '생리식염수 창상피복재',
    '일회용 채혈침', '피부 적외선 체온계', '전자 체온계', '자동 전자 혈압계', '의치 부착재',
    '개인용 전위 발생기', '전동식 모유 착유기', '저주파 자극기', '개인용 저주파 자극기',
    '개인용 온열기', '질 세정기', '전동식 코 세정기', '알칼리 이온수 생성기',
    '개인용임신내분비물질검사지', '개인용단백질·지질검사지', '매일착용 하드 콘택트렌즈',
    '의료용 산소 발생기',
  ];

  /** 병원·가정 겸용 / 소비자 흔적 조사 필요 — 삭제 안 함 (27 카테고리) */
  private readonly REVIEW = [
    '멸균 주사침', '멸균침', '의약품 직접 주입 기구', '채혈세트', '국소 지혈용 드레싱', '안압계',
    '전동식 정형용 운동장치', '유아 가온장치', '분사식 주사기', '카트리지형 주사기',
    '일회용 범용 수동식 의료용 핀셋', '수동식 의약품 주입 펌프', '전동식 의약품 주입 펌프',
    '양압 지속유지기', '수면 평가장치', '지각 과민 처치제', '청력 검사기', '호흡 보조기',
    '의료용 이온 도입기', '의료용 자기 발생기', '의료용 전자기 발생기', '레이저 진료기',
    '전동식 의료용 세정기', '수동식 의약품 혼합용 기구', '수동식 심폐소생술 보조기구',
    '사지압박 순환장치', '2등급 의료용 조합 자극기',
  ];

  private literal(arr: string[]): string {
    return arr.map((s) => `'${s.replace(/'/g, "''")}'`).join(', ');
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const MD = `(pm.mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%' OR pm.regulatory_type IN ('MEDICAL_DEVICE', 'medical_device', '의료기기'))`;

    await queryRunner.query(`
      UPDATE product_masters pm
      SET product_data_status = CASE
            WHEN pm.name IN (${this.literal(this.ACTIVE)}) THEN 'active'
            WHEN pm.name IN (${this.literal(this.REVIEW)}) THEN 'review_required'
            ELSE 'delete_marked'
          END,
          product_data_curation_reason = CASE
            WHEN pm.name IN (${this.literal(this.ACTIVE)})
              THEN 'medical_device_grade2_consumer_category_active'
            WHEN pm.name IN (${this.literal(this.REVIEW)})
              THEN 'medical_device_grade2_ambiguous_category_review_required'
            ELSE 'medical_device_grade2_professional_category_delete_marked'
          END,
          product_data_curated_at = NOW()
      WHERE pm.medical_device_grade = '2' AND ${MD}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const MD = `(pm.mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%' OR pm.regulatory_type IN ('MEDICAL_DEVICE', 'medical_device', '의료기기'))`;
    await queryRunner.query(`
      UPDATE product_masters pm
      SET product_data_status = 'graded', product_data_curation_reason = NULL
      WHERE pm.medical_device_grade = '2' AND ${MD}
    `);
  }
}
