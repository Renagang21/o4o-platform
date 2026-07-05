import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-MEDICAL-DEVICE-GRADE1-CONSUMER-VS-PROFESSIONAL-CATEGORY-AUDIT-AND-CLEANUP-V1 (1/2 — 삭제표시)
 *
 * 1등급(저위험) 의료기기 ProductMaster 를 품목분류명(카테고리) 기준으로 3분류 표시.
 * 1등급은 소비자·약국·매장 취급 가능성이 높으므로 **가장 보수적**으로 판정:
 *   - active: 소비자·약국·매장 (안경렌즈/부목/밴드/마스크/장갑/휠체어 등 22 카테고리)
 *   - delete_marked: 명백히 전문/기관용만 (수술기구·치과클리닉·검사실설비·내시경부속 등 68 카테고리)
 *   - review_required: 그 외 전부(ELSE, 안전측 기본값) — 애매/병원가정겸용/소비자채널 조사필요 (52 카테고리)
 *   (142 카테고리 전수 판정: active 22/2,998, delete 68/1,221, review 52/413)
 *
 * 락: DML(UPDATE)만 — ROW EXCLUSIVE. 1등급 의료기기만 대상(2/3/4등급 무변경).
 */
export class MarkMedicalDeviceGrade1ByCategory20261209000000 implements MigrationInterface {
  name = 'MarkMedicalDeviceGrade1ByCategory20261209000000';

  /** 소비자·약국·매장·개인용 — 유지 (22 카테고리) */
  private readonly ACTIVE = [
    '안경렌즈', '시력 보정용 안경', '부목', '압박용 밴드', '피부 보호대', '호흡기용 마스크',
    '성형 부목', '손 부목', '진료용 장갑', '팽창성 부목', '혈압 검사용 커프', '패드식 부목',
    '수동식 휠체어', '비강 확장기', '이갈이 방지 가드', '지혈대', '발가락 교정용 부목', '채혈기',
    '수동식 부항기', '수동식 구강 세정기', '의료용 압력분산 매트리스', '1등급 유헬스케어 게이트웨이',
  ];

  /** 명백한 전문/기관용(수술·치과클리닉·검사실·내시경부속·기관설비) — 삭제 (68 카테고리) */
  private readonly DELETE_MARKED = [
    '치과 치석 제거기용 팁', '치과용 임플란트 시술기구', '치과 근관 치료용 줄', '인상 전 처치제',
    '재사용가능 치과용 칼', '재사용가능 치과용 가위', '치과 교정용 장치', '교정용 겸자',
    '치과 치료용 핀셋', '치과용 고무 방습기 프레임', '치과용 접착성 수송기', '치과용 교합력계',
    '치과용 매트릭스 밴드', '치과용 가시광선 중합기', '치과 임플란트 시술용 스크루드라이버',
    '수동식 재사용가능 의료용 핸드피스', '의료용 절삭 기구', '재사용가능 의료용 겸자',
    '재사용가능 수동식 의료용 개창 기구', '재사용가능 봉합침', '수동식 골 수술기',
    '의료용 개공 기구', '수동식 재사용 의료용 천공기', '외과 용품', '재사용가능 의료용 봉합기',
    '재사용가능 체외 고정 기구', '재사용가능 수동식 의료용 칼', '수동식 절골기',
    '수동식 골막 박리기', '수동식 혈관 확장기', '재사용가능 조직 박리기',
    '재사용가능 수동식 의료용 큐렛', '의료용 결찰사 수송기 및 운반기',
    '이식용 의료기기 삽입용 보조 기구', '의료용 클램프', '재사용가능 범용 수동식 의료용 클램프',
    '범용 의료용 확장기', '수동식 의료용 소식자', '수동식 재사용가능 의료용 천자기',
    '자궁용 의약품 등 주입기', '재사용가능 기관 내 튜브 탐침', '재사용가능 내시경 겸자',
    '내시경 기자', '내시경 체강 삽입 유도 기구', '재사용가능 내시경 주사침', '검체수송배지',
    '미생물염색및배양시약', '범용상온원심분리장치', '요화학분석기', '기타전처리일체형시약',
    '의료용효소면역검사장치', '의료용면역발광측정장치', '진공 채혈관', '미생물배양기',
    '표본가공장치', '세포및조직배양기', '기타임상미생물검사기', '의료용면역형광측정장치',
    '의료용분리방식임상화학자동분석장치', '쉬머 스트립', '검안용 렌즈', '망막 전위용 전극',
    '두피 뇌파용 전극', '수동식 환자 운반기', '의약품 냉장고', '의료영상 처리장치',
    '의료용 영상 출력기', '기타 방사선 방어용 기구',
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
            WHEN pm.name IN (${this.literal(this.DELETE_MARKED)}) THEN 'delete_marked'
            ELSE 'review_required'
          END,
          product_data_curation_reason = CASE
            WHEN pm.name IN (${this.literal(this.ACTIVE)})
              THEN 'medical_device_grade1_consumer_category_active'
            WHEN pm.name IN (${this.literal(this.DELETE_MARKED)})
              THEN 'medical_device_grade1_professional_category_delete_marked'
            ELSE 'medical_device_grade1_ambiguous_category_review_required'
          END,
          product_data_curated_at = NOW()
      WHERE pm.medical_device_grade = '1' AND ${MD}
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const MD = `(pm.mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%' OR pm.regulatory_type IN ('MEDICAL_DEVICE', 'medical_device', '의료기기'))`;
    await queryRunner.query(`
      UPDATE product_masters pm
      SET product_data_status = 'graded', product_data_curation_reason = NULL
      WHERE pm.medical_device_grade = '1' AND ${MD}
    `);
  }
}
