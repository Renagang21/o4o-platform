/**
 * Hospital Pharmacy — 자연어 파싱 (병원 도메인 어휘)
 *
 * WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1 §1·§5
 *
 * 병원약국 문장에서 제품 토큰·함량·원내 지시·동일성분 지시를 뽑는다. 이 어휘(원내·동일성분·약품명 어미)는
 * **병원 도메인 지식**이므로 이 Domain Core 가 소유한다 — 공통 Task Modality Router 는 오염시키지 않는다.
 * 기존 api-server 의 hospital-drug-composite / ai-tool-router 의 판정 규칙을 그대로 옮겨 온 것이다
 * (Core 재구현이 아니라 병원 도메인 로직의 병원 서비스 귀속).
 *
 * 한글은 정규식 리터럴에 넣지 않고 문자열 연산(includes/endsWith)으로 처리한다.
 */

function compact(s: string): string {
  return String(s ?? '').replace(/\s+/g, '').toLowerCase();
}

/** 원내(in-hospital) 지시 토큰. */
const HOSPITAL_TOKENS: readonly string[] = ['원내'];

/** 동일성분 지시 토큰. */
const SAME_INGREDIENT_TOKENS: readonly string[] = ['동일성분', '같은성분', '성분같은', '동일한성분'];

/** 약품명 어미(제품 토큰 판정). */
const DRUG_NAME_SUFFIXES_KO: readonly string[] = ['정', '캡슐', '시럽', '연고', '크림', '액', '주', '산', '환', '패치', '겔', '로션'];

/** 조사(제품 토큰 뒤 어미 제거). */
const TRAILING_PARTICLES_KO: readonly string[] = ['이랑', '하고', '으로', '을', '를', '이', '가', '은', '는', '도', '과', '와', '의', '로', '랑'];

/** 따옴표 쌍(ASCII + 한글/일본어 따옴표). */
const QUOTE_PAIRS: readonly [string, string][] = [
  ['"', '"'],
  ["'", "'"],
  ['“', '”'], // “ ”
  ['‘', '’'], // ‘ ’
  ['「', '」'], // 「 」
];

/** 문장에 원내 지시가 있는가. */
export function mentionsHospital(message: string): boolean {
  const c = compact(message);
  return HOSPITAL_TOKENS.some((t) => c.includes(t));
}

/** 문장에 동일성분 지시가 있는가. */
export function mentionsSameIngredient(message: string): boolean {
  const c = compact(message);
  return SAME_INGREDIENT_TOKENS.some((t) => c.includes(t));
}

/**
 * 따옴표가 없을 때 문장에서 제품명 토큰 하나를 뽑는다("아모디핀정 찾아줘" · "타이레놀정500mg 설명서").
 * 어미 표에 있는 토큰이 정확히 하나일 때만 돌려준다 — 둘 이상이면 무엇을 찾을지 단정하지 않는다.
 */
export function extractDrugNameToken(message: string): string | null {
  const trimChars = new Set(['"', "'", '(', ')', '[', ']', ',', '.', '?', '!', ...QUOTE_PAIRS.flat()]);
  const trim = (t: string): string => {
    let a = 0;
    let b = t.length;
    while (a < b && trimChars.has(t[a])) a += 1;
    while (b > a && trimChars.has(t[b - 1])) b -= 1;
    return t.slice(a, b);
  };
  const tokens = String(message ?? '')
    .split(/\s+/)
    .map(trim)
    .filter((t) => t.length > 0);
  const found: string[] = [];
  for (const raw of tokens) {
    let token = raw;
    for (const particle of TRAILING_PARTICLES_KO) {
      if (token.length > particle.length + 1 && token.endsWith(particle)) {
        token = token.slice(0, -particle.length);
        break;
      }
    }
    const stem = token.replace(/[0-9.,/]+(mg|g|ml|mcg|iu)?$/i, '');
    if (DRUG_NAME_SUFFIXES_KO.some((sfx) => stem.length > sfx.length && stem.endsWith(sfx))) found.push(token);
  }
  return found.length === 1 ? found[0] : null;
}

/** 따옴표 구절 → 제품명 토큰 순으로 제품 하나를 뽑는다. 없으면 null. */
export function extractProduct(message: string): string | null {
  const m = /["'“”‘’]([^"'“”‘’]{1,80})["'“”‘’]/.exec(String(message ?? ''));
  if (m && m[1].trim().length > 0) return m[1].trim();
  return extractDrugNameToken(message);
}

/** 문장에서 함량 하나를 뽑는다. "200mg" · "5 mg" · "1.5g" → 공백 없는 소문자. 없으면 null. */
export function extractStrength(message: string): string | null {
  const m = /(\d+(?:\.\d+)?)\s?(mg|mcg|g|ml|iu|%)\b/i.exec(String(message ?? ''));
  return m ? `${m[1]}${m[2].toLowerCase()}` : null;
}
