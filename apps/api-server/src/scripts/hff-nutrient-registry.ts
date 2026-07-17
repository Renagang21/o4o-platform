/**
 * HFF 단일 영양소 — 공식 기능성 문구 레지스트리 (ko 원문 → en 충실 번역)
 *
 * WO-O4O-HFF-SINGLE-NUTRIENT-CONTINUOUS-END-TO-END-PRODUCTION-V1
 * ko 기능성은 **제품 MAIN_FNCTN 에서 추출**(grounded). 본 레지스트리는 그 표준 문구의 **en 번역**과
 * 영양소 표시 메타만 제공한다. en 은 "needed for / may help" 프레임(원문 강도 유지, 강화 금지).
 * 매핑 키 = 공백 제거 정규화 ko. 미매핑 문구 → 해당 제품 HOLD_GROUNDING(임의 번역 금지).
 */

/** 공백/문장부호 제거 정규화 (매핑 키) — 어미/접두 변이 흡수 */
export function normFn(s: string): string {
  let t = (s ?? '').replace(/\s+/g, '').replace(/[·.,()（）]/g, '');
  t = t.replace(/^항산화작용을하여/, ''); // 비타민E 접두 변이
  t = t.replace(/도움을?줄?수?있(음|습니다)?|도움을?줌요?|주는데도움|도움을?주는/g, '도움'); // 어미 변이(필요 의 '요'는 보존)
  return t.trim();
}

// 표준 MFDS 단일 영양소 기능성 ko → en. (여러 영양소가 공유하는 문구 포함: 항산화·에너지 등)
const RAW_MAP: Array<[string, string]> = [
  // 항산화 (비타민E·셀레늄·구리·망간·아연 일부)
  ['유해산소로부터 세포를 보호하는데 필요', 'Needed to protect cells from harmful oxygen (free radicals)'],
  // 아연
  ['정상적인 면역기능에 필요', 'Needed for normal immune function'],
  ['정상적인 세포분열에 필요', 'Needed for normal cell division'],
  // 칼슘
  ['뼈와 치아 형성에 필요', 'Needed for the formation of bones and teeth'],
  ['신경과 근육 기능 유지에 필요', 'Needed to help maintain normal nerve and muscle function'],
  ['정상적인 혈액응고에 필요', 'Needed for normal blood clotting'],
  ['골다공증발생 위험 감소에 도움을 줌', 'Recognised as helping reduce the risk of developing osteoporosis'],
  ['골다공증 발생 위험 감소에 도움을 줌', 'Recognised as helping reduce the risk of developing osteoporosis'],
  // 마그네슘
  ['에너지 이용에 필요', 'Needed for energy utilisation'],
  // 비오틴·판토텐산
  ['지방, 탄수화물, 단백질 대사와 에너지 생성에 필요', 'Needed for the metabolism of fat, carbohydrate and protein and for energy production'],
  ['지방 탄수화물 단백질 대사와 에너지 생성에 필요', 'Needed for the metabolism of fat, carbohydrate and protein and for energy production'],
  // 비타민A
  ['어두운 곳에서 시각 적응을 위해 필요', 'Needed for the adaptation of vision in dim light'],
  ['피부와 점막을 형성하고 기능을 유지하는데 필요', 'Needed to form and maintain skin and mucous membranes'],
  ['상피세포의 성장과 발달에 필요', 'Needed for the growth and development of epithelial cells'],
  // 철
  ['체내 산소운반과 혈액생성에 필요', 'Needed for oxygen transport and blood formation in the body'],
  ['에너지 생성에 필요', 'Needed for energy production'],
  ['체내 에너지 생성에 필요', 'Needed for energy production in the body'],
  // 엽산
  ['세포와 혈액생성에 필요', 'Needed for cell and blood formation'],
  ['태아 신경관의 정상 발달에 필요', 'Needed for the normal development of the fetal neural tube'],
  ['혈액의 호모시스테인 수준을 정상으로 유지하는데 필요', 'Needed to help maintain normal blood homocysteine levels'],
  // 비타민K
  ['뼈의 구성에 필요', 'Needed for the structure of bone'],
  // 비타민B1
  ['탄수화물과 에너지 대사에 필요', 'Needed for carbohydrate and energy metabolism'],
  // 비타민B6
  ['단백질 및 아미노산 이용에 필요', 'Needed for protein and amino acid utilisation'],
  ['단백질및아미노산이용에필요', 'Needed for protein and amino acid utilisation'],
  // 비타민B12
  ['정상적인 엽산 대사에 필요', 'Needed for normal folate metabolism'],
  // 구리
  ['철의 운반과 이용에 필요', 'Needed for the transport and utilisation of iron'],
  // 망간
  ['뼈 형성에 필요', 'Needed for bone formation'],
  // 크롬
  ['체내 당질 대사에 필요', 'Needed for carbohydrate metabolism in the body'],
  // 요오드
  ['갑상선 호르몬의 합성에 필요', 'Needed for the synthesis of thyroid hormones'],
  ['신경발달에 필요', 'Needed for neural development'],
];

