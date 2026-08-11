/**
 * WO-O4O-COSMETICS-GUIDE-GAP-ENRICHMENT-FULL-V1 — 결손 보완 core (SSOT).
 *
 * 두 축만 쓴다. 둘 다 **이미 게시된 사실**이며 추론이 아니다.
 *   A. 판매처가 게시한 판매명 안의 사실값 중 **선행 생산이 놓친 것** (용량·구성)
 *   B. 식약처 기능성화장품 **보고 상세**의 효능효과 · 용법용량 · 사용상의주의사항 (공식 원천)
 *
 * 금지 (CLAUDE.md 콘텐츠 불변 원칙 · WO §5)
 *   - 성분에서 효능을 추론하지 않는다.
 *   - 판매처 마케팅 카피를 제품 사실로 옮기지 않는다.
 *   - 확인되지 않은 값을 채우지 않는다. 없으면 CHECK / NO_SOURCE 로 남긴다.
 */

// ── A. 판매명 사실값 ────────────────────────────────────────────────────

/** 증정·동봉 구성이 시작되는 지점. 그 뒤 용량은 이 제품의 것이 아니다(선행 규칙 G5 유지). */
const GIFT_CUT_RE = /(?<![0-9])[+＋]|증정|사은품|샘플|덤/;

const CAPACITY_UNIT = '(?:ml|mL|ML|Ml|g|G|kg|KG|L|ℓ|cc)';
const CAPACITY_RE = new RegExp(`(\\d[\\d,]*(?:\\.\\d+)?)\\s*(${CAPACITY_UNIT})(?![A-Za-z가-힣])`, 'g');

/**
 * 수량 단위. 선행 생산은 `매입`·`개입`·`장입` 처럼 **뒤에 한글이 더 붙는** 표기를 놓쳤다
 * (`(?![가-힣])` 가 `10매입` 의 `입` 에 걸린다). 실측에서 반복 확인된 단위만 올린다.
 */
const COUNT_RE = /(\d[\d,]*)\s*(매입|개입|장입|포입|정입|매|포|정|캡슐|개입|입|팩|장|알|구|호|박스|box|BOX|Box)(?![가-힣])/g;

const BRACKET_RE = /[([［【]([^)\]）］】]*)[)\]）］】]/g;

const lastMatch = (s, re) => {
  const m = [...String(s).matchAll(re)];
  return m.length ? m[m.length - 1] : null;
};

const fmtCapacity = (m) => `${m[1]}${/^ml$/i.test(m[2] ?? '') ? 'ml' : (m[2] ?? '')}`;

/** 괄호 구간이 **용량·수량 표기만으로** 이뤄져 있는가 (증정·다른 제품명이 섞이지 않았는가). */
export function bracketIsPureCapacity(inner) {
  const s = String(inner).trim();
  if (!s) return false;
  if (GIFT_CUT_RE.test(s)) return false;
  // 숫자·단위·구분자만 남으면 순수 용량 표기다. `20g` `40ml x 7ea` `2ml * 10매입` `30매, 350ml`
  const rest = s
    .replace(new RegExp(`\\d[\\d,]*(?:\\.\\d+)?\\s*${CAPACITY_UNIT}(?![A-Za-z가-힣])`, 'gi'), ' ')
    .replace(/\d[\d,]*\s*(매입|개입|장입|포입|정입|매|포|정|캡슐|입|팩|장|알|구|박스|box|ea|EA|pcs|개)(?![가-힣])/gi, ' ')
    .replace(/\d+\s*box/gi, ' ')
    .replace(/[x×*,·\/+\s]/g, '');
  return rest.length === 0;
}

/**
 * 판매명 → 용량. 선행 규칙(괄호 통째 제거)을 유지하되,
 * **괄호 안이 용량 표기뿐이면** 그 값은 이 제품의 용량이므로 읽는다.
 */
export function extractCapacityV2(rawProductName) {
  const raw = String(rawProductName ?? '');
  // 1) 괄호 밖(증정 구간 앞)에서 먼저 찾는다 — 선행 규칙과 동일한 우선순위다.
  const outside = raw.replace(BRACKET_RE, ' ');
  const cut = outside.search(GIFT_CUT_RE);
  const base = cut >= 0 ? outside.slice(0, cut) : outside;
  const ml = lastMatch(base, CAPACITY_RE);
  if (ml) return { value: fmtCapacity(ml), from: 'NAME_OUTSIDE_BRACKET' };
  const cnt = lastMatch(base, COUNT_RE);
  if (cnt) return { value: `${cnt[1]}${cnt[2]}`, from: 'NAME_OUTSIDE_BRACKET' };

  // 2) 괄호 안이 순수 용량 표기인 경우만 읽는다.
  //    `2ml * 10매입` 처럼 여러 마디로 표기된 경우 **표기 전체**를 그대로 옮긴다(일부만 떼면 뜻이 바뀐다).
  for (const m of raw.matchAll(BRACKET_RE)) {
    if (!bracketIsPureCapacity(m[1])) continue;
    const inner = m[1].replace(/\s*[x×*]\s*/gi, ' x ').replace(/\s+/g, ' ').trim();
    if (!inner) continue;
    return { value: inner, from: 'NAME_PURE_CAPACITY_BRACKET' };
  }
  return null;
}

/** `5종`·`택 1` 같은 **구성 수** 표기. 용량과 다른 축의 사실이다. */
export function extractComposition(rawProductName) {
  const raw = String(rawProductName ?? '');
  const kinds = raw.match(/(\d+)\s*종(?![가-힣])/);
  const pick = raw.match(/택\s*(\d+)/);
  if (!kinds && !pick) return null;
  if (kinds && pick) return `${kinds[1]}종 중 택 ${pick[1]}`;
  if (kinds) return `${kinds[1]}종 구성`;
  return `택 ${pick[1]}`;
}

// ── B. 식약처 기능성 보고 상세 ──────────────────────────────────────────

/** 효능효과 문장은 보고서 원문 그대로 쓴다. 요약·재구성하지 않는다. */
export function mfdsFeatureText(detail) {
  const eff = (detail?.efficacy ?? '').trim();
  if (!eff) return null;
  return `식약처 기능성화장품 보고 효능·효과: ${eff}`;
}

export const MFDS_GENERIC_CAUTION_HEAD = '화장품 사용 시 또는 사용 후 직사광선에 의하여';

/**
 * 용법용량이 제품 고유 안내로 쓸 만한가.
 * 너무 짧거나 표기가 사실상 비어 있으면 쓰지 않는다.
 */
export function usableMfdsUsage(usage) {
  const s = (usage ?? '').replace(/\s+/g, ' ').trim();
  if (s.length < 8) return null;
  if (/^(-+|없음|해당없음|별도표기|제품에\s*따름)$/.test(s)) return null;
  return s;
}
