/**
 * WO-O4O-COSMETICS-INITIAL-CENSUS-AND-GUIDE-PILOT-V0 — 단계 3: 상품명 → 설명서 단위
 *
 * WO §3 기준을 코드로 옮긴다.
 *   같은 설명서 단위: 색상 차이 / 용량 차이 / 1+1·트윈팩·기획세트 / 본품·리필
 *   별도 제품:        제품 핵심명이 다름 / 제품 유형이 다름 / Tone-up·Matte 등 성격이 다름
 *   **애매하면 자동 병합하지 않는다** → 코어명이 완전히 일치할 때만 병합하고,
 *     유사하지만 다른 경우는 issue-queue 에 올려 사람 판단으로 넘긴다.
 *
 * 각 정규화 규칙에는 ID(R01…)를 달아 적용 빈도를 집계한다. 이 빈도가 기준문서 V0 의 근거가 된다.
 *
 * 산출: tmp/cosmetics-pilot/normalized-products.json, issue-queue.json
 */
import { readOut, writeOut } from './lib.mjs';

/**
 * 코어명에서 제거되는 표기 — 제거해도 "어떤 제품인가"가 바뀌지 않는 것만 넣는다.
 *
 * 주의: JS 의 `\b` 는 [A-Za-z0-9_] 기준이라 한글 뒤에서는 성립하지 않는다.
 *       `70매`·`더블기획` 처럼 한글 단위가 붙는 표기에는 `\b` 대신 `(?![가-힣])` 를 쓴다.
 */
const STRIP_RULES = [
  { id: 'R01', desc: '판매채널 전용/단독 표기', re: /\[(only ?화해|올영단독|단독)\]|\((OY ?단독|올영단독|온|역|단독|공식)\)/gi },
  { id: 'R02', desc: '리뉴얼/차수 코드', re: /\((?:\d{2,4}[A-Z]{0,3}|[A-Z]{1,3}\d{2,4})\)/g },
  { id: 'R03', desc: '증정·기획 구성 괄호', re: /[（(\[][^)）\]]*(?:증정|기획|사은품|추가|더블|묶음|개입|매입|\+)[^)）\]]*[)）\]]/g },
  { id: 'R04', desc: '기획/세트/묶음 표기', re: /(?:더블\s*기획|대용량\s*기획|기획\s*세트|기획|세트|묶음|트윈\s*팩|twin\s*pack|1\s*\+\s*1|2\s*\+\s*1|더블|듀오|패키지)(?![가-힣])/gi },
  { id: 'R05', desc: '용량 (영문 단위)', re: /\d+(?:\.\d+)?\s*(?:ml|mL|ML|g|kg|L|ea|EA|pcs)\b/g },
  { id: 'R05K', desc: '수량 (한글 단위)', re: /\d+\s*(?:매입|개입|매|개|포|정|팩|회분|캡슐|장|박스|줄|족)(?![가-힣])/g },
  { id: 'R06', desc: '수량 곱셈 표기', re: /[x×*]\s*\d+\s*(?:개|매|ea)?/gi },
  { id: 'R07', desc: '본품/리필 표기', re: /(본품|리필|refill)(?![가-힣])/gi },
  { id: 'R10', desc: '선행 대괄호 판촉 문구', re: /^\s*\[[^\]]{0,50}(?:유통기한|클리어런스|할인|세일|특가|한정|증정|기획|사은품|무료|only)[^\]]{0,50}\]\s*/gi },
  { id: 'R11', desc: '유통기한 괄호', re: /[（(][^)）]*유통기한[^)）]*[)）]/g },
  { id: 'R12', desc: '+ 증정 꼬리', re: /[+＋]\s*[^+＋]*(?:증정|사은품)[^+＋]*/g },
  { id: 'R14', desc: 'N종 구성 표기', re: /\d+\s*종(?![가-힣])/g },
  { id: 'R08', desc: '잔여 기호 정리', re: /[*#＊]+|[+＋·、,]+\s*$|^\s*[-–+]+|\(\s*\)|\[\s*\]/g },
];

/** 색상·호수는 제거하되 variant 로 보존한다 (WO §3: 색상 차이는 같은 설명서 단위). */
const COLOR_RULES = [
  { id: 'C01', desc: '괄호/대괄호 색상·호수', re: /[\[(]\s*(?:no\.?\s*)?\d{1,2}\s*호[^\])]*[\])]|[\[(][^\])]{0,15}(?:호|컬러|color|shade)[^\])]{0,15}[\])]/gi },
  { id: 'C02', desc: '맨 호수 표기', re: /\b(?:no\.?\s*)?\d{1,2}\s*호\b/gi },
  { id: 'C03', desc: '톤 계열 표기', re: /\b(웜톤|쿨톤|뉴트럴)\b/gi },
];

