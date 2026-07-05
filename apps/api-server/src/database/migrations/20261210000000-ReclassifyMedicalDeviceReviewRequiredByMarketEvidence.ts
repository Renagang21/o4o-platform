import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-MEDICAL-DEVICE-REVIEW-REQUIRED-712-MARKET-EVIDENCE-RESOLUTION-V1 (1/2 — 재분류)
 *
 * 의료기기 등급별 정리 후 남은 review_required 712건(83 distinct 카테고리)을 네이버/쿠팡
 * 소비자 유통 흔적 기준으로 재판정한 결과를 product_data_status 로 반영. 실제 삭제는 2/2.
 *
 * 조사 결과(카테고리 정확일치): active 57카테고리/557 · review 18카테고리/144 · delete 8카테고리/11.
 *   - active: 소비자/약국/매장 판매 확인(주사침·인슐린주입세트·채혈세트·핀셋·가위·가정용 AED·CPAP·
 *     저주파자극기·전동침대·다리마사지기·심전도패치 등) → 보존.
 *   - delete_marked: 소비자 판매 흔적 없음 + 성격 전문/기관용(내시경헤모클립·bone file·운동실조검사기·
 *     치과 팬토그래프/산소차단제/본딩프라이머/쉐이드가이드·수술마커) → 삭제 대상.
 *   - review_required(ELSE): 병원·가정 혼재 또는 불명확 → 유지.
 *
 * scope: product_data_status='review_required' AND 의료기기. (active/1~4등급 기존 상태 무변경)
 * 락: DML(UPDATE)만 — ROW EXCLUSIVE.
 */
export class ReclassifyMedicalDeviceReviewRequiredByMarketEvidence20261210000000
  implements MigrationInterface
{
  name = 'ReclassifyMedicalDeviceReviewRequiredByMarketEvidence20261210000000';

  /** 소비자 유통 확인 — active 전환 (57 카테고리) */
  private readonly ACTIVE = [
    '멸균 주사침', '의약품 직접 주입 기구', '재사용가능 범용 수동식 의료용 핀셋', '의료용 측정자',
    '멸균침', '재사용가능 수동식 의료용 가위', '흡인용 튜브·카테터', '검체 채취용 도구',
    '비멸균 의료용 겔', '채혈세트', '치아 재광화 촉진제', '의료용 혼합 주걱', '체표면 근전계 전극',
    '치경', '레이저 방어용 안경', '체외형 의료용 전극', '정형 용품', '수동식 기능 회복용 기구',
    '일회용 산소 투여용 튜브·카테터', '치과용 도포기', '구강 개구기', '수동식 의료용 세정기',
    '전동식 정형용 운동장치', '가스 튜브·카테터', '국소 지혈용 드레싱', '안압계', '저출력 심장 충격기',
    '분사식 주사기', '세정용 주사기', '경성 귀 내시경', '펄스 광선 조사기', '세정용 튜브',
    '의료용 가드', '일회용 범용 수동식 의료용 핀셋', '수동식 공기 주입식 정형용 견인장치',
    '체표면 전기 자극기용 전극', '수동식 의료용 흡인기', '의료용침대구동기구', '호흡 보조기',
    '수중 수동식 휠체어', '수면 평가장치', '양압 지속유지기', '수동식 환자 리프트',
    '의료용 이온 도입기', '의료용 자기 발생기', '레이저 진료기', '수동식 의료용 망치',
    '수동식 의료용 침대', '일회용 심전도 전극', '전동식 의료용 침대', '전동식 의약품 주입 펌프',
    '수동식 의료용 치석 제거기', '의료용 전자기 발생기', '체외형 의료용 카메라',
    '수동식 심폐소생술 보조기구', '사지압박 순환장치', '2등급 의료용 조합 자극기',
  ];

  /** 소비자 판매 없음 + 전문/기관용 — 삭제 (8 카테고리) */
  private readonly DELETE_MARKED = [
    '의료기구용 클립', '수동식 의료용 줄', '운동 실조 묘화기', '사도기',
    '의료용 체외 표시기', '치과용 산소 차단제', '프라이머', '치아색상 측정기',
  ];

  private literal(arr: string[]): string {
    return arr.map((s) => `'${s.replace(/'/g, "''")}'`).join(', ');
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const MD = `(pm.mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%' OR pm.regulatory_type IN ('MEDICAL_DEVICE', 'medical_device', '의료기기'))`;

    await queryRunner.query(`
      UPDATE product_masters pm
      SET product_data_status = CASE
            WHEN pm.name IN (${this.literal(this.DELETE_MARKED)}) THEN 'delete_marked'
            WHEN pm.name IN (${this.literal(this.ACTIVE)}) THEN 'active'
            ELSE 'review_required'
          END,
          product_data_curation_reason = CASE
            WHEN pm.name IN (${this.literal(this.DELETE_MARKED)})
              THEN 'medical_device_review_professional_delete_marked'
            WHEN pm.name IN (${this.literal(this.ACTIVE)})
              THEN 'medical_device_review_market_evidence_active'
            ELSE 'medical_device_review_ambiguous_remains_review_required'
          END,
          product_data_curated_at = NOW()
      WHERE pm.product_data_status = 'review_required' AND ${MD}
    `);
  }

  public async down(): Promise<void> {
    // 재분류는 되돌리지 않는다(시장성 조사 결과 반영). 이전 review_required reason 은 등급 정리 WO 산출물.
  }
}
