/**
 * WO-O4O-HFF-NO-FUNCTIONAL-KEY-BULK-PRODUCTION-C-V1 — **Agent C 전용 additive registry**.
 *
 * 배경: 공용 `parseSpecs` 는 «라벨 : 값단위/기준량단위 의 X~Y%» 형태의 표시량 규격만 기능성 원료로
 *       인식한다. 프로바이오틱스(CFU 계수)·홍삼(지표성분 %)처럼 **공식 기준·규격이 다른 표기 체계**를
 *       쓰는 제품은 기능성 키가 0개로 잡혀 `NO_FUNCTIONAL_KEY` 로 전량 보류됐다.
 *
 * 본 파일은 공용 `hff-source-parse` / `hff-sf-registry` / `hff-nutrient-registry` 를 **수정하지 않고**
 * C lane 에서만 쓰는 additive 매핑을 제공한다. 모든 항목은 제품 BASE_STANDARD·MAIN_FNCTN **원문 근거**이며
 * 제품명 추정으로 만든 항목은 없다.
 *
 * 안전 계약(이전 noBracket WO 의 «기능성 원료 정확히 1종» 불변식을 강화):
 *   `specLabels()` 가 BASE_STANDARD 규격 항목을 **전부 열거**하고, 각 라벨은 반드시
 *   ① 비기능 규격(성상·중금속·미생물 등) ② 공용 `classify()` ③ 본 파일 `NFK_LABELS`
 *   셋 중 하나로 해소되어야 한다. 하나라도 미해소면 제품 HOLD(C_UNKNOWN_SPEC_LABEL).
 *   → «규격에 선언됐는데 못 본 원료» 가 존재할 수 없으므로 단일 귀속이 구조적으로 보장된다.
 */
import type { SfIngredient } from './hff-sf-registry.js';

/** 규격 항목 구분자: ①~⑮ · `1)` · `1.` · `(1)` · `가.` · 세미콜론/개행. */
const ITEM_SPLIT = /[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]|(?:^|\s)\(?\d{1,2}[).]\s|(?:^|\s)[가-하]\.\s|[;；\n]/g;

/**
 * BASE_STANDARD(정규화 후) → 규격 항목 라벨 전량.
 * 각 항목의 첫 `:` 앞 텍스트를 라벨로 본다. `:` 가 없는 항목(예 순수 서술)은 라벨 없음으로 무시하되,
 * 호출부가 «항목은 있는데 라벨이 없다» 를 판별할 수 있도록 원문 항목도 함께 돌려준다.
 */
export function specLabels(baseNormalized: string): string[] {
  const out: string[] = [];
  for (const seg of baseNormalized.split(ITEM_SPLIT)) {
    const s = (seg ?? '').trim();
    if (!s) continue;
    const i = s.search(/[:：]/);
    if (i < 0) continue;
    const lb = s.slice(0, i).trim().replace(/^[-•*·,，\s]+/, '').trim();
    if (!lb || lb.length > 40) continue;
    out.push(lb);
  }
  return out;
}

/**
 * 기능성 원료가 아닌 규격 항목(성상·미생물·중금속·잔류물·물성·표시). 공용 NONFUNC 보다 넓다(추가만).
 * 잔류/오염 항목(깅콜릭산·페오포르바이드·카페인·잔류용매·항생물질 등)은 전부 «… 이하» 한도시험이며
 * 기능성 지표가 아니다 — 원문 확인 근거로 편입한다. `납\b` 는 한글 뒤 word boundary 가 성립하지 않아
 * 실제로 매칭되지 않았으므로(census 로 확인) 경계 없는 리터럴로 둔다.
 */
