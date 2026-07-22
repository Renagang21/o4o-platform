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
  let t = (s ?? '').replace(/\s+/g, '').replace(/[·.,()（）･・‧]/g, '');
  t = t.replace(/^항산화작용을하여/, ''); // 비타민E 접두 변이
  t = t.replace(/도움을?줄?수?있(음|습니다)?|도움을?줌요?|주는데도움|도움을?주는/g, '도움'); // 어미 변이(필요 의 '요'는 보존)
  return t.trim();
}

// 표준 MFDS 단일 영양소 기능성 ko → en. (여러 영양소가 공유하는 문구 포함: 항산화·에너지 등)
const RAW_MAP: Array<[string, string]> = [
  // 비타민 D (복합형 귀속용 — 단일 라인은 VD 별도라 미포함이었음)
  ['칼슘과 인이 흡수되고 이용되는데 필요', 'Needed for the absorption and utilisation of calcium and phosphorus'],
  ['뼈의 형성과 유지에 필요', 'Needed for the formation and maintenance of bone'],
  // 비타민 C
  ['결합조직 형성과 기능유지에 필요', 'Needed for the formation and maintenance of connective tissue'],
  ['결합조직 형성과 기능 유지에 필요', 'Needed for the formation and maintenance of connective tissue'],
  ['철의 흡수에 필요', 'Needed for the absorption of iron'],
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
  // 몰리브덴 (MFDS 공식 기능성 — 실제 제품 MAIN_FNCTN grounding)
  ['산화·환원 효소의 활성에 필요', 'Needed for the activity of oxidation-reduction (redox) enzymes'],
];

const FUNCTION_MAP: Record<string, string> = {};
for (const [ko, en] of RAW_MAP) FUNCTION_MAP[normFn(ko)] = en;

// ─── 기능성 원료 "…에 도움을 줄 수 있음" 편익 컴포넌트 ko→en (·로 나열) ───
const COMPONENT: Array<[RegExp, string]> = [
  [/^항산화(작용)?$/, 'antioxidant activity'],
  [/^체지방\s*감소$/, 'body-fat reduction'],
  [/^혈중\s*콜레스테롤\s*개선$/, 'improving blood cholesterol'],
  [/^혈중\s*중성지질\s*개선$/, 'improving blood triglyceride levels'],
  [/^혈행\s*개선$/, 'improving blood circulation'],
  [/^높은?\s*혈압\s*감소$/, 'lowering high blood pressure'],
  [/^간\s*건강$/, 'liver health'],
  [/^눈\s*건강$/, 'eye health'],
  [/건조한\s*눈을?\s*개선하여\s*눈\s*건강/, 'improving dry eyes for eye health'],
  [/^관절\s*및\s*연골\s*건강$/, 'joint and cartilage health'],
  [/^관절\s*및\s*연골건강$/, 'joint and cartilage health'],
  [/^기억력\s*개선$/, 'memory improvement'],
  [/스트레스로\s*인한\s*긴장완화/, 'relief of stress-induced tension'],
  [/^지구력\s*증진$/, 'improving endurance'],
  [/^피로개선$/, 'improving fatigue'],
  [/^면역력?\s*증진$/, 'supporting immune function'],
  [/^배변활동\s*원활$/, 'smooth bowel movements'],
  [/식후\s*혈당상승\s*억제/, 'suppressing the rise in blood sugar after meals'],
  [/^전립선\s*건강\s*유지$/, 'maintaining prostate health'],
  [/^전립선\s*건강$/, 'prostate health'],
  [/구강에서의?\s*항균작용/, 'antibacterial action in the mouth'],
  [/월경전\s*변화에\s*의한\s*불편한\s*상태\s*개선/, 'easing discomfort related to premenstrual changes'],
  [/면역과민반응에\s*의한\s*피부상태\s*개선/, 'improving skin condition related to immune hypersensitivity'],
  [/^피부보습$/, 'skin moisturisation'],
  [/탄수화물이\s*지방으로\s*합성되는\s*것을\s*억제하여\s*체지방\s*감소/, 'reducing body fat by inhibiting the conversion of carbohydrate into fat'],
  [/노화로\s*인해\s*감소될?\s*수\s*있는\s*황반색소밀도를?\s*유지하여\s*눈\s*건강/, 'maintaining macular pigment density (which can decline with age) for eye health'],
  [/황반색소밀도를?\s*유지/, 'maintaining macular pigment density'],
  [/^혈당\s*조절$/, 'blood sugar regulation'],
];
function mapComponent(ko: string): string | null {
  const c = ko.replace(/\s+/g, ' ').trim();
  for (const [re, en] of COMPONENT) if (re.test(c)) return en;
  return null;
}