const FUNCTION_MAP: Record<string, string> = {};
for (const [ko, en] of RAW_MAP) FUNCTION_MAP[normFn(ko)] = en;

export function mapFunctionEn(ko: string): string | null {
  return FUNCTION_MAP[normFn(ko)] ?? null;
}

/** 질병 위험감소 기능(허용) 문구 — 사람검수 대상 표시용 */
export function isRiskReductionFn(ko: string): boolean {
  return /위험\s*감소에?\s*도움/.test(ko);
}

export interface NutrientMeta { key: string; slug: string; displayKo: string; displayEn: string }
export const NUTRIENT_META: Record<string, NutrientMeta> = {
  '아연': { key: '아연', slug: 'zinc', displayKo: '아연', displayEn: 'Zinc' },
  '비타민E': { key: '비타민E', slug: 'vitamin-e', displayKo: '비타민 E', displayEn: 'Vitamin E' },
  '칼슘': { key: '칼슘', slug: 'calcium', displayKo: '칼슘', displayEn: 'Calcium' },
  '마그네슘': { key: '마그네슘', slug: 'magnesium', displayKo: '마그네슘', displayEn: 'Magnesium' },
  '비오틴': { key: '비오틴', slug: 'biotin', displayKo: '비오틴', displayEn: 'Biotin' },
  '비타민A': { key: '비타민A', slug: 'vitamin-a', displayKo: '비타민 A', displayEn: 'Vitamin A' },
  '철': { key: '철', slug: 'iron', displayKo: '철', displayEn: 'Iron' },
  '엽산': { key: '엽산', slug: 'folate', displayKo: '엽산', displayEn: 'Folate' },
  '셀레늄': { key: '셀레늄', slug: 'selenium', displayKo: '셀레늄', displayEn: 'Selenium' },
  '나이아신': { key: '나이아신', slug: 'niacin', displayKo: '나이아신', displayEn: 'Niacin' },
  '비타민K': { key: '비타민K', slug: 'vitamin-k', displayKo: '비타민 K', displayEn: 'Vitamin K' },
  '비타민B1': { key: '비타민B1', slug: 'vitamin-b1', displayKo: '비타민 B1', displayEn: 'Vitamin B1' },
  '비타민B2': { key: '비타민B2', slug: 'vitamin-b2', displayKo: '비타민 B2', displayEn: 'Vitamin B2' },
  '비타민B6': { key: '비타민B6', slug: 'vitamin-b6', displayKo: '비타민 B6', displayEn: 'Vitamin B6' },
  '비타민B12': { key: '비타민B12', slug: 'vitamin-b12', displayKo: '비타민 B12', displayEn: 'Vitamin B12' },
  '판토텐산': { key: '판토텐산', slug: 'pantothenic-acid', displayKo: '판토텐산', displayEn: 'Pantothenic acid' },
  '구리': { key: '구리', slug: 'copper', displayKo: '구리', displayEn: 'Copper' },
  '망간': { key: '망간', slug: 'manganese', displayKo: '망간', displayEn: 'Manganese' },
  '크롬': { key: '크롬', slug: 'chromium', displayKo: '크롬', displayEn: 'Chromium' },
  '요오드': { key: '요오드', slug: 'iodine', displayKo: '요오드', displayEn: 'Iodine' },
};
