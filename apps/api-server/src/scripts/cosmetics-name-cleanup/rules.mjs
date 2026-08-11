/**
 * WO-O4O-COSMETICS-PRODUCT-NAME-NORMALIZATION-CLEANUP-V1 — 상품명 정규화 규칙 (단일 출처)
 *
 * 설계 원칙 (WO §3·§4):
 *   - 제거 대상은 **명백한 판매·프로모션·구매옵션 표현**에 한정한다. 허용목록 기반이며 추측하지 않는다.
 *   - 제품 라인명·에디션·콜라보·제형/기능 표현·구성(SET/pack)·용량은 건드리지 않는다.
 *   - 애매하면 수정하지 않고 CHECK 로 남긴다. 오병합·제품명 훼손보다 지저분한 이름이 낫다.
 *
 * 허용목록은 01-census 의 실측 선두 토큰 빈도에서 도출했다. 빈도 근거가 없는 표현은 넣지 않는다.
 */

/** 선두 괄호 토큰 중 **판매 문구가 확실한** 것만. */
const PROMO_EXACT = new Set([
  // 판매처 단독·프로모션
  '오직무신사뷰티', '오직 무신사 뷰티', '무신사 단독', '무신사단독', '무신사 단독 선론칭',
  '단독 선론칭', '단독런칭', '선런칭', '단독구성', '단독 구성',
  '오픈프로모션', '공식몰', 'GS25 전용',
  // 구매 옵션
  '옵션선택', '선택', '2개선택', '단품, 선택',
  // 사은/포장
  '선물포장', '선물 포장',
  // 머천다이징 배지
  'AD', 'BEST',
  // 재고·기한
  '사용기한', '소량 재입고',
  // WO §3 예시 (현 모집단 미출현 포함 — 재유입 대비)
  '기획', '단독기획', '특가', '증정', '사은품', '한정', '올영픽', '1+1', '2+1', '무료배송', '쿠폰',
]);

/** 선두 괄호 토큰 정규식 규칙. */
const PROMO_PATTERNS = [
  { rule: 'PROMO_QTY_CONDITION', re: /^\d+\s*개부터\s*구매가능$/ },
  { rule: 'PROMO_ENDORSEMENT', re: /^.{1,20}?\s*(PICK|Pick|pick|픽)$/ },
  { rule: 'PROMO_DISCOUNT', re: /^\d{1,2}\s*%\s*OFF$/i },
  { rule: 'PROMO_EXPIRY', re: /^~?\s*\d{2}[.\-/]\d{2}[.\-/]\d{2}\s*(까지)?$/ },
  { rule: 'PROMO_EXPIRY', re: /^(소비기한|사용기한)\s*\d{4}[.\-/]\d{2}[.\-/]\d{2}\s*까지$/ },
];

/** 자동 제거하지 않지만 "판매 문구 흔적"으로 CHECK 에 올릴 키워드. */
const SUSPECT_KEYWORDS = [
  '증정', '사은품', '구매가능', '재입고', '단독', '기획', '특가', '한정', '할인', 'OFF',
  '무료', '이벤트', '프로모션', '선물포장', '쿠폰', 'PICK', '픽', '옵션',
];

const OPEN_TO_CLOSE = { '[': ']', '(': ')', '【': '】', '（': '）', '〔': '〕' };

const norm = (s) => s.replace(/\s+/g, ' ').trim();

/** 선두 괄호 토큰이 판매 문구인지 판정한다. */
function classifyToken(tokenRaw) {
  const t = norm(tokenRaw);
  if (PROMO_EXACT.has(t)) return { promo: true, rule: 'PROMO_EXACT' };
  for (const p of PROMO_PATTERNS) if (p.re.test(t)) return { promo: true, rule: p.rule };
  const suspect = SUSPECT_KEYWORDS.some((k) => t.includes(k));
  return { promo: false, suspect };
}

/** 괄호 종류별 열림/닫힘 수 불일치 목록. */
export function bracketImbalance(name) {
  const bad = [];
  for (const [open, close] of Object.entries(OPEN_TO_CLOSE)) {
    const o = name.split(open).length - 1;
    const c = name.split(close).length - 1;
    if (o !== c) bad.push({ open, close, o, c });
  }
  return bad;
}

/**
 * 상품명 정규화.
 * @returns {{ after: string, rules: string[], checks: string[] }}
 *   rules 가 비면 변경 없음. checks 가 있으면 **자동 적용하지 않는다**(CHECK 큐).
 */