/** 기능성 문구 ko → en. ①필요형(레지스트리) ②"…에 도움을 줄 수 있음/줌"형(컴포넌트 분해). 미매핑=null. */
export function mapFunctionEn(ko: string): string | null {
  const direct = FUNCTION_MAP[normFn(ko)];
  if (direct) return direct;
  const m = ko.replace(/\s+/g, ' ').trim().match(/^(.*?)에?\s*도움을?\s*(?:줄\s*수\s*있(?:음|습니다)|줌|주는)/);
  if (m) {
    const benefits = m[1].split(/[·･・‧]/).map((b) => b.trim()).filter(Boolean);
    const mapped = benefits.map(mapComponent);
    if (mapped.length && mapped.every((x) => x != null)) return `May help with ${enJoin(mapped as string[])}`;
    // 단일 편익이 문장형(예: 건조한 눈…)일 수 있음 — 통째 매핑 시도
    const whole = mapComponent(m[1].trim());
    if (whole) return `May help with ${whole}`;
    return null;
  }
  return null;
}
function enJoin(a: string[]): string { return a.length <= 1 ? (a[0] ?? '') : a.length === 2 ? `${a[0]} and ${a[1]}` : `${a.slice(0, -1).join(', ')}, and ${a[a.length - 1]}`; }

/** 질병 위험감소 기능(허용) 문구 — 사람검수 대상 표시용 */
export function isRiskReductionFn(ko: string): boolean {
  return /위험\s*감소에?\s*도움/.test(ko);
}

