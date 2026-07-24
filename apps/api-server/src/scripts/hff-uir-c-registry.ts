/**
 * WO-O4O-HFF-UNREGISTERED-INGREDIENT-BULK-PRODUCTION-C-V1 — C 전용 미등록 원료 additive mapping.
 *
 * 대상: 공식 원문(BASE_STANDARD)에 **표시량 규격으로 명확히 선언**되어 있으나 공용 registry 에 없어
 *       한 번도 생산되지 못한 실재 기능성 원료. 전부 census(`hff-uir-c-census.ts`) 실측 라벨 근거이며
 *       제품명·브랜드명 추정은 사용하지 않는다.
 *
 * 안전 계약
 *   · 라벨 → key 는 **원문 규격 라벨**로만 판정한다.
 *   · 각 key 는 그 원료의 **공식 기능성 집합**을 가지며, 추출된 KO 기능성이 전부 그 집합에 속할 때만 생산한다
 *     (하나라도 밖이면 HOLD) → 개별인정형·타 원료 기능성이 generic 원료로 끌려오는 것을 차단.
 *   · EN 은 정본 매핑만 사용하고 미매핑은 HOLD(임의 영문 생성 0).
 *   · 공용 파일(`hff-source-parse`/`hff-sf-registry`/`hff-nutrient-registry`/`hff-sf-compose`)은 수정하지 않는다.
 */
import type { SfIngredient } from './hff-sf-registry.js';

const norm = (s: string): string => (s ?? '').replace(/[（]/g, '(').replace(/[）]/g, ')').replace(/\s+/g, '').replace(/[·･・‧]/g, '·').replace(/[.。]+$/, '');

/**
 * 규격 라벨 → 기능성 원료 key.
 * 근거(census sole-label 빈도): 조단백질 53 · 칼륨 24 · 프로바이오틱스(bare) 17 · 크레아틴 모노하이드레이트 21 ·
 * 총 안토시아노사이드 9 · 안트라퀴논계화합물(무수바바로인으로서) 9 · 철(bare) 7.
 */