/** 제품 유형 — 유형이 다르면 별도 제품 (WO §3). 긴 것부터 매칭한다. */
const TYPES = [
  ['클렌징폼', '클렌징폼'], ['클렌징오일', '클렌징오일'], ['클렌징워터', '클렌징워터'], ['클렌징밤', '클렌징밤'],
  ['선세럼', '선케어'], ['선크림', '선케어'], ['선스틱', '선케어'], ['선쿠션', '선케어'], ['선블록', '선케어'],
  ['수딩크림', '크림'], ['수분크림', '크림'], ['아이크림', '아이크림'], ['핸드크림', '핸드크림'], ['크림', '크림'],
  ['앰플', '앰플'], ['에센스', '에센스'], ['세럼', '세럼'], ['토너패드', '토너패드'], ['토너', '토너'],
  ['로션', '로션'], ['미스트', '미스트'], ['마스크팩', '마스크'], ['마스크', '마스크'], ['팩', '팩'],
  ['샴푸', '샴푸'], ['트리트먼트', '트리트먼트'], ['컨디셔너', '컨디셔너'], ['바디워시', '바디워시'], ['바디로션', '바디로션'],
  ['쿠션', '메이크업'], ['파운데이션', '메이크업'], ['립밤', '립'], ['립스틱', '립'], ['틴트', '립'],
  ['아이라이너', '메이크업'], ['마스카라', '메이크업'], ['섀도우', '메이크업'], ['블러셔', '메이크업'],
  ['오일', '오일'], ['젤', '젤'], ['밤', '밤'], ['스틱', '스틱'], ['파우더', '파우더'], ['비누', '비누'],
  // 기능성 보고 제품명은 붙여쓰기가 많고 어휘도 다르다(실측으로 보강한 목록).
  ['선스크린', '선케어'], ['선플루이드', '선케어'], ['선실드', '선케어'], ['선퀴드', '선케어'],
  ['에멀전', '로션'], ['에멀젼', '로션'], ['모이스춰라이저', '크림'], ['모이스처라이저', '크림'],
  ['패치', '패치'], ['패드', '패드'], ['부스터', '부스터'], ['솔루션', '솔루션'], ['앰퓰', '앰플'],
  ['헤어컬러', '염모제'], ['염모', '염모제'], ['두피토닉', '두피케어'], ['스칼프', '두피케어'],
  ['토닉', '토닉'], ['픽서', '메이크업'], ['프라이머', '메이크업'], ['컨실러', '메이크업'],
  ['비비크림', '메이크업'], ['글로스', '립'], ['립세린', '립'], ['블러셔', '메이크업'], ['블러쉬', '메이크업'],
];

