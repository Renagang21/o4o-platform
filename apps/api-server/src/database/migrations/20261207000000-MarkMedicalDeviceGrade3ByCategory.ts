import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-MEDICAL-DEVICE-GRADE3-NAME-BASED-DELETE-MARK-AND-BULK-DELETE-V1 (1/2 — 삭제표시)
 *
 * 3등급 의료기기 ProductMaster 를 품목(카테고리)명 기준으로 3분류 표시(product_data_status).
 * 실제 삭제는 2/2 migration(delete_marked 대상)에서 수행.
 *
 * 분류 근거: 3등급 의료기기의 name(=regulatory_name)은 식약처 품목분류명(카테고리)이며
 *   grade-3 은 33개 distinct 카테고리로 수렴. 키워드 부분매칭 대신 **카테고리명 정확일치**로
 *   분류(오탐 방지). 소비자/개인용 계열은 delete_marked 에서 배제.
 *
 * 표시 규칙:
 *   - delete_marked  : 전문/수술/이식/검사(진단시약)·병원설치형 — 명백히 기관/전문가용 (26 카테고리)
 *   - review_required: 애매(정형용품 일반 / AED 인접 / 미용·물리치료 가능) — 삭제 안 함 (4 카테고리)
 *   - active         : 소비자·개인용(혈당·CGM·콘택트렌즈) 유지 (3 카테고리)
 *
 * 락: DML(UPDATE)만 — ROW EXCLUSIVE, 동시 읽기/쓰기 무영향. 3등급 의료기기만 대상(1/2등급 무변경).
 */
export class MarkMedicalDeviceGrade3ByCategory20261207000000 implements MigrationInterface {
  name = 'MarkMedicalDeviceGrade3ByCategory20261207000000';

  private readonly DELETE_MARKED = [
    '치과용 임플란트 고정체', '추간체 고정재', '치과 교정용 고정장치', '골절 합용 판',
    '추간체 유합 보형재', '인공 신장기용 혈액 여과기', '연조직 고정용 장치',
    '고위험성감염체유전자검사시약', '치과용 임플란트 시스템',
    '심혈관및중추신경계치료약물농도감시검사시약', '안과용 엔디야그 레이저 수술기',
    '비흡수성 봉합사 의료용 봉합기', '집속형 초음파 자극 시스템', '골 시멘트',
    '범용 전기 수술기', '인공 측두 하악골 관절', '혈액 관류장치', '의료용 열 소작기',
    '치과용 전기 수술기', '초음파 수술기', '자동화 시스템 로봇 수술기',
    '비흡수성 이식용 클립', '엔디야그 레이저 수술기', '탄산가스 레이저 수술기',
    '동반진단용면역검사시약', 'HIV·HBV·HCV·HTLV혈청형·아형검사시약',
  ];
  private readonly REVIEW_REQUIRED = [
    '정형 용품', '저출력 심장 충격기', '펄스 광선 조사기', '3등급 의료용 조합 자극기',
  ];
  private readonly ACTIVE = [
    '개인용혈당측정기', '개인용 체내 연속혈당 측정 시스템', '연속착용 하드 콘택트렌즈',
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
            WHEN pm.name IN (${this.literal(this.REVIEW_REQUIRED)}) THEN 'review_required'
            WHEN pm.name IN (${this.literal(this.ACTIVE)}) THEN 'active'
            ELSE 'review_required'   -- 미분류(신규 카테고리 유입)는 안전측: 삭제 안 함
          END,
          product_data_curation_reason = CASE
            WHEN pm.name IN (${this.literal(this.DELETE_MARKED)})
              THEN '3등급 name-based delete_marked (전문/수술/이식/검사): ' || pm.name
            WHEN pm.name IN (${this.literal(this.ACTIVE)})
              THEN '3등급 name-based active (소비자/개인용 유지): ' || pm.name
            ELSE '3등급 name-based review_required (애매/미분류 - 조사대상): ' || pm.name
          END,
          product_data_curated_at = NOW()
      WHERE pm.medical_device_grade = '3' AND ${MD}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 표시 복원: 3등급 의료기기를 grade 백필 기본값('graded')으로 되돌림.
    const MD = `(pm.mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%' OR pm.regulatory_type IN ('MEDICAL_DEVICE', 'medical_device', '의료기기'))`;
    await queryRunner.query(`
      UPDATE product_masters pm
      SET product_data_status = 'graded', product_data_curation_reason = NULL
      WHERE pm.medical_device_grade = '3' AND ${MD}
    `);
  }
}
