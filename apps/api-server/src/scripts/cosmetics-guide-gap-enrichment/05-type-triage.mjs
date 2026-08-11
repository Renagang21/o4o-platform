/**
 * WO §6 — `TYPE_NAME_MISMATCH` 재분류.
 *
 * 8천여 건을 **일괄 수정하지 않는다.** 어긋남의 성격을 갈라놓고, 성격이 분명한 것만 고친다.
 *
 * 분류
 *   SPECIALIZATION          카테고리 유형을 상품명이 **더 좁게** 말한다 (크림 → 아이크림). 고칠 수 있다.
 *   GENERALIZATION_FP       상품명 핵심어가 카테고리 유형의 **일부**다 (바디로션 → 로션). 열화이므로 고치지 않는다.
 *   PARTIAL_TOKEN_FP        더 긴 낱말의 일부를 유형으로 잘못 읽었다 (팩트 → 팩, 선스틱 → 스틱). 고치지 않는다.
 *   SET_OR_KIT              세트·기획 구성이라 제형이 하나가 아니다. 고치지 않는다.
 *   DIFFERENT_AXIS          축이 서로 다르다. 사람 확인(CHECK).
 *
 * 산출: type-triage.json
 */
import { GENERIC_USAGE } from '../cosmetics-guide-production/guide-core.mjs';
import { readOut, readProd, writeOut } from './lib.mjs';

const gaps = readOut('gap-population.json');
const guides = readProd('all-guides-ko.json');
const guideList = Array.isArray(guides) ? guides : (guides.guides ?? []);
const byKey = new Map(guideList.map((g) => [g.key, g]));

/**
 * 선행 판정기는 **가장 뒤에 나온 키워드**를 골랐다. `선스틱` 에서 `스틱`(pos 1) 이
 * `선스틱`(pos 0) 을 이기는 구조라 부분일치 오탐이 생겼다(선행 CHECK §4 실측 136건).
 * 여기서는 **끝나는 위치가 같으면 더 긴 낱말**이 이기도록 해 오탐을 갈라낸다.
 */
const KEYWORDS = [
  ['토너패드', '토너패드'], ['클렌징폼', '클렌징폼'], ['클렌징오일', '클렌징오일'],
  ['클렌징워터', '클렌징워터'], ['클렌징밤', '클렌징밤'], ['아이크림', '아이크림'],
  ['핸드크림', '핸드크림'], ['바디로션', '바디로션'], ['바디워시', '바디워시'],
  ['바디미스트', '바디미스트'], ['바디오일', '바디오일'], ['헤어에센스', '헤어에센스'],
  ['헤어미스트', '헤어미스트'], ['트리트먼트', '트리트먼트'], ['컨디셔너', '컨디셔너'],
  ['데오드란트', '데오드란트'], ['선크림', '선케어'], ['선스틱', '선케어'], ['선쿠션', '선케어'],
  ['자외선차단', '선케어'], ['샴푸', '샴푸'], ['토너', '토너'], ['스킨', '토너'],
  ['세럼', '세럼'], ['앰플', '앰플'], ['에센스', '에센스'], ['크림', '크림'],
  ['로션', '로션'], ['미스트', '미스트'], ['마스크', '마스크'], ['팩트', '메이크업'], ['팩', '팩'],
  ['패드', '패드'], ['패치', '패치'], ['스크럽', '스크럽'], ['오일', '오일'],
  ['밤', '밤'], ['젤', '젤'], ['스틱', '스틱'], ['비누', '비누'],
  ['향수', '향수'], ['퍼퓸', '향수'], ['립밤', '립'], ['립스틱', '립'], ['틴트', '립'],
  ['쿠션', '메이크업'], ['파운데이션', '메이크업'], ['컨실러', '메이크업'],
  ['섀도우', '메이크업'], ['마스카라', '메이크업'], ['아이라이너', '메이크업'],
];

/** 끝 위치 우선 · 같으면 더 긴 낱말 우선. 오탐(`선스틱`→`스틱`)을 만들지 않는다. */
export function inferTypeStrict(name) {
  const n = (name ?? '').replace(/\s+/g, '');
  let best = null;
  let bestEnd = -1;
  let bestLen = 0;
  for (const [kw, type] of KEYWORDS) {
    const pos = n.lastIndexOf(kw);
    if (pos < 0) continue;
    const end = pos + kw.length;
    if (end > bestEnd || (end === bestEnd && kw.length > bestLen)) {
      bestEnd = end;
      bestLen = kw.length;
      best = { kw, type, pos, end };
    }
  }
  return best;
}

// `+`·`&` 로 이어붙인 판매명은 **여러 제품을 한 줄에 묶은 것**이라 제형이 하나가 아니다.
// (`SPF50+`·`1+1` 은 숫자 뒤 기호이므로 제외한다 — 선행 규칙 G5 와 같은 판정축이다.)
const SET_RE = /세트|기획|키트|SET|set|Set|\d+\s*종|택\s*\d|듀오|듀얼|PACK|pack|선물|(?<![0-9])[+＋]|&/;

/**
 * 같은 판매 마디 안에서 좁히는 것만 허용한다(선행 규칙 T6 의 확장).
 * `클렌징오일/워터` 마디의 상품명이 `클렌징워터` 를 가리키면 그 마디 **자신의 토큰**이므로 좁힐 수 있다.
 * 마디 밖 유형으로는 바꾸지 않는다.
 */