/** 판매처 카테고리 → 우리 유형 어휘. 없으면 카테고리명을 그대로 유형으로 쓴다(출처 기반). */
const CATEGORY_TYPE = {
  '스킨/토너': '토너', '로션/에멀젼': '로션', '크림/젤': '크림', '에센스/세럼': '세럼',
  '미스트/오일': '미스트', 선케어: '선케어', 클렌저: '클렌징폼', '클렌징 오일': '클렌징오일',
  '클렌징 워터': '클렌징워터', '클렌징 비누': '비누', 시트마스크: '마스크', 슬리핑팩: '팩',
  '부분마스크/팩': '팩', '부분마스크 패드': '패드', 쿠션: '메이크업', 파운데이션: '메이크업',
  립스틱: '립', 립틴트: '립', 립글로스: '립', '립케어/립밤': '립', 샴푸: '샴푸',
  '핸드크림/밤': '핸드크림', 바디워시: '바디워시', 스타일링: '헤어스타일링', 젤: '젤',
  // 아래는 파일럿 중 실제로 등장한 카테고리명을 우리 유형 어휘로 맞춘 별칭이다.
  '에센스/앰플/세럼': '세럼', 세럼: '세럼', 에센스: '에센스', 앰플: '앰플',
  '스킨/토너 패드': '토너패드', 패드: '패드', '바디케어 패드': '패드', '클렌징 티슈/패드': '클렌징워터',
  '클렌징 폼': '클렌징폼', '클렌징 젤': '클렌징폼', '클렌징 파우더': '클렌징폼', '클렌징 밤': '클렌징밤',
  '클렌징 로션/크림': '클렌징워터', '클렌징/필링': '클렌징폼', '립/아이 리무버': '클렌징워터',
  '필오프 팩': '팩', '워시오프 팩': '팩', '마스크/팩': '팩', 코팩: '팩', '스크럽/필링': '스크럽',
  리퀴드: '메이크업', 'BB/CC크림': '메이크업', 메이크업베이스: '메이크업', 프라이머: '메이크업',
  베이스메이크업: '메이크업', '파우더/팩트': '메이크업', 팩트: '메이크업', 컨실러: '메이크업',
  블러셔: '메이크업', 하이라이터: '메이크업', 셰이딩: '메이크업', 아이섀도: '메이크업',
  아이메이크업: '메이크업', 메이크업픽서: '메이크업', '마스카라/픽서': '메이크업', 볼륨: '메이크업',
  롱래시: '메이크업', 펜슬: '메이크업', 파우더: '메이크업', 립메이크업: '립', '컬러 립케어/립밤': '립',
  톤업크림: '선케어', 크림: '크림', 로션: '로션', 올인원: '올인원',
  아이케어: '아이크림', 아이크림: '아이크림', 페이스오일: '오일', 부스터: '부스터',
  트러블: '트러블케어', 패치: '패치', 솔루션: '솔루션', '밤/멀티밤': '밤',
  헤어: '헤어케어', 헤어케어: '헤어케어', 헤어스타일링: '헤어스타일링', '헤어에센스/오일': '헤어에센스',
  헤어미스트: '헤어미스트', 헤어컬러링: '염모제', '트리트먼트/팩': '트리트먼트', 손상케어: '트리트먼트',
  컬러케어: '트리트먼트', 두피케어: '두피케어', '두피 스케일러': '두피케어',
  바디: '바디로션', 바디케어: '바디로션', '바디오일/에센스': '바디오일', 바디스크럽: '바디스크럽',
  '바디미스트/샤워코롱': '바디미스트', 데오드란트: '데오드란트', 롤온: '데오드란트', 입욕제: '입욕제',
  핸드워시: '핸드워시', 풋케어: '풋케어', 여성청결제: '여성청결제', 향수: '향수',
  남성향수: '향수', 여성향수: '향수', 네일: '네일', 네일리무버: '네일리무버', 뷰티소품: '뷰티소품',
  속눈썹영양제: '속눈썹영양제', 영양: '트리트먼트',
};
/**
 * 카테고리 경로에서 유형으로 쓸 수 없는 마디.
 *  - 분류축·마감속성(매트/글로시/연령대 등)
 *  - **너무 넓은 상위 마디**(스킨케어) — 유형이 아니라 대분류다. 표본 검수에서
 *    "벨레다 카렌듈라 베이비 오일"이 토너로 잘못 판정된 원인.
 *  - **제형 마감 마디**(스틱/리퀴드/펜슬 등) — 상위 마디(컨실러 등)가 실제 유형이다.
 */