// ─── 원료별 공식 기능성 ko 세트 (복합형 함수 귀속용, normFn 키) ───
export const INGREDIENT_FN: Record<string, string[]> = {
  '비타민D': ['칼슘과 인이 흡수되고 이용되는데 필요', '뼈의 형성과 유지에 필요', '골다공증발생 위험 감소에 도움을 줌'],
  '아연': ['정상적인 면역기능에 필요', '정상적인 세포분열에 필요'],
  '칼슘': ['뼈와 치아 형성에 필요', '신경과 근육 기능 유지에 필요', '정상적인 혈액응고에 필요', '골다공증발생 위험 감소에 도움을 줌'],
  '마그네슘': ['에너지 이용에 필요', '신경과 근육 기능 유지에 필요'],
  '셀레늄': ['유해산소로부터 세포를 보호하는데 필요'],
  '비타민C': ['결합조직 형성과 기능유지에 필요', '철의 흡수에 필요', '유해산소로부터 세포를 보호하는데 필요'],
  '비타민E': ['유해산소로부터 세포를 보호하는데 필요'],
  '비타민A': ['어두운 곳에서 시각 적응을 위해 필요', '피부와 점막을 형성하고 기능을 유지하는데 필요', '상피세포의 성장과 발달에 필요'],
  '비타민K': ['정상적인 혈액응고에 필요', '뼈의 구성에 필요'],
  '비타민B1': ['탄수화물과 에너지 대사에 필요'],
  '비타민B2': ['체내 에너지 생성에 필요'],
  '비타민B6': ['단백질 및 아미노산 이용에 필요', '혈액의 호모시스테인 수준을 정상으로 유지하는데 필요'],
  '비타민B12': ['정상적인 엽산 대사에 필요'],
  '나이아신': ['체내 에너지 생성에 필요'],
  '판토텐산': ['지방, 탄수화물, 단백질 대사와 에너지 생성에 필요'],
  '비오틴': ['지방, 탄수화물, 단백질 대사와 에너지 생성에 필요'],
  '철': ['체내 산소운반과 혈액생성에 필요', '에너지 생성에 필요'],
  '엽산': ['세포와 혈액생성에 필요', '태아 신경관의 정상 발달에 필요', '혈액의 호모시스테인 수준을 정상으로 유지하는데 필요'],
  '구리': ['철의 운반과 이용에 필요', '유해산소로부터 세포를 보호하는데 필요'],
  '망간': ['뼈 형성에 필요', '에너지 이용에 필요', '유해산소로부터 세포를 보호하는데 필요'],
  '요오드': ['갑상선 호르몬의 합성에 필요', '에너지 생성에 필요', '신경발달에 필요'],
  '몰리브덴': ['산화·환원 효소의 활성에 필요'],
  'MSM': ['관절 및 연골건강에 도움을 줄 수 있음', '관절 및 연골 건강에 도움을 줄 수 있음'],
  '글루코사민': ['관절 및 연골 건강에 도움을 줄 수 있음', '관절 및 연골 건강·피부보습에 도움을 줄 수 있음'],
  '루테인': ['노화로 인해 감소될 수 있는 황반색소밀도를 유지하여 눈 건강에 도움을 줄 수 있음'],
  '밀크씨슬': ['간 건강에 도움을 줄 수 있음'],
  '코엔자임Q10': ['항산화·높은 혈압 감소에 도움을 줄 수 있음', '항산화에 도움을 줄 수 있음', '높은 혈압 감소에 도움을 줄 수 있음'],
  '식이섬유': ['배변활동 원활에 도움을 줄 수 있음', '혈중 콜레스테롤 개선에 도움을 줄 수 있음', '식후 혈당상승 억제에 도움을 줄 수 있음'],
  '옥타코사놀': ['지구력 증진에 도움을 줄 수 있음'],
  // ─── 기능성 원료 registry 확장(WO) — ko 는 실 MAIN_FNCTN 에서 추출(grounded). 복합형 조합 귀속용 ───
  '오메가3': ['혈중 중성지질 개선·혈행 개선에 도움을 줄 수 있음', '혈중 중성지질 개선에 도움을 줄 수 있음', '혈행 개선에 도움을 줄 수 있음', '건조한 눈을 개선하여 눈 건강에 도움을 줄 수 있음', '기억력 개선에 도움을 줄 수 있음'],
  '가르시니아': ['탄수화물이 지방으로 합성되는 것을 억제하여 체지방 감소에 도움을 줄 수 있음', '체지방 감소에 도움을 줄 수 있음'],
  '녹차': ['항산화·체지방 감소·혈중 콜레스테롤 개선에 도움을 줄 수 있음', '항산화에 도움을 줄 수 있음', '체지방 감소에 도움을 줄 수 있음', '혈중 콜레스테롤 개선에 도움을 줄 수 있음'],
  '감마리놀렌산': ['혈중 콜레스테롤 개선·혈행개선·월경전 변화에 의한 불편한 상태 개선·면역과민반응에 의한 피부상태 개선에 도움을 줄 수 있음', '면역과민반응에 의한 피부상태 개선에 도움을 줄 수 있음', '월경전 변화에 의한 불편한 상태 개선에 도움을 줄 수 있음', '혈행개선에 도움을 줄 수 있음', '혈중 콜레스테롤 개선에 도움을 줄 수 있음'],
  '프로폴리스': ['항산화에 도움을 줄 수 있음', '구강에서의 항균작용에 도움을 줄 수 있음'],
  '은행잎': ['기억력 개선·혈행 개선에 도움을 줄 수 있음', '기억력 개선에 도움을 줄 수 있음', '혈행 개선에 도움을 줄 수 있음'],
  '테아닌': ['스트레스로 인한 긴장완화에 도움을 줄 수 있음'],
};
const INGREDIENT_FN_NORM: Record<string, Set<string>> = {};
for (const [k, arr] of Object.entries(INGREDIENT_FN)) INGREDIENT_FN_NORM[k] = new Set(arr.map(normFn));
/** ko 기능성 문구가 해당 원료의 공식 기능성 집합에 속하는가 (normFn 매칭) */
export function fnBelongsTo(koFn: string, key: string): boolean {
  const set = INGREDIENT_FN_NORM[key]; if (!set) return false;
  const n = normFn(koFn); if (set.has(n)) return true;
  for (const e of set) if (n.includes(e) || e.includes(n)) return true;
  return false;
}