function leafTokens(classification) {
  const leaf = String(classification ?? '').split('>').pop().trim();
  return leaf
    .split(/[/·]/)
    .map((s) => s.replace(/\s+/g, ''))
    .filter(Boolean);
}

/**
 * 같은 계열인가 — 앞머리(용도·부위) 표기가 같은가.
 * `클렌징워터`/`클렌징밤`, `바디로션`/`바디오일`, `헤어에센스`/`헤어미스트` 는 같은 계열의 다른 제형이다.
 * 계열이 같으면 유형을 바꿔도 부위·용도 정보가 사라지지 않는다.
 */
const FAMILY_PREFIXES = ['클렌징', '바디', '헤어', '두피', '아이', '핸드', '립', '네일', '선'];
function sameFamily(a, b) {
  for (const p of FAMILY_PREFIXES) {
    if (a.startsWith(p) && b.startsWith(p) && a !== b) return true;
  }
  return false;
}

/** `마스크`·`팩` 은 판매 현장에서 같은 것을 가리키는 동의어다 — 어긋남이 아니다. */
const SYNONYM_GROUPS = [['마스크', '팩', '마스크팩', '시트마스크']];
const isSynonym = (a, b) => SYNONYM_GROUPS.some((g) => g.includes(a) && g.includes(b));

const counts = {};
const rows = [];

for (const g of gaps) {
  if (!g.issueTypes.includes('TYPE_NAME_MISMATCH')) continue;
  const guide = byKey.get(g.key);
  const categoryType = guide?.productType ?? null;
  const name = g.productName ?? '';
  const strict = inferTypeStrict(name);
  const inferredLoose = guide?.issues?.find((i) => i.type === 'TYPE_NAME_MISMATCH')?.detail?.match(/핵심어 '([^']+)'/)?.[1] ?? null;

  let verdict;
  let newType = null;
  let reason;

  const tokens = leafTokens(guide?.classification);

  if (!categoryType || !strict) {
    verdict = 'DIFFERENT_AXIS';
    reason = '카테고리 유형 또는 상품명 핵심어를 판정할 수 없다';
  } else if (strict.type === categoryType) {
    verdict = 'PARTIAL_TOKEN_FP';
    reason = `더 긴 낱말('${strict.kw}')로 읽으면 카테고리 유형과 같다 — 부분일치 오탐`;
  } else if (isSynonym(strict.type, categoryType)) {
    verdict = 'SYNONYM_FP';
    reason = `'${categoryType}' 과 '${strict.type}' 은 같은 것을 가리키는 표기 차이다`;
  } else if (SET_RE.test(name)) {
    verdict = 'SET_OR_KIT';
    reason = '세트·기획 구성이라 제형이 하나가 아니다';
  } else if (categoryType.endsWith(strict.type) || categoryType.includes(strict.type)) {
    verdict = 'GENERALIZATION_FP';
    reason = `상품명 핵심어 '${strict.type}' 는 카테고리 유형 '${categoryType}' 의 상위·부분 표현이다 — 바꾸면 열화다`;
  } else if (
    // 같은 계열(`클렌징워터` ↔ `클렌징밤`) 안에서 상품명이 다른 제형을 **명시**한 경우다.
    // 두 유형의 구체성이 같으므로 바꿔도 제품 의미가 약해지지 않는다.
    sameFamily(categoryType, strict.type) &&
    GENERIC_USAGE[strict.type] &&
    name.replace(/\s+/g, '').endsWith(strict.kw) &&
    // 판매명 안에 **두 유형이 다 있으면** 한 줄에 여러 제품을 묶은 것이다. 고르지 않는다.
    !name.replace(/\s+/g, '').includes(categoryType)
  ) {
    verdict = 'FAMILY_CORRECTION';
    newType = strict.type;
    reason = `같은 계열 안에서 상품명이 '${strict.kw}' 를 명시한다 — 카테고리 유형 '${categoryType}' 이 어긋났다`;
  } else if (strict.type.includes(categoryType) && strict.type.length > categoryType.length && GENERIC_USAGE[strict.type] && name.replace(/\s+/g, '').endsWith(strict.kw)) {
    verdict = 'SPECIALIZATION';
    newType = strict.type;
    reason = `상품명이 '${categoryType}' 을 '${strict.type}' 으로 더 좁게 말한다`;
  } else {
    verdict = 'DIFFERENT_AXIS';
    reason = `카테고리 '${categoryType}' 와 상품명 '${strict.type}' 이 서로 다른 축이다 — 사람 확인`;
  }

  counts[verdict] = (counts[verdict] ?? 0) + 1;
  rows.push({
    masterId: g.masterId,
    key: g.key,
    brandName: g.brandName,
    productName: name,
    categoryType,
    inferredLoose,
    inferredStrict: strict?.type ?? null,
    matchedKeyword: strict?.kw ?? null,
    verdict,
    newType,
    reason,
  });
}

writeOut('type-triage.json', { meta: { total: rows.length, counts }, rows });
process.stderr.write(`${rows.length} ${JSON.stringify(counts)}\n`);
