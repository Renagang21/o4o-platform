import type { ProductCorrectionRuleInput } from '@o4o/types';

/** Editable starting points only: never seeded, executed, or saved by selecting a template. */
export const productRuleTemplates: Array<{
  id: string;
  title: string;
  instructions: string;
  regulatoryTypes: string[];
  check: ProductCorrectionRuleInput['check'];
}> = [
  {
    id: 'reference-amount',
    title: '함량과 1일 기준량 근거 확인',
    instructions: '표시된 수치의 단위·기준량·섭취/사용 횟수를 원문에서 각각 확인한다. 1정당·1회당·1일량·총량을 구분하고 연결 근거가 없으면 추정하지 않는다. 상품 사실의 출처·확인일과 보완할 항목을 남긴다. 문구 검색은 후보 찾기이며 오류 확정이 아니다.',
    regulatoryTypes: ['HEALTH_FUNCTIONAL'],
    check: { kind: 'text', terms: ['μg', 'µg', 'mcg', 'mg'], match: 'any' },
  },
  {
    id: 'package-total',
    title: '포장 수량과 총량 근거 확인',
    instructions: '1개 단위 중량·정/캡슐 수·포장 수·총량을 각각 원문에서 확인한다. 계산 결과와 표시가 다르면 구성·단위·근거를 먼저 확인하고 특정 수치를 자동 정답으로 선택하지 않는다. 근거가 부족한 항목과 필요한 자료를 기록한다.',
    regulatoryTypes: [],
    check: { kind: 'text', terms: ['캡슐', '정', 'BOX', '총'], match: 'any' },
  },
  {
    id: 'product-instructions',
    title: '화장품 고유 사용법과 일반 안내 구분',
    instructions: '해당 제품 원문의 사용 부위·방법·횟수·주의사항과 유형별 일반 안내를 구분한다. 유형의 일반 지식을 제품 고유 사용법으로 확정하지 않는다. 제품 사실은 제품 자료로, 전문 참고정보는 식별 가능한 별도 자료로 근거를 남긴다.',
    regulatoryTypes: ['COSMETIC'],
    check: { kind: 'manual' },
  },
  {
    id: 'professional-evidence',
    title: '전문 판단 참고정보와 상품 사실 근거 연결',
    instructions: '상품 고유 효능·사용법·주의의 원문 근거와 질병·진단 과정·감별·상담 판단에 쓰는 전문 참고자료를 구분한다. 전문 내용이나 질병명이 있다는 이유만으로 삭제하지 않는다. 각 출처·확인일·적용 대상·불확실성·추가 확인 사항을 남기고 소비자 안내와 전문 판단을 구분한다.',
    regulatoryTypes: ['DRUG'],
    check: { kind: 'manual' },
  },
];

export function createProductRuleDraft(id: string, current: ProductCorrectionRuleInput): ProductCorrectionRuleInput {
  const template = productRuleTemplates.find((item) => item.id === id);
  if (!template) throw new Error('기준 초안을 선택하세요.');
  return {
    ...current,
    title: template.title,
    instructions: template.instructions,
    regulatoryTypes: [...template.regulatoryTypes],
    check: structuredClone(template.check),
    enabled: false,
  };
}
