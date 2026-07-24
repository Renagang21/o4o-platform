/**
 * Agent B 소유 — **additive** 기능성 원료 레지스트리. 공용 `hff-nutrient-registry.ts` 는 수정하지 않는다.
 *
 * 배경(WO-O4O-HFF-UNREGISTERED-INGREDIENT-BULK-PRODUCTION-B-V1):
 *   직전 라운드에서 규격 라인이 **완전히 구조화되어 있는데도** 생산되지 못한 후보가 남았고, 그 원인은
 *   파서가 아니라 **registry 미등록 실재 기능성 원료** 였다(코로솔산·로르산·아스타잔틴 …).
 *
 * 설계 원칙
 *  1) **지표성분 ≠ 원료명.** 공전 고시형 원료의 규격 라벨은 지표성분(코로솔산·로르산·진세노사이드)으로 적힌다.
 *     표시량은 그 **지표성분의 양**이므로, 원료명만 단독 표기하면 수치가 오귀속된다.
 *     → displayKo/En 을 `원료명 (지표성분)` 으로 두어 **표시량이 지표성분에 귀속됨을 문면에 보존**한다.
 *  2) **기능성 문구는 전량 실측.** 아래 `B_INGREDIENT_FN` 은 shard 후보 MAIN_FNCTN 을 공용
 *     `splitFunctions` 로 분해해 실제 출현한 문구만 담았다(`hff-unreg-b-fncensus.ts` 산출).
 *     추정 문구·번역 문구는 넣지 않는다.
 *  3) **귀속은 정확 일치.** 공용 `fnBelongsTo` 는 양방향 substring 포함을 허용해
 *     `피로개선` 이 `스트레스로 인한 피로 개선`(홍경천)을 삼키는 교차귀속이 발생한다.
 *     B 키는 `normFn` **정확 일치**만 인정하고, 미등재 변형은 조용히 삼키지 않고 HOLD 로 보낸다.
 *  4) **EN 은 공용 컴포넌트 재사용.** 미매핑 편익만 B 컴포넌트로 보완하고, 그래도 미매핑이면 null →
 *     해당 제품 HOLD(임의 번역 금지).
 */
import { NUTRIENT_META, FUNCTIONAL_META, mapFunctionEn, fnBelongsTo, normFn, type NutrientMeta } from './hff-nutrient-registry.js';

// ─── 1. 원료 메타 ────────────────────────────────────────────────────────────
export const B_META: Record<string, NutrientMeta> = {
  홍삼: { key: '홍삼', slug: 'korean-red-ginseng', displayKo: '홍삼 (진세노사이드 Rg1·Rb1·Rg3의 합)', displayEn: 'Korean red ginseng (total ginsenosides Rg1, Rb1, Rg3)', kind: 'functional' },
  인삼: { key: '인삼', slug: 'korean-ginseng', displayKo: '인삼 (진세노사이드 Rg1·Rb1의 합)', displayEn: 'Korean ginseng (total ginsenosides Rg1, Rb1)', kind: 'functional' },
  바나바잎: { key: '바나바잎', slug: 'banaba-leaf-extract', displayKo: '바나바잎추출물 (코로솔산)', displayEn: 'Banaba leaf extract (corosolic acid)', kind: 'functional' },
  쏘팔메토: { key: '쏘팔메토', slug: 'saw-palmetto-extract', displayKo: '쏘팔메토열매추출물 (로르산)', displayEn: 'Saw palmetto fruit extract (lauric acid)', kind: 'functional' },
  헤마토코쿠스: { key: '헤마토코쿠스', slug: 'haematococcus-extract', displayKo: '헤마토코쿠스추출물 (아스타잔틴)', displayEn: 'Haematococcus extract (astaxanthin)', kind: 'functional' },
  히알루론산: { key: '히알루론산', slug: 'hyaluronic-acid', displayKo: '히알루론산', displayEn: 'Hyaluronic acid', kind: 'functional' },
  홍경천: { key: '홍경천', slug: 'rhodiola-rosea-extract', displayKo: '홍경천추출물 (로사빈)', displayEn: 'Rhodiola rosea extract (rosavin)', kind: 'functional' },
  포스파티딜세린: { key: '포스파티딜세린', slug: 'phosphatidylserine', displayKo: '포스파티딜세린', displayEn: 'Phosphatidylserine', kind: 'functional' },
  폴리감마글루탐산: { key: '폴리감마글루탐산', slug: 'poly-gamma-glutamic-acid', displayKo: '폴리감마글루탐산', displayEn: 'Poly-γ-glutamic acid', kind: 'functional' },
  콜레우스포스콜리: { key: '콜레우스포스콜리', slug: 'coleus-forskohlii-extract', displayKo: '콜레우스포스콜리추출물 (포스콜린)', displayEn: 'Coleus forskohlii extract (forskolin)', kind: 'functional' },
  회화나무열매: { key: '회화나무열매', slug: 'sophora-japonica-fruit-extract', displayKo: '회화나무열매추출물 (소포리코사이드)', displayEn: 'Sophora japonica fruit extract (sophoricoside)', kind: 'functional' },
  칼륨: { key: '칼륨', slug: 'potassium', displayKo: '칼륨', displayEn: 'Potassium', kind: 'nutrient' },
};