const NONFUNC_C = /성상|색택|향미|이미|이취|대장균|대장군|세균수|진균수|효모|곰팡이|살모넬라|여시니아|리스테리아|황색포도상|바실러스세레우스|클로스트리디[움양]|납|카드뮴|비소|수은|중금속|잔류농약|잔류용매|헥산|아플라톡신|오크라톡신|벤조피렌|이산화황|타르색소|보존료|감미료|붕해|용출|수분|회분|산가|과산화물|이물|내용량|중량|유통기한|보관|섭취량|섭취방법|포장|용기|pH|산도|비중|입도|타르|방사능|멜라민|3-MCPD|벤조|디옥신|미생물|일반세균|위생지표|총균수|기타|깅콜릭산|ginkgolic|페오포르바이드|엽록소|카페인|caffeine|초산에틸|아세톤|메탄올|에탄올잔류|테트라싸이클린|클로르테트라|옥시테트라|설파|항생물질|디에틸렌글리콜|에틸렌글리콜|디시안디아미드|디하이드로트리아진|게르마늄|비타민A\s*\(?과잉|안전성|규격시험|시험법|항목/i;

export function isNonFunctionalLabel(label: string): boolean {
  return NONFUNC_C.test(label);
}

/**
 * C 전용 additive 라벨 → 원료 key. **BASE_STANDARD 원문 라벨에만 근거**한다.
 * 동일 원료명이 여러 표기로 반복되어도 key 는 하나만 등록한다(중복 등록 금지).
 */
export const NFK_LABELS: Array<{ re: RegExp; key: string }> = [
  // 프로바이오틱스 — 공식 규격 표기 «프로바이오틱스 수 / 유산균 수 : … CFU … 이상»(계수 규격이라 표시량 파서 미적용)
  { re: /프로바이오틱?스?\s*(수|함량)|유산균\s*(수|함량)|생균\s*수|락토바실[루러]스\s*수/, key: '프로바이오틱스' },
  // 홍삼 vs 인삼 — MFDS 공식 지표성분이 다르다. 홍삼 = Rg1·Rb1·**Rg3** 의 합 / 인삼 = Rg1·Rb1 의 합.
  //   원문 지표 표기로만 구분하며 제품명으로 추정하지 않는다(순서 반드시 Rg3 먼저).
  { re: /진세노사이드[\s\S]{0,40}Rg3/i, key: '홍삼' },
  { re: /진세노사이드/, key: '인삼' },
];

/** C 전용 SfIngredient(공용 SF_INGREDIENTS·META 미등재 원료만). */
export const NFK_INGREDIENTS: Record<string, SfIngredient> = {
  '프로바이오틱스': { key: '프로바이오틱스', slug: 'probiotics', displayKo: '프로바이오틱스', displayEn: 'Probiotics', labelRe: /프로바이오틱스|유산균/, statusHint: 'READY' },
  '홍삼': { key: '홍삼', slug: 'red-ginseng', displayKo: '홍삼', displayEn: 'Korean red ginseng', labelRe: /홍삼|진세노사이드/, statusHint: 'READY' },
};

/**
 * C 전용 key 의 공식 기능성 집합(normFn 미적용 원문). foreign-fn 가드가 «타 원료 전용 기능성 혼입» 을
 * 판정할 때 사용한다. 전부 MFDS 고시 기능성 원문 표기다.
 */
export const NFK_INGREDIENT_FN: Record<string, string[]> = {
  '프로바이오틱스': ['유산균 증식 및 유해균 억제', '유익균 증식 및 유해균 억제', '유산균 증식', '유해균 억제', '배변활동 원활', '장 건강'],
  '홍삼': ['면역력 증진', '피로개선', '혈소판 응집억제를 통한 혈액흐름', '기억력 개선', '항산화', '갱년기 여성의 건강', '갱년기 남성의 건강'],
  '인삼': ['면역력 증진', '피로개선'],
};

/** 위 집합 소속 판정(공백·중점·어미 변이 흡수). C 전용 key 의 «원문 밖 기능성 혼입» 차단에 쓴다. */
export function nfkFnBelongsTo(koFn: string, key: string): boolean {
  const set = NFK_INGREDIENT_FN[key]; if (!set) return false;
  const n = normAtom(koFn);
  return set.some((e) => { const x = normAtom(e); return n === x || n.includes(x); });
}

/**
 * C 전용 원자 기능성 → EN 정본. 공식 KO 기능성의 영문 표현이며 새 효능 주장 0.
 * ⚠️ **전부 완전일치(`^…$`)** 로 앵커한다. 접두일치를 허용하면 «피로개선…(나) 혈소판 응집억제를 통한
 *    혈액흐름» 같은 결합 원자에서 뒤쪽 공식 기능성이 EN 에서 조용히 소실된다(실측 결함).
 */
const NFK_ATOM_EN: Array<{ re: RegExp; en: string }> = [
  { re: /^유산균증식및유해균억제$/, en: 'promote the growth of lactic acid bacteria and suppress harmful bacteria' },
  { re: /^유익균증식및유해균억제$/, en: 'promote the growth of beneficial bacteria and suppress harmful bacteria' },
  { re: /^유산균증식$/, en: 'promote the growth of lactic acid bacteria' },
  { re: /^유해균억제$/, en: 'suppress harmful bacteria' },
  { re: /^배변활동원활$/, en: 'support smooth bowel movements' },
  { re: /^장건강$/, en: 'support gut health' },
  { re: /^칼슘흡수$/, en: 'support calcium absorption' },
  { re: /^면역력?증진$/, en: 'support immune function' },
  { re: /^피로개선$/, en: 'improve fatigue' },
  { re: /^혈소판응집억제를?통한혈액흐름$/, en: 'improve blood flow by inhibiting platelet aggregation' },
  { re: /^기억력개선$/, en: 'improve memory' },
  { re: /^갱년기여성의?건강$/, en: 'support health in menopausal women' },
  { re: /^갱년기남성의?건강$/, en: 'support health in menopausal men' },
  { re: /^항산화$/, en: 'antioxidant activity' },
];

/** `(가)`~`(하)` 항목 마커로 결합된 공식 기능성 문장을 항목 단위로 분리(원문 문구 보존, 삭제 0). */
export function splitHangulItems(ko: string): string[] {
  const parts = (ko ?? '').split(/\s*\(\s*[가-하]\s*\)\s*/).map((p) => p.trim()).filter((p) => p.length >= 5);
  return parts.length ? parts : [ko];
}

/**
 * 공식 기능성 누락 검증. 원문 MAIN_FNCTN 에서 추출된 KO 문장을 모두 제거한 뒤 남는 한글 잔여를 돌려준다.
 * 잔여가 있으면 «원문에 있는 공식 기능성을 초안이 담지 못했다» 는 뜻이므로 호출부가 HOLD 해야 한다.
 * (예: `①면역력 증진②피로회복` 의 '피로회복' 은 공용 추출기 키워드 필터에 걸리지 않아 누락된다.)
 */
export function fnCoverageResidue(mainFn: string, kos: string[]): string {
  let t = (mainFn ?? '').replace(/[（]/g, '(').replace(/[）]/g, ')')
    .replace(/\(?\s*영문\s*\)?[\s\S]*$/, '').replace(/May\s+help[\s\S]*$/i, '').replace(/\(?\s*국문\s*\)?/g, '')
    .replace(/\[[^\]]*\]/g, ' ')
    // (가)(나)… 는 항목 열거 마커일 뿐 기능성 문장이 아니다. 괄호가 벗겨진 뒤 한글 잔여로 오인되는 것을 막는다.
    .replace(/\(\s*[가-하]\s*\)/g, ' ');
  const squash = (s: string): string => s.replace(/\s+/g, '');
  t = squash(t);
  for (const k of kos) {
    const key = squash(k);
    if (!key) continue;
    let i: number;
    while ((i = t.indexOf(key)) >= 0) t = t.slice(0, i) + t.slice(i + key.length);
  }
  return t.replace(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫\d().,·･・‧:：;/\-~%\s"'"'`]/g, '')
    .replace(/[A-Za-z]/g, '');
}

function normAtom(s: string): string {
  return (s ?? '')
    .replace(/[･・‧·∙•⋅․]/g, '·').replace(/·{2,}/g, '·')
    .replace(/\s+/g, '').replace(/[（）()]/g, '').replace(/[.。]+$/, '')
    .replace(/(에)?도움을줄수있음$/, '').replace(/에도움을줌$/, '')
    .replace(/(하는데|에)?필요함?$/, '').replace(/·$/, '');
}

/**
 * C 전용 기능성 KO → EN. `·` 결합 다항은 원자별 매핑 후 결합하고, 하나라도 미매핑이면 null
 * (호출부가 공용 overlay/mapFunctionEn 으로 폴백 → 그래도 없으면 GROUNDING_PENDING_EN HOLD).
 */
export function mapFunctionEnNfk(ko: string): string | null {
  if (!ko) return null;
  const cleaned = ko
    .replace(/\(?\s*영문\s*\)?[\s\S]*$/, '').replace(/\(?\s*국문\s*\)?\s*/g, '')
    .replace(/[“”"『』「」'']/g, '')
    .replace(/^\s*\(?\s*[가-하]\s*\)\s*/, '')             // '(가) ' 항목 마커
    .replace(/^[^:：()（）]{1,20}[:：]\s*/, '');
  const parts = cleaned.replace(/[･・‧∙•⋅․]/g, '·').split(/·/).map((p) => p.trim()).filter((p) => p.length >= 2);
  if (!parts.length) return null;
  const ens: string[] = [];
  for (const p of parts) {
    const n = normAtom(p);
    const hit = NFK_ATOM_EN.find((a) => a.re.test(n));
    if (!hit) return null;
    if (!ens.includes(hit.en)) ens.push(hit.en);
  }
  return `May help ${ens.join(', ')}.`;
}