export const UIR_LABELS: Array<{ re: RegExp; key: string }> = [
  // 고시형 영양성분 «단백질» — 규격은 조단백질(crude protein) 정량으로 표기된다.
  { re: /^조단백질?(\s*함량)?$|^단백질\s*함량|^단백질$|단백질\s*함량\(g\)/, key: '단백질' },
  { re: /^칼륨/, key: '칼륨' },
  { re: /^철(\s*\(|\s*함량|$)/, key: '철' },
  { re: /크레아틴\s*모노\s*하이드레이트|^크레아틴/, key: '크레아틴' },
  // 알로에 전잎 — 지표성분이 안트라퀴논계화합물(무수바바로인) 이다. 알로에 겔(겔 다당체) 과 지표가 다르다.
  { re: /안트라퀴논계?\s*화합물|무수바바로인/, key: '알로에전잎' },
  // 빌베리추출물 — 지표성분 총 안토시아노사이드. 동일 지표를 쓰는 타 원료(크랜베리 등)는
  // 공식 기능성 집합(눈의 피로 개선) 밖이므로 FN 게이트에서 전량 HOLD 된다.
  { re: /안토시아노사이드/, key: '빌베리추출물' },
  // 프로바이오틱스 — 직전 WO 는 `프로바이오틱스 수/함량` 형태만 인식. 규격 라벨이 원료명 단독인 표기도 존재.
  { re: /^프로바이오틱스$|^유산균$|^생균$/, key: '프로바이오틱스' },
  // 쏘팔메토 열매 추출물 — 지표성분이 «로르산(라우르산)». 공용 SF 는 원료명 라벨(`쏘팔메토|톱야자`)만 인식해
  // 지표성분 표기 제품이 전량 미해소였다(단일 라벨 129건 = WO 의 «같은 원인 100건 이상» 보완 트리거).
  // 원문 실측: 해당 제품군의 공식 기능성은 «전립선 건강의 유지» 로 일관되며, 그 외 문장이 있으면 FN 게이트가 HOLD 한다.
  { re: /^로르산/, key: '쏘팔메토열매추출물' },
  // ─── WO-O4O-HFF-UNREGISTERED-INDICATOR-REMAINDER-C-V1 — 지표성분 라벨(원료명과 다름) ───
  // 홍국 — 규격 라벨 = 지표성분 «모나콜린 K». 공용 SF 는 원료명 라벨(`홍국`)만 인식해 지표성분 표기 제품이 미해소였다.
  { re: /^모나콜린/, key: '홍국' },
  // 프로폴리스 — 정량 라벨 «총 플라보노이드»(공용 classify 인식) + 확인 라벨 «계피산 / 파라(ρ)-쿠마르산»(미해소)이 공존.
  // 확인 라벨만 미해소여서 프로폴리스 제품이 전량 UNKNOWN_SPEC_LABEL 이었다. 두 확인 라벨을 프로폴리스로 해소한다.
  { re: /^계피산|쿠마르산/, key: '프로폴리스' },
  // 대두이소플라본 — 규격 라벨 «대두이소플라본(비배당체로서)». 뼈 건강 고시형. (방광 배뇨기능 개별인정형은 FN 게이트가 HOLD)
  { re: /^대두이소플라본/, key: '대두이소플라본' },
  // 홍경천 추출물 — 규격 라벨 = 지표성분 «로사빈(Rosavin)».
  { re: /^로사빈/, key: '홍경천' },
  // 회화나무열매 추출물 — 규격 라벨 = 지표성분 «소포리코사이드».
  { re: /^소포리코사이드/, key: '회화나무열매' },
  // 폴리감마글루탐산 — 규격 라벨 원료명 단독. (체내 칼슘흡수 촉진 — 칼슘 동반 제품은 MULTI 로 HOLD)
  { re: /^폴리감마글루탐산/, key: '폴리감마글루탐산' },
];

/** C 전용 비기능 규격 라벨 — 공용 NONFUNC 미포함분(곰팡이독소 한도 등). build 의 nonFunctional() 에 OR 로 결합. */
export const UIR_NONFUNC = /시트리닌|citrinin/i;

/** 신규 key 의 원료 메타(공용 registry 에 존재하지 않는 것만). */
export const UIR_INGREDIENTS: Record<string, SfIngredient> = {
  '단백질': { key: '단백질', slug: 'protein', displayKo: '단백질', displayEn: 'Protein', labelRe: /조단백질?|단백질/, statusHint: 'READY' },
  '칼륨': { key: '칼륨', slug: 'potassium', displayKo: '칼륨', displayEn: 'Potassium', labelRe: /칼륨/, statusHint: 'READY' },
  '크레아틴': { key: '크레아틴', slug: 'creatine', displayKo: '크레아틴', displayEn: 'Creatine', labelRe: /크레아틴/, statusHint: 'READY' },
  // 지표성분형 신규 원료(공용 registry 미존재). 홍국·프로폴리스는 공용 SF/FUNCTIONAL_META 로 해소되므로 미등재.
  '대두이소플라본': { key: '대두이소플라본', slug: 'soy-isoflavone', displayKo: '대두이소플라본', displayEn: 'Soy isoflavones', labelRe: /대두이소플라본/, statusHint: 'READY' },
  '홍경천': { key: '홍경천', slug: 'rhodiola-rosea', displayKo: '홍경천추출물', displayEn: 'Rhodiola rosea extract', labelRe: /로사빈|홍경천/, statusHint: 'READY' },
  '회화나무열매': { key: '회화나무열매', slug: 'sophora-fruit', displayKo: '회화나무열매추출물', displayEn: 'Sophora japonica fruit extract', labelRe: /소포리코사이드|회화나무/, statusHint: 'READY' },
  '폴리감마글루탐산': { key: '폴리감마글루탐산', slug: 'poly-gamma-glutamic-acid', displayKo: '폴리감마글루탐산', displayEn: 'Poly-γ-glutamic acid', labelRe: /폴리감마글루탐산/, statusHint: 'READY' },
};

/** key 별 **공식 기능성 집합** — 전부 실제 MAIN_FNCTN 원문에서 확인된 문구. */
export const UIR_INGREDIENT_FN: Record<string, string[]> = {
  '단백질': [
    '근육, 결합조직 등 신체조직의 구성성분',
    '효소, 호르몬, 항체의 구성에 필요',
    '체내 필수 영양성분이나 활성물질의 운반과 저장에 필요',
    '체액, 산-염기의 균형 유지에 필요',
    '에너지, 포도당, 지질의 합성에 필요',
  ],
  '칼륨': ['체내 물과 전해질 균형에 필요'],
  '철': ['체내 산소운반과 혈액생성에 필요', '에너지 생성에 필요'],
  '크레아틴': ['근력 운동 시에 운동수행능력 향상에 도움을 줄 수 있음', '운동수행능력 향상에 도움을 줄 수 있음'],
  '알로에전잎': ['배변활동 원활에 도움을 줄 수 있음'],
  '빌베리추출물': ['눈의 피로 개선에 도움을 줄 수 있음'],
  '쏘팔메토열매추출물': ['전립선 건강의 유지에 도움을 줄 수 있음', '전립선 건강 유지에 도움을 줄 수 있음'],
  // ─── 지표성분형(WO-...-INDICATOR-REMAINDER-C-V1) — 전부 실 MAIN_FNCTN 원문 확인 ───
  '홍국': ['혈중 콜레스테롤 개선에 도움을 줄 수 있음'],
  '프로폴리스': ['항산화에 도움을 줄 수 있음', '구강에서의 항균작용에 도움을 줄 수 있음', '항산화·구강에서의 항균작용에 도움을 줄 수 있음'],
  '대두이소플라본': ['뼈 건강에 도움을 줄 수 있음', '뼈 건강에 도움을 줌'],
  '홍경천': ['스트레스로 인한 피로 개선에 도움을 줄 수 있음', '스트레스로 인한 피로개선에 도움을 줄 수 있음'],
  '회화나무열매': ['갱년기 여성의 건강에 도움을 줄 수 있음'],
  '폴리감마글루탐산': ['체내 칼슘흡수 촉진에 도움을 줄 수 있음'],
};

const UIR_FN_NORM: Record<string, Set<string>> = {};
for (const [k, arr] of Object.entries(UIR_INGREDIENT_FN)) UIR_FN_NORM[k] = new Set(arr.map(norm));

/** 추출된 KO 기능성이 해당 key 의 공식 집합에 속하는가 (완전일치 또는 포함). */
export function uirFnBelongsTo(koFn: string, key: string): boolean {
  const set = UIR_FN_NORM[key]; if (!set) return false;
  const n = norm(koFn);
  for (const e of set) if (n === e || n.includes(e)) return true;
  return false;
}

/**
 * KO 기능성 추출 — 공용 `extractFunctionsKo` 와 동일한 분해 규칙에
 * **«…에 필요» / «구성성분» 형(고시형 영양성분 표시문구)** 을 추가로 인정한다.
 * 공용 필터(`도움|개선|유지|억제|완화|증진|보호|보습`)에는 «필요»·«구성성분» 이 없어
 * 단백질·칼륨·철 등의 공식 표시문구가 통째로 탈락하기 때문이다. 공용 파일은 수정하지 않는다.
 */
export function extractFunctionsUir(mainFn: string): string[] {
  let raw = (mainFn ?? '').replace(/[（]/g, '(').replace(/[）]/g, ')');
  raw = raw.replace(/\(?\s*영문\s*\)?[\s\S]*$/, '').replace(/May\s+help[\s\S]*$/i, '').replace(/\(?\s*국문\s*\)?/g, '');
  let t = raw.replace(/\s+/g, ' ').trim();
  t = t.replace(/\[[^\]]*\]/g, ' ');
  const parts = t.split(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫]|(?:^|\s)\(?\d+[).]|\s*\/\s*|(?:^|\s)\(\s*[가-하]\s*\)|(?<=있음|있습니다|없음|필요|구성성분)[.。]?\s+(?=[가-힣])/);
  return [...new Set(parts
    .map((x) => x.trim().replace(/^[-•*\s:：·,，＊*]+/, '').replace(/[.。\s]+$/, '').trim())
    .filter((x) => x.length >= 5 && /도움|개선|유지|억제|완화|증진|보호|보습|필요|구성성분/.test(x)))];
}