export function normalizeName(original) {
  let s = original;
  const rules = [];
  const checks = [];
  const fire = (r) => { if (!rules.includes(r)) rules.push(r); };

  // R1 제로폭·비가시 문자 제거 (명백한 데이터 결함)
  const zw = s.replace(/[​-‏⁠﻿]/g, '').replace(/ /g, ' ');
  if (zw !== s) { s = zw; fire('ZERO_WIDTH'); }

  // R2 선두 고아 문장부호
  const lp = s.replace(/^[_:]\s*/, '');
  if (lp !== s) { s = lp; fire('STRAY_LEADING_PUNCT'); }

  // R3 선두 괄호 판매 문구 토큰 (연속 제거)
  for (;;) {
    const m = s.match(/^\s*([[(【（〔])([^\]）)】〕[(【（〔]*)([\])】）〕])\s*/);
    if (!m) break;
    const c = classifyToken(m[2]);
    if (!c.promo) {
      if (c.suspect) checks.push(`AMBIGUOUS_PROMO_TOKEN:${norm(m[2])}`);
      break;
    }
    s = s.slice(m[0].length);
    fire(c.rule);
  }

  // R4 선두 고아 닫는 괄호 앞의 판매 문구 (`[` 유실 — 예: `BEST ] 판테놀 …`)
  {
    const m = s.match(/^\s*([^\][()【】（）〔〕]{1,30}?)\s*[\])】）〕]\s*/);
    if (m && !s.trimStart().startsWith('[') && bracketImbalance(s).length) {
      const c = classifyToken(m[1]);
      if (c.promo) { s = s.slice(m[0].length); fire('PROMO_ORPHAN_LEADING'); }
    }
  }

  // R5 후행 증정 문구 (`/` `_` 구분자 뒤)
  {
    const r = s.replace(/\s*[/_]\s*[^/_]*증정\s*$/, '');
    if (r !== s && r.trim()) { s = r; fire('GIFT_TRAILING_DELIM'); }
  }

  // R6 후행 증정 괄호
  {
    const r = s.replace(/\s*\([^()]*증정\)\s*$/, '');
    if (r !== s && r.trim()) { s = r; fire('GIFT_TRAILING_PAREN'); }
  }

  // R7 선두 증정 문구 (`립펜슬 증정 <제품명>`)
  {
    const r = s.replace(/^.{1,15}?\s*증정\s+/, '');
    if (r !== s && r.trim()) { s = r; fire('GIFT_LEADING'); }
  }

  // R8 후행 기획전
  {
    const r = s.replace(/\s*기획전\s*$/, '');
    if (r !== s && r.trim()) { s = r; fire('PROMO_TRAILING_EVENT'); }
  }

  // R9 후행 소비/사용기한 괄호 (`((소비기한 2026-12-17)` 포함)
  {
    const r = s.replace(/\s*\(+\s*(소비기한|사용기한)[^()]*\)\s*$/, '');
    if (r !== s && r.trim()) { s = r; fire('EXPIRY_TRAILING_PAREN'); }
  }

  // R10 짝 없는 후행 닫는 괄호
  {
    const m = s.match(/([\])】）〕])\s*$/);
    if (m) {
      const close = m[1];
      const open = Object.entries(OPEN_TO_CLOSE).find(([, cl]) => cl === close)?.[0];
      if (open && !s.includes(open)) {
        s = s.slice(0, s.lastIndexOf(close)) + s.slice(s.lastIndexOf(close) + 1);
        fire('STRAY_TRAILING_CLOSE');
      }
    }
  }

  // R11 내용 없는 후행 여는 괄호
  {
    const r = s.replace(/\s*[[(【（〔]\s*$/, '');
    if (r !== s && r.trim()) { s = r; fire('STRAY_TRAILING_OPEN'); }
  }

  // R12 짝 없는 선두 여는 괄호 — 뒤가 숫자면 `[2개]` 등 유실 가능성이 있어 손대지 않는다.
  {
    const m = s.match(/^\s*([[(【（〔])/);
    if (m) {
      const open = m[1];
      if (!s.includes(OPEN_TO_CLOSE[open])) {
        if (/^\s*[[(【（〔]\s*\d/.test(s)) checks.push('LEADING_OPEN_BRACKET_DIGIT');
        else { s = s.replace(/^\s*[[(【（〔]\s*/, ''); fire('STRAY_LEADING_OPEN'); }
      }
    }
  }

  // R13 공백 정리 — 다른 규칙이 발동한 행에서만 적용한다(무변경 행을 건드리지 않는다).
  if (rules.length) {
    const w = norm(s);
    if (w !== s) { s = w; fire('WHITESPACE'); }
  }

  // ── CHECK 판정 ──────────────────────────────────────────────────
  if (bracketImbalance(s).length) checks.push('BRACKET_IMBALANCE_UNRESOLVED');
  if (s.includes('증정') && !rules.some((r) => r.startsWith('GIFT'))) checks.push('GIFT_PHRASE_NO_SAFE_BOUNDARY');
  if (!s.trim()) checks.push('EMPTY_AFTER_NORMALIZE');

  return { after: s, rules, checks };
}

export const RULE_IDS = [
  'ZERO_WIDTH', 'STRAY_LEADING_PUNCT', 'PROMO_EXACT', 'PROMO_QTY_CONDITION', 'PROMO_ENDORSEMENT',
  'PROMO_DISCOUNT', 'PROMO_EXPIRY', 'PROMO_ORPHAN_LEADING', 'GIFT_TRAILING_DELIM', 'GIFT_TRAILING_PAREN',
  'GIFT_LEADING', 'PROMO_TRAILING_EVENT', 'EXPIRY_TRAILING_PAREN', 'STRAY_TRAILING_CLOSE',
  'STRAY_TRAILING_OPEN', 'STRAY_LEADING_OPEN', 'WHITESPACE',
];