const CATEGORY_SKIP =
  /^(전체|카테고리 전체|매트|글로시|새틴|글리터|보습|수분|진정|모공|각질|브라이트닝|안티에이징|\d+대|40대 이상|남성|여성|스킨케어|워터|스틱|리퀴드|펜슬|볼륨|롱래시|영양)$/;

function typeFromCategory(categoryPath) {
  if (!categoryPath) return null;
  const segs = categoryPath.split(' > ').slice(1).filter((s) => !CATEGORY_SKIP.test(s.trim()));
  for (let i = segs.length - 1; i >= 0; i -= 1) {
    const s = segs[i].trim();
    if (CATEGORY_TYPE[s]) return { type: CATEGORY_TYPE[s], keyword: s, source: 'RETAIL_CATEGORY' };
  }
  const last = segs[segs.length - 1]?.trim();
  return last ? { type: last, keyword: last, source: 'RETAIL_CATEGORY' } : null;
}

/**
 * 한국어 상품명은 뒤쪽이 핵심어다("… 앰플 마스크" = 마스크).
 * 그래서 먼저 나온 키워드가 아니라 **가장 뒤에 나온 키워드**로 유형을 정한다.
 * (파일럿 표본 검수에서 발견: 씨앤피 그리너리 카밍 앰플 마스크 → 앰플로 오판정)
 */
function detectType(name) {
  let best = { type: null, keyword: null, at: -1 };
  for (const [kw, type] of TYPES) {
    const at = name.lastIndexOf(kw);
    if (at > best.at || (at === best.at && at >= 0 && kw.length > best.keyword.length)) {
      best = { type, keyword: kw, at };
    }
  }
  return best.at >= 0 ? { type: best.type, keyword: best.keyword } : { type: null, keyword: null };
}

function normalize(rawName, brandName) {
  const applied = [];
  const variants = [];
  let s = ` ${rawName} `;

  for (const r of COLOR_RULES) {
    const hits = s.match(r.re);
    if (hits) {
      applied.push(r.id);
      variants.push(...hits.map((h) => h.trim()));
      s = s.replace(r.re, ' ');
    }
  }
  for (const r of STRIP_RULES) {
    if (r.re.test(s)) {
      applied.push(r.id);
      s = s.replace(r.re, ' ');
    }
    r.re.lastIndex = 0;
  }
  /**
   * R13 구성품 나열 꼬리 제거.
   * `+` 앞에 이미 제품 유형(세럼·로션 등)이 나왔다면 뒤는 함께 파는 다른 제품이다.
   * 반대로 `그린티 + LHA …` 처럼 앞에 유형이 없으면 제품명의 일부이므로 건드리지 않는다.
   */
  const plus = s.search(/[+＋]/);
  if (plus > 0 && detectType(s.slice(0, plus)).type) {
    applied.push('R13');
    s = s.slice(0, plus) + ' ';
  }
  // R09 브랜드 접두 제거 — 상품명이 브랜드로 시작하면 코어에서 뺀다 (종합몰 표기 관례).
  if (brandName) {
    const b = brandName.trim();
    const re = new RegExp(`^\\s*\\[?${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]?\\s*`, 'i');
    if (re.test(s)) {
      applied.push('R09');
      s = s.replace(re, ' ');
    }
  }
  const core = s.replace(/\s{2,}/g, ' ').replace(/^[\s\-–+/]+|[\s\-–+/]+$/g, '').trim();
  return { core, applied: [...new Set(applied)], variants: [...new Set(variants)] };
}

const keyOf = (brand, core) => `${(brand ?? '').trim().toLowerCase()}|${core.replace(/\s+/g, '').toLowerCase()}`;

function loadCandidates() {
  const f = readOut('functional-candidates-500.json').candidates.map((c) => ({ ...c, group: 'functional' }));
  const g = readOut('general-candidates-500.json').candidates.map((c) => ({ ...c, group: 'general' }));
  return [...f, ...g];
}