/**
 * EN 정본 — 전부 완전일치. 접두일치는 결합 문장에서 뒤쪽 공식 기능성을 조용히 소실시킨다(직전 WO 실측 결함).
 * «…에 필요» 형은 MFDS 표시기준의 영문 표현 관용(Needed for …)을 따르며, 문장 단위로만 매핑한다.
 */
const UIR_FN_EN: Array<{ re: RegExp; en: string }> = [
  // 단백질 (고시형 영양성분)
  { re: /^근육,?결합조직등신체조직의구성성분$/, en: 'A constituent of body tissues such as muscle and connective tissue' },
  { re: /^효소,?호르몬,?항체의구성에필요$/, en: 'Needed for the formation of enzymes, hormones and antibodies' },
  { re: /^체내필수영양성분이나활성물질의운반과저장에필요$/, en: 'Needed for the transport and storage of essential nutrients and active substances in the body' },
  { re: /^체액,?산-?염기의균형유지에필요$/, en: 'Needed to help maintain the balance of body fluids and acid-base' },
  { re: /^에너지,?포도당,?지질의합성에필요$/, en: 'Needed for the synthesis of energy, glucose and lipids' },
  // 칼륨
  { re: /^체내물과전해질균형에필요$/, en: 'Needed for the balance of water and electrolytes in the body' },
  // 크레아틴
  { re: /^근력운동시에운동수행능력향상에도움을줄수있음$/, en: 'May help improve exercise performance during resistance exercise' },
  { re: /^운동수행능력향상에도움을줄수있음$/, en: 'May help improve exercise performance' },
  // 알로에 전잎
  { re: /^배변활동원활에도움을줄수있음$/, en: 'May help support smooth bowel movements' },
  // 빌베리추출물
  { re: /^눈의피로개선에도움을줄수있음$/, en: 'May help improve eye fatigue' },
  // 쏘팔메토 열매 추출물 — 공용 FUNCTION_MAP 은 조사 없는 «전립선 건강 유지» 형만 인식하므로
  // 원문 표기(«전립선 건강의 유지») 를 정본으로 직접 매핑한다(의미 동일 보존).
  { re: /^전립선건강의?유지에도움을줄수있음$/, en: 'May help maintain prostate health' },
  // ─── 지표성분형 — 공용 FUNCTION_MAP 이 null 반환하는 문장만 정본 추가(홍국 혈중콜레스테롤·프로폴리스 항산화/구강항균은 공용 폴백 사용) ───
  // 대두이소플라본
  { re: /^뼈건강에도움을(줄수있음|줌)$/, en: 'May help support bone health' },
  // 홍경천 (스트레스로 인한 피로 개선 — 공백 유무 동일 정규화)
  { re: /^스트레스로인한피로개선에도움을줄수있음$/, en: 'May help improve stress-related fatigue' },
  // 회화나무열매
  { re: /^갱년기여성의?건강에도움을줄수있음$/, en: "May help support women's health during menopause" },
  // 폴리감마글루탐산
  { re: /^체내칼슘흡수촉진에도움을줄수있음$/, en: 'May help promote calcium absorption in the body' },
];

/** KO 기능성 문장 → EN 정본. 미매핑이면 null(호출부에서 HOLD). */
export function mapFunctionEnUir(ko: string): string | null {
  // 원문 표기 잔재(«홍경천추출물:» / «기능성내용:» 접두, «(기타기능Ⅱ)»·«(제2등급)» 접미)만 제거 후 정본 문장 매칭.
  // ko 본체는 호출부에서 그대로 보존되므로(커버리지·FN집합 게이트 무훼손) EN 매핑 단계에서만 정규화한다.
  const n = norm(ko)
    .replace(/^[가-힣a-z0-9·]{1,25}?(?:추출물|분말|제품|함유유지|엑스|농축액|내용):/, '')
    .replace(/\((?:기타기능|생리활성기능|기능성|제?\d+등급)[^)]*\)$/, '');
  const hit = UIR_FN_EN.find((x) => x.re.test(n));
  return hit ? hit.en : null;
}