/** 공용 → B 순서로 조회. 공용 키를 덮어쓰지 않는다. */
export function bMeta(k: string): NutrientMeta | undefined { return NUTRIENT_META[k] ?? FUNCTIONAL_META[k] ?? B_META[k]; }
export function isBKey(k: string): boolean { return Object.prototype.hasOwnProperty.call(B_META, k) && !NUTRIENT_META[k] && !FUNCTIONAL_META[k]; }

// ─── 2. 원료별 공식 기능성 ko (전량 실측 출현 문구) ──────────────────────────
export const B_INGREDIENT_FN: Record<string, string[]> = {
  홍삼: [
    '면역력 증진·피로개선·혈소판 응집억제를 통한 혈액흐름·기억력 개선·항산화·갱년기 여성의 건강에 도움을 줄 수 있음',
    '면역력 증진·피로개선·혈소판 응집억제를 통한 혈액흐름·기억력 개선·항산화에 도움을 줄 수 있음',
    '혈소판 응집억제를 통한 혈액흐름·기억력 개선·항산화에 도움을 줄 수 있음',
    '면역력 증진·피로개선에 도움을 줄 수 있음',
    '면역력 증진에 도움을 줄 수 있음',
    '피로개선에 도움을 줄 수 있음',
    '혈소판 응집 억제를 통한 혈액흐름에 도움을 줄 수 있음',
    '기억력 개선에 도움을 줄 수 있음',
    '항산화에 도움을 줄 수 있음',
    '갱년기 여성의 건강에 도움을 줄 수 있음',
  ],
  인삼: ['면역력 증진·피로개선에 도움을 줄 수 있음', '면역력 증진에 도움을 줄 수 있음', '피로개선에 도움을 줄 수 있음'],
  바나바잎: ['식후 혈당상승 억제에 도움을 줄 수 있음'],
  쏘팔메토: ['전립선 건강의 유지에 도움을 줄 수 있음', '전립선 건강 유지에 도움을 줄 수 있음'],
  헤마토코쿠스: ['눈의 피로도 개선에 도움을 줄 수 있음'],
  히알루론산: [
    '피부보습에 도움을 줄 수 있음',
    '피부보습·자외선에 의한 피부손상으로부터 피부건강 유지에 도움을 줄 수 있음',
    '자외선에 의한 피부손상으로부터 피부 건강 유지에 도움을 줄 수 있음',
  ],
  홍경천: ['스트레스로 인한 피로 개선에 도움을 줄 수 있음'],
  포스파티딜세린: [
    '노화로 인해 저하된 인지력 개선·자외선에 의한 피부 손상으로부터 피부 건강 유지·피부보습에 도움을 줄 수 있음',
    '노화로 인해 저하된 인지력 개선에 도움을 줄 수 있음',
    '자외선에 의한 피부 손상으로부터 피부 건강 유지에 도움을 줄 수 있음',
    '피부보습에 도움을 줄 수 있음',
  ],
  폴리감마글루탐산: ['체내 칼슘흡수 촉진에 도움을 줄 수 있음'],
  콜레우스포스콜리: ['체지방 감소에 도움을 줄 수 있음'],
  회화나무열매: ['갱년기 여성의 건강에 도움을 줄 수 있음'],
  칼륨: ['체내 물과 전해질 균형에 필요'],
};
const B_FN_NORM: Record<string, Set<string>> = {};
for (const [k, arr] of Object.entries(B_INGREDIENT_FN)) B_FN_NORM[k] = new Set(arr.map(normFn));