function main() {
  const all = loadCandidates();
  const targets = all.filter((c) => c.candidateDecision === 'TARGET');

  const ruleCount = {};
  const units = new Map();
  for (const c of targets) {
    const n = normalize(c.sourceProductName, c.brandName);
    for (const id of n.applied) ruleCount[id] = (ruleCount[id] ?? 0) + 1;
    if (!n.core) continue; // 정규화 후 남는 게 없으면 단위를 만들 수 없다 → issue 로 별도 처리
    // 유형은 **판매처 카테고리를 먼저** 쓴다. 이름 키워드는 카테고리가 없을 때의 보조 수단이다.
    const byCat = typeFromCategory(c.raw?.categoryPath);
    const byName = detectType(n.core);
    const { type, keyword } = byCat ?? byName;
    const typeSource = byCat ? 'RETAIL_CATEGORY' : byName.type ? 'NAME_KEYWORD' : null;
    const k = keyOf(c.brandName, n.core);
    if (!units.has(k)) {
      units.set(k, {
        unitKey: k,
        group: c.group,
        brandName: c.brandName,
        canonicalProductName: n.core,
        productType: type,
        typeKeyword: keyword,
        productTypeSource: typeSource,
        variants: [],
        members: [],
        englishProductName: null,
      });
    }
    const u = units.get(k);
    u.variants.push(...n.variants);
    u.englishProductName ??= c.englishProductName ?? null;
    u.members.push({
      source: c.source,
      sourceProductName: c.sourceProductName,
      sourceUrl: c.sourceUrl,
      appliedRules: n.applied,
      variants: n.variants,
      platformCleanName: c.raw?.platformCleanName ?? null,
      capacity: c.raw?.capacity ?? null,
      categoryPath: c.raw?.categoryPath ?? null,
    });
  }
  for (const u of units.values()) u.variants = [...new Set(u.variants)];

  // ── issue-queue: 사람 판단이 필요한 건만 올린다 ─────────────────────────────
  const issues = [];
  for (const c of all) {
    if (c.candidateDecision === 'TARGET') continue;
    issues.push({
      issueType: c.candidateDecision === 'CHECK' ? 'CANDIDATE_CHECK' : 'CANDIDATE_UNCONFIRMED',
      group: c.group,
      sourceProductName: c.sourceProductName,
      brandName: c.brandName ?? null,
      sourceUrl: c.sourceUrl,
      note: c.decisionNote,
    });
  }
  for (const c of targets) {
    const n = normalize(c.sourceProductName, c.brandName);
    if (!n.core) {
      issues.push({
        issueType: 'NORMALIZE_EMPTY_CORE',
        group: c.group,
        sourceProductName: c.sourceProductName,
        brandName: c.brandName ?? null,
        sourceUrl: c.sourceUrl,
        note: '정규화 후 코어명이 비었다 — 규칙이 과하게 제거했을 가능성',
      });
    }
  }
  // 화해가 제공하는 platformCleanName 과 우리 코어명이 다른 건 = 독립 대조 실패 → 사람 확인 대상
  /**
   * 화해 정리명에는 판매명에 없는 자체 메타데이터가 붙는다([SPF50+/PA++++], (리뉴얼)).
   * 이는 우리 정규화의 오차가 아니므로 대조 전에 양쪽에서 동일하게 걷어낸다.
   */
  const stripSourceMeta = (s) =>
    (s ?? '').replace(/\[\s*SPF[^\]]*\]/gi, ' ').replace(/\[\s*PA\+*\s*\]/gi, ' ').replace(/\(\s*리뉴얼\s*\)/g, ' ');
  const norm = (s) => stripSourceMeta(s).replace(/\s+/g, '').toLowerCase();
  /**
   * 화해는 수식어를 뒤 대괄호로 옮기는 자체 표기 관례가 있다("에센셜 마스크 [티트리진정수분]").
   * 단어 배열만 다르고 구성 문자가 같으면 **같은 제품을 다르게 적은 것**이므로 실질 불일치가 아니다.
   */
  const charKey = (s) => [...stripSourceMeta(s).toLowerCase().replace(/[^0-9a-z가-힣]/g, '')].sort().join('');
  let compared = 0;
  let agreed = 0;
  let agreedReordered = 0;
  let agreedVariantSplit = 0;
  for (const u of units.values()) {
    for (const m of u.members) {
      if (!m.platformCleanName) continue;
      compared += 1;
      if (norm(m.platformCleanName) === norm(u.canonicalProductName)) agreed += 1;
      else if (charKey(m.platformCleanName) === charKey(u.canonicalProductName)) {
        agreed += 1;
        agreedReordered += 1;
      }
      // 화해는 색상·호수를 제품명에 남긴다. 우리는 WO §3 대로 variant 로 분리하므로,
      // 분리한 variant 를 되돌려 붙였을 때 일치하면 정보 손실 없는 정상 처리다.
      else if (charKey(m.platformCleanName) === charKey(u.canonicalProductName + (m.variants ?? []).join(''))) {
        agreed += 1;
        agreedVariantSplit += 1;
      } else {
        issues.push({
          issueType: 'NORMALIZE_DISAGREE_WITH_SOURCE',
          group: u.group,
          sourceProductName: m.sourceProductName,
          brandName: u.brandName,
          sourceUrl: m.sourceUrl,
          note: `우리 코어명 "${u.canonicalProductName}" ≠ 화해 정리명 "${m.platformCleanName}"`,
        });
      }
    }
  }
  // 같은 브랜드 안에서 코어명이 서로의 접두인 쌍 = 오병합 위험 지점 → 병합하지 않고 기록만 한다
  const byBrand = new Map();
  for (const u of units.values()) {
    if (!u.brandName) continue;
    const list = byBrand.get(u.brandName) ?? [];
    list.push(u);
    byBrand.set(u.brandName, list);
  }
  for (const list of byBrand.values()) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = norm(list[i].canonicalProductName);
        const b = norm(list[j].canonicalProductName);
        if (a !== b && (a.startsWith(b) || b.startsWith(a))) {
          issues.push({
            issueType: 'POSSIBLE_SAME_UNIT',
            group: list[i].group,
            brandName: list[i].brandName,
            sourceProductName: `${list[i].canonicalProductName} / ${list[j].canonicalProductName}`,
            sourceUrl: null,
            note: '코어명이 서로의 접두 — 같은 단위일 수 있으나 자동 병합하지 않음',
          });
        }
      }
    }
  }

  const unitList = [...units.values()];
  const merged = unitList.filter((u) => u.members.length > 1);
  const summary = {
    wo: 'WO-O4O-COSMETICS-INITIAL-CENSUS-AND-GUIDE-PILOT-V0',
    rawCandidates: all.length,
    targetCandidates: targets.length,
    guideUnits: unitList.length,
    guideUnitsFunctional: unitList.filter((u) => u.group === 'functional').length,
    guideUnitsGeneral: unitList.filter((u) => u.group === 'general').length,
    mergedUnits: merged.length,
    mergedAwayCount: targets.length - unitList.length,
    unitsWithVariants: unitList.filter((u) => u.variants.length).length,
    unitsWithType: unitList.filter((u) => u.productType).length,
    unitsTypeFromCategory: unitList.filter((u) => u.productTypeSource === 'RETAIL_CATEGORY').length,
    unitsTypeFromName: unitList.filter((u) => u.productTypeSource === 'NAME_KEYWORD').length,
    ruleApplicationCount: ruleCount,
    sourceCleanNameCompared: compared,
    sourceCleanNameAgreed: agreed,
    sourceCleanNameAgreedReordered: agreedReordered,
    sourceCleanNameAgreedVariantSplit: agreedVariantSplit,
    sourceCleanNameAgreementPct: compared ? Math.round((agreed / compared) * 1000) / 10 : null,
    issueCount: issues.length,
    issueByType: issues.reduce((a, i) => ((a[i.issueType] = (a[i.issueType] ?? 0) + 1), a), {}),
  };

  writeOut('normalized-products.json', { meta: summary, units: unitList });
  writeOut('issue-queue.json', { meta: { issueCount: issues.length, byType: summary.issueByType }, issues });
  process.stderr.write(JSON.stringify(summary, null, 2) + '\n');
}

main();