export interface NutrientMeta { key: string; slug: string; displayKo: string; displayEn: string; kind?: 'nutrient' | 'functional' }
export const FUNCTIONAL_META: Record<string, NutrientMeta> = {
  'MSM': { key: 'MSM', slug: 'msm', displayKo: 'MSM', displayEn: 'MSM', kind: 'functional' },
  '루테인': { key: '루테인', slug: 'lutein', displayKo: '루테인', displayEn: 'Lutein', kind: 'functional' },
  '밀크씨슬': { key: '밀크씨슬', slug: 'milk-thistle', displayKo: '밀크씨슬', displayEn: 'Milk thistle', kind: 'functional' },
  '코엔자임Q10': { key: '코엔자임Q10', slug: 'coenzyme-q10', displayKo: '코엔자임Q10', displayEn: 'Coenzyme Q10', kind: 'functional' },
  '녹차': { key: '녹차', slug: 'green-tea', displayKo: '녹차 카테킨', displayEn: 'Green tea catechin', kind: 'functional' },
  '가르시니아': { key: '가르시니아', slug: 'garcinia', displayKo: '가르시니아캄보지아 추출물', displayEn: 'Garcinia cambogia extract', kind: 'functional' },
  '감마리놀렌산': { key: '감마리놀렌산', slug: 'gla', displayKo: '감마리놀렌산', displayEn: 'Gamma-linolenic acid', kind: 'functional' },
  '글루코사민': { key: '글루코사민', slug: 'glucosamine', displayKo: '글루코사민', displayEn: 'Glucosamine', kind: 'functional' },
  '프로폴리스': { key: '프로폴리스', slug: 'propolis', displayKo: '프로폴리스', displayEn: 'Propolis', kind: 'functional' },
  '오메가3': { key: '오메가3', slug: 'omega-3', displayKo: '오메가3', displayEn: 'Omega-3', kind: 'functional' },
  '식이섬유': { key: '식이섬유', slug: 'dietary-fibre', displayKo: '식이섬유', displayEn: 'Dietary fibre', kind: 'functional' },
  '테아닌': { key: '테아닌', slug: 'theanine', displayKo: 'L-테아닌', displayEn: 'L-theanine', kind: 'functional' },
  '은행잎': { key: '은행잎', slug: 'ginkgo', displayKo: '은행잎추출물', displayEn: 'Ginkgo leaf extract', kind: 'functional' },
  '옥타코사놀': { key: '옥타코사놀', slug: 'octacosanol', displayKo: '옥타코사놀', displayEn: 'Octacosanol', kind: 'functional' },
};
export const NUTRIENT_META: Record<string, NutrientMeta> = {
  '비타민D': { key: '비타민D', slug: 'vitamin-d', displayKo: '비타민 D', displayEn: 'Vitamin D' },
  '비타민C': { key: '비타민C', slug: 'vitamin-c', displayKo: '비타민 C', displayEn: 'Vitamin C' },
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
  '몰리브덴': { key: '몰리브덴', slug: 'molybdenum', displayKo: '몰리브덴', displayEn: 'Molybdenum' },
};