/** B 키는 정확 일치만(교차귀속 차단). 공용 키는 공용 규칙 그대로. */
export function bFnBelongsTo(koFn: string, key: string): boolean {
  if (isBKey(key)) return B_FN_NORM[key]?.has(normFn(koFn)) ?? false;
  return fnBelongsTo(koFn, key);
}

// ─── 3. EN 매핑 (공용 미매핑 편익만 보완) ────────────────────────────────────
const B_FUNCTION_MAP: Record<string, string> = {};
for (const [ko, en] of [
  ['체내 물과 전해질 균형에 필요', 'Needed for the balance of water and electrolytes in the body'],
] as Array<[string, string]>) B_FUNCTION_MAP[normFn(ko)] = en;

const B_COMPONENT: Array<[RegExp, string]> = [
  [/^혈소판\s*응집\s*억제를\s*통한\s*혈액\s*흐름$/, 'blood flow through the inhibition of platelet aggregation'],
  [/^갱년기\s*여성의?\s*건강$/, "women's health during menopause"],
  [/^전립선\s*건강의\s*유지$/, 'maintaining prostate health'],
  [/^눈의\s*피로도\s*개선$/, 'reducing eye fatigue'],
  [/^스트레스로\s*인한\s*피로\s*개선$/, 'improving stress-related fatigue'],
  [/^노화로\s*인해\s*저하된\s*인지력\s*개선$/, 'improving cognitive function reduced by ageing'],
  [/^자외선에\s*의한\s*피부\s*손상으로부터\s*피부\s*건강\s*유지$/, 'maintaining skin health against UV-induced skin damage'],
  [/^체내\s*칼슘\s*흡수\s*촉진$/, 'promoting calcium absorption in the body'],
];
function enJoin(a: string[]): string { return a.length <= 1 ? (a[0] ?? '') : a.length === 2 ? `${a[0]} and ${a[1]}` : `${a.slice(0, -1).join(', ')}, and ${a[a.length - 1]}`; }
function mapComponentB(c: string): string | null {
  const t = c.replace(/\s+/g, ' ').trim();
  for (const [re, en] of B_COMPONENT) if (re.test(t)) return en;
  const viaPublic = mapFunctionEn(`${t}에 도움을 줄 수 있음`); // 공용 COMPONENT 표를 그대로 재사용
  return viaPublic ? viaPublic.replace(/^May help with /, '') : null;
}
/** 공용 매핑 우선 → 미매핑 시 B 컴포넌트로 분해 재시도. 그래도 미매핑이면 null(=제품 HOLD). */
export function bMapFunctionEn(ko: string): string | null {
  const direct = B_FUNCTION_MAP[normFn(ko)];
  if (direct) return direct;
  const pub = mapFunctionEn(ko);
  if (pub) return pub;
  const m = ko.replace(/\s+/g, ' ').trim().match(/^(.*?)에?\s*도움을?\s*(?:줄\s*수\s*있(?:음|습니다)|줌|주는)/);
  if (!m) return null;
  const parts = m[1].split(/[·･・‧]/).map((x) => x.trim()).filter(Boolean);
  const mapped = parts.map(mapComponentB);
  if (mapped.length && mapped.every((x) => x != null)) return `May help with ${enJoin(mapped as string[])}`;
  const whole = mapComponentB(m[1].trim());
  return whole ? `May help with ${whole}` : null;
}

// ─── 4. G-MULTI-AMOUNT-SOURCE 용 원문 라벨 정규식 ────────────────────────────
/** 각 B 원료의 표시량이 **자기 라벨 구간**에 있는지 검증하기 위한 BASE_STANDARD 라벨 패턴. */
export const B_SRC_LABEL: Record<string, RegExp> = {
  홍삼: /진세노사이드[\s]*Rg1/i,
  인삼: /진세노사이드[\s]*Rg1/i,
  바나바잎: /코로솔산/i,
  쏘팔메토: /로르산|lauric\s*acid/i,
  헤마토코쿠스: /아스타잔틴|astaxanthin/i,
  히알루론산: /히알루론산/i,
  홍경천: /로사빈|rosavin/i,
  포스파티딜세린: /포스파티딜\s*세린|phosphatidylserine/i,
  폴리감마글루탐산: /폴리감마글루탐산|poly[\s-]*γ|PGA/i,
  콜레우스포스콜리: /포스콜린|forskolin/i,
  회화나무열매: /소포리코사이드|sophoricoside/i,
  칼륨: /칼륨/i,
};
