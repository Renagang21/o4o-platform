/**
 * WO-O4O-EASY-DRUG-KO-SOURCE-CONSISTENCY-AUDIT-V1 / 단계 2 — 대조 엔진
 *
 * 제품별 식약처 e약은요 공식 원문 ↔ 현재 KO STORE canonical 설명서의 **내용 정합성**을 전수 대조한다.
 *
 * 이 스크립트는 DB 에 접속하지 않는다. 입력은 `export-audit-pairs.sql` 산출 JSONL, 출력은 파일뿐이다.
 * (read-only 단계 — DB write 0)
 *
 * 실행:
 *   node audit-ko-source-consistency.mjs --in <audit-pairs.jsonl> --out <outDir>
 *
 * 대조 축 14개:
 *   1 효능·효과   2 용법·용량   3 연령   4 1회량   5 1일 횟수   6 투여 경로   7 사용 기간·간격
 *   8 경고·금기   9 상담 필요 조건   10 이상반응   11 상호작용   12 부정어·경고 강도
 *   13 타 제품 내용 혼입   14 공식 원문에 없는 확대 설명
 *
 * 판정 우선순위(위가 우선):
 *   KO_STRUCTURE_REMAINING  구조 결함이 남아 내용 판정 자체가 불가 → 구조 복구 후 재검증
 *   KO_SOURCE_UNRESOLVED    공식 원문에 효능 또는 용법이 없어 기준이 성립하지 않음 → HOLD
 *   KO_WRONG_ATTRIBUTION    다른 제품의 원문에서 온 본문 → 기존 설명서 해제
 *   KO_CONTRADICTED         원문과 값이 충돌 → 즉시 제외
 *   KO_MISSING_CONTENT      원문에 있는 내용이 빠짐 → KO 복구
 *   KO_EXTRA_CONTENT        원문에 없는 내용이 추가됨 → KO 수정
 *   KO_DISPLAY_ONLY_DIFFERENCE  표현·배치만 다름 → 번역 가능
 *   KO_SOURCE_MATCH         내용 일치 → 번역 가능
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

export const AUDIT_RULE_VERSION = 'KO_SOURCE_CONSISTENCY_V1';

/**
 * 원문 절.
 * - REQUIRED_SECTIONS : 본문에 반영되어야 하는 절(누락 판정 대상). storage 는 14축 밖이라 제외.
 * - SECTIONS          : "원문 전체"(추가·충돌 판정의 기준 코퍼스). storage 를 **포함**해야 한다.
 *   storage 를 코퍼스에서 빼면 본문의 보관 관련 서술이 전부 "원문에 없는 내용"으로 오탐된다.
 */
const SECTIONS = ['efficacy', 'usage', 'warning', 'caution', 'interaction', 'sideEffect', 'storage'];
const REQUIRED_SECTIONS = ['efficacy', 'usage', 'warning', 'caution', 'interaction', 'sideEffect'];

// ─────────────────────────────────────────────────────────────── 정규화

function decodeEntities(s) {
  return String(s)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/gi, '&');
}

/** HTML → 평문. 블록 경계는 개행으로 남겨 문장이 붙지 않게 한다. */
function htmlToText(html) {
  const withBreaks = String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|h4|li|tr|section|td|th)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ');
  return decodeEntities(withBreaks)
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * 포함 비교용 정규화. 한국어는 띄어쓰기가 흔들리므로 공백을 전부 제거하고,
 * 표기 변형(가운뎃점·물결·붙임표·괄호 종류)을 통일한다.
 */
function canon(s) {
  return String(s)
    .normalize('NFC')
    .replace(/[ㆍ·․‧∙]/g, '·')
    .replace(/[〜～]/g, '~')
    .replace(/[–—−]/g, '-')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/** 문장 분할. 종결어미/마침표/개행 기준. */
function sentences(text) {
  return String(text)
    .split(/\n+|(?<=(?:다|요)\.)\s+|(?<=\.)\s+(?=[가-힣A-Z])/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

// ─────────────────────────────────────────────────────────────── 축 추출

const RE_AGE = /(만\s*)?(\d+)\s*(세|개월)/g;
const RE_PER_DAY = /1\s*일\s*(\d+(?:\s*[~\-]\s*\d+)?)\s*회/g;
const RE_PER_DOSE =
  /1\s*회\s*([\d]+(?:\/\d+)?(?:\.\d+)?(?:\s*[~\-]\s*[\d]+(?:\/\d+)?(?:\.\d+)?)?)\s*(정|캡슐|포|병|매|방울|스푼|티스푼|봉|팩|앰플|바이알|장|개|컵|회분|mL|ml|㎖|L|g|mg|㎎)/g;
const RE_INTERVAL = /(\d+)\s*(분|시간|일|주|개월)\s*(이상|이내|마다|간격|간)/g;
const RE_STRENGTH = /(\d+(?:\.\d+)?)\s*(mg|㎎|g|mL|ml|㎖|iu|IU|㎍|mcg|%)/g;

/**
 * 투여 경로 — 표현 다양성이 커서 어휘군으로 판정한다.
 * 부분일치 함정을 막기 위해 문맥 조건을 붙인다:
 *   "궁금한 점이 있으면" → otic 오탐, "올바르게" → topical 오탐, "직장에서" → rectal 오탐.
 */
const ROUTE_LEXICON = [
  ['oral', /복용|내복|경구|삼키|먹습니다|드십시오/],
  ['topical', /(?<!올)바르(?=[십세게시어아 ])|도포|문지르|피부에\s*적용/],
  ['patch', /붙이|부착|첩부/],
  ['ophthalmic', /점안|눈에\s*넣/],
  ['nasal', /점비액|코에\s*(넣|분무)|비강/],
  ['otic', /점이액|점이제|귀에\s*(넣|점적)|외이도/],
  ['rectal', /좌제|항문|직장\s*(내|에)\s*(투여|삽입|넣)/],
  ['vaginal', /질정|질에\s*(넣|삽입)/],
  ['gargle', /가글|양치|헹구/],
  ['inhalation', /흡입|들이마/],
  ['oromucosal', /설하|혀\s*밑|입\s*안에서\s*녹|구강\s*내에서\s*녹/],
];

/** 부정어·경고 강도 — 강한 금지 / 약한 주의를 구분해 강도 약화(약칭 downgrade)를 잡는다. */
const RE_STRONG_PROHIBITION =
  /하지\s*마(십시오|세요|시오)|하지\s*말\s*것|금지|금기|투여하지\s*않|사용해서는\s*안|복용해서는\s*안|절대\s*/g;
const RE_CONSULT = /(의사|약사|치과의사|전문가)[^.\n]{0,30}(상의|문의|상담)/g;

/**
 * 수치축 추출 전 표기 정규화.
 * e약은요 원문은 전각 물결(～ U+FF5E) / 물결 연산자(∼ U+223C) / "100 mg" 처럼 단위 앞 공백을 쓰고,
 * 현재 canonical 은 "~" / "100mg" 로 쓴다. 정규화하지 않으면 동일 용량이 CONTRADICTED 로 잡힌다.
 */
function numNorm(text) {
  return String(text)
    .normalize('NFC')
    .replace(/[〜～∼〰]/g, '~')
    .replace(/[–—−]/g, '-')
    .replace(/(\d)\s+(mg|㎎|g|mL|ml|㎖|L|IU|iu|㎍|mcg|%)/g, '$1$2');
}

function extractAll(re, text) {
  const out = [];
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let m;
  while ((m = r.exec(text)) !== null) out.push(m);
  return out;
}

function ageTokens(text) {
  return extractAll(RE_AGE, numNorm(text)).map((m) => `${m[2]}${m[3]}`);
}
function perDayTokens(text) {
  return extractAll(RE_PER_DAY, numNorm(text)).map((m) => m[1].replace(/\s+/g, ''));
}
function perDoseTokens(text) {
  return extractAll(RE_PER_DOSE, numNorm(text)).map(
    (m) => `${m[1].replace(/\s+/g, '')}${m[2].toLowerCase()}`,
  );
}
function intervalTokens(text) {
  return extractAll(RE_INTERVAL, numNorm(text)).map((m) => `${m[1]}${m[2]}${m[3]}`);
}
function strengthTokens(text) {
  return extractAll(RE_STRENGTH, numNorm(text)).map((m) => `${m[1]}${m[2].toLowerCase()}`);
}
function routeSet(text) {
  return ROUTE_LEXICON.filter(([, re]) => re.test(text)).map(([k]) => k);
}
function countStrongProhibition(text) {
  return extractAll(RE_STRONG_PROHIBITION, text).length;
}
function consultCount(text) {
  return extractAll(RE_CONSULT, text).length;
}

/**
 * 효능 문구에서 적응증 용어를 뽑는다.
 * "이 약은 A, B, C에 사용합니다" → [A, B, C]
 */
function indicationTerms(efficacyText) {
  let t = String(efficacyText || '').trim();
  if (!t) return [];
  // 관용 서술 틀을 제거한다. 원문은 "…에 사용합니다", 현재 본문은 "…에 사용하는 일반의약품입니다"
  // 처럼 어미가 달라서, 틀을 지우지 않으면 마지막 항목이 통째로 불일치 처리된다.
  t = t
    .replace(/^이\s*약은\s*/, '')
    .replace(/에?\s*사용(합니다|하는|되는|할\s*수)[\s\S]*$/, '')
    .replace(/에?\s*(쓰는|쓰이는)[\s\S]*$/, '')
    .replace(/\s*증상의?\s*(완화|개선)[\s\S]*$/, '')
    .replace(/\s*(의|에)\s*(보급|완화|개선|예방|치료)\s*$/, '');
  return t
    .split(/[,、]|ㆍ|·(?![0-9])/)
    .map((x) => x.trim().replace(/^및\s*/, '').replace(/[.]$/, ''))
    .filter((x) => x.length >= 2 && x.length <= 60);
}

/** 현재 본문이 스스로 주장하는 적응증(카드형 문서의 작용/주요 증상/인트로). */
function canonicalClaimedIndications(html, plain) {
  const claims = [];
  for (const m of html.matchAll(/<p class="sd-intro">([\s\S]*?)<\/p>/g)) claims.push(m[1]);
  for (const m of html.matchAll(
    /<span class="sd-tag">(?:작용|주요 증상)<\/span>\s*<p>([\s\S]*?)<\/p>/g,
  ))
    claims.push(m[1]);
  for (const m of html.matchAll(/<p><strong>효능·효과<\/strong><br\s*\/?>([\s\S]*?)<\/p>/g))
    claims.push(m[1]);
  if (claims.length === 0) {
    for (const line of plain.split('\n')) {
      if (/^이\s*약은[\s\S]*사용합니다\.?$/.test(line.trim())) claims.push(line);
    }
  }
  return claims.flatMap((c) => indicationTerms(htmlToText(c)));
}

// ─────────────────────────────────────────────────────────────── 다중집합 비교

/**
 * 값 집합 차이. **다중집합이 아니라 집합**으로 비교한다.
 * 재구성된 문서는 같은 값을 여러 번 반복하므로(뱃지·요약·본문), 등장 횟수 차이를 충돌로 세면
 * 실측 62%가 오탐이 된다. 판정 기준은 "그 값이 상대편에 아예 없는가" 뿐이다.
 */
function setDiff(a, b) {
  const B = new Set(b);
  return [...new Set(a)].filter((x) => !B.has(x));
}

/** 의미 없는 조사·상투어 — 확대 설명 판정에서 제외한다. */
const STOPWORDS = new Set([
  '일반의약품', '의약품', '사용', '증상', '완화', '개선', '제품', '이약', '경우', '가능',
  '다양한', '광범위', '폭넓은', '등의', '으로', '하는', '되는', '있는', '통증', '치료',
  '복용', '투여', '함유', '성분', '함량', '제형', '기준', '관리', '확인', '상담', '문의',
]);

const RE_TAIL =
  /(합니다|입니다|됩니다|습니다|하십시오|하며|하고|하여|되어|되는|하는|시키는|시켜|으로|에서|에게|이나|이며|들이|들을|을|를|이|가|은|는|의|에|와|과|도|만|로)$/;

/** 한국어 내용어 토큰 추출 — 조사·어미를 반복 제거해 명사 어간에 가깝게 만든다. */
function contentTokens(text) {
  return String(text)
    .replace(/[^가-힣A-Za-z0-9]+/g, ' ')
    .split(/\s+/)
    .map((w) => {
      let t = w;
      for (let i = 0; i < 3; i += 1) {
        const next = t.replace(RE_TAIL, '');
        if (next === t || next.length < 2) break;
        t = next;
      }
      return t;
    })
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

function jaccard(a, b) {
  const A = new Set(a.map(canon).filter(Boolean));
  const B = new Set(b.map(canon).filter(Boolean));
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / (A.size + B.size - inter);
}

/** 3-gram 기반 근사 포함률 — 완전 일치가 아니어도 실질 반영 여부를 본다. */
function ngramCoverage(needle, haystack) {
  const n = canon(needle);
  if (n.length < 3) return haystack.includes(n) ? 1 : 0;
  let hit = 0;
  let tot = 0;
  for (let i = 0; i + 3 <= n.length; i += 1) {
    tot += 1;
    if (haystack.includes(n.slice(i, i + 3))) hit += 1;
  }
  return tot === 0 ? 0 : hit / tot;
}

// ─────────────────────────────────────────────────────────────── 단건 대조

const SENTENCE_MIN_LEN = 8;
const SENTENCE_COVERAGE_OK = 0.9; // 이 이상이면 "반영됨"
const TERM_COVERAGE_OK = 0.85;

function auditRecord(rec, attributionVerdict) {
  const off = rec.officialConsumerText || {};
  const plain = htmlToText(rec.content);
  const cplain = canon(plain);
  const findings = [];
  const axes = {};

  const offSectionText = {};
  for (const s of SECTIONS) offSectionText[s] = String(off[s] ?? '').trim();
  /** 추가·충돌 판정의 기준 코퍼스 = 원문 7절 전체 (storage 포함). */
  const offAllText = SECTIONS.map((s) => offSectionText[s]).join('\n');

  // ── 축 1 효능·효과 (적응증 용어 단위)
  const offTerms = indicationTerms(offSectionText.efficacy);
  const missingTerms = offTerms.filter((t) => ngramCoverage(t, cplain) < TERM_COVERAGE_OK);
  axes.efficacy = { officialTerms: offTerms.length, missingTerms };
  if (missingTerms.length) findings.push({ axis: 'efficacy', kind: 'MISSING', detail: missingTerms.slice(0, 8) });

  // ── 축 14 원문 외 확대 설명 (본문이 주장하는 적응증 중 원문에 없는 것)
  // 조각(구·절) 단위로 대조하면 원문에 있는 용어까지 어미 차이로 탈락한다.
  // 내용어 토큰 단위로 내려서 "원문 어디에도 없는 개념"만 확대 설명으로 본다.
  const claimed = canonicalClaimedIndications(rec.content, plain);
  const coffAll = canon(offAllText);
  const claimedTokens = [...new Set(claimed.flatMap(contentTokens))];
  const extraTerms = claimedTokens.filter((t) => !coffAll.includes(canon(t)));
  axes.extraIndication = { claimed: claimed.length, claimedTokens: claimedTokens.length, extraTerms };
  if (extraTerms.length) findings.push({ axis: 'extraIndication', kind: 'EXTRA', detail: extraTerms.slice(0, 8) });

  // ── 축 2·8·10·11 원문 문장 반영률 (절별)
  const sectionCoverage = {};
  for (const s of REQUIRED_SECTIONS) {
    const txt = offSectionText[s];
    if (!txt) {
      sectionCoverage[s] = null;
      continue;
    }
    const ss = sentences(txt).filter((x) => x.length >= SENTENCE_MIN_LEN);
    const missing = ss.filter((x) => ngramCoverage(x, cplain) < SENTENCE_COVERAGE_OK);
    sectionCoverage[s] = { sentences: ss.length, missing: missing.length };
    if (missing.length) {
      findings.push({
        axis: s,
        kind: 'MISSING',
        detail: missing.slice(0, 3).map((x) => (x.length > 90 ? `${x.slice(0, 90)}…` : x)),
        missingCount: missing.length,
        totalCount: ss.length,
      });
    }
  }
  axes.sectionCoverage = sectionCoverage;

  // ── 축 3·4·5·7 수치 축 (연령 / 1회량 / 1일 횟수 / 기간·간격) + 함량
  // strength(성분 함량)는 14축 밖이다. 본문은 ProductMaster 의 성분·함량을 정당하게 싣고 있고
  // e약은요 원문은 함량을 적지 않는 경우가 많아, 충돌로 세면 전량 오탐이 된다. 참고 기록만 한다.
  const numericAxes = [
    ['age', ageTokens],
    ['perDose', perDoseTokens],
    ['perDay', perDayTokens],
    ['interval', intervalTokens],
  ];
  const contradictions = [];
  const numericMissing = [];
  // 원문이 "1회 0.5~1정(100~200 mg)" 처럼 병기하면 정규식은 앞 단위(정)만 잡는다.
  // 본문이 뒤 단위(100~200mg)를 골라 쓴 것은 충돌이 아니므로, 원문 어딘가에 그대로 있는 값은 살려준다.
  const coffNum = canon(numNorm(offAllText));
  const statedInOfficial = (tok) => tok.length >= 3 && coffNum.includes(canon(tok));
  for (const [name, fn] of numericAxes) {
    const o = fn(offAllText);
    const c = fn(plain);
    const missing = setDiff(o, c);
    const extra = setDiff(c, o).filter((t) => !statedInOfficial(t));
    axes[name] = { official: o.length, canonical: c.length, missing, extra };
    // 원문에 값이 있는데 본문이 원문에 없는 값을 주장 = 충돌
    if (o.length > 0 && extra.length > 0) contradictions.push({ axis: name, extra: extra.slice(0, 8) });
    if (missing.length > 0) numericMissing.push({ axis: name, missing: missing.slice(0, 8) });
  }
  {
    const o = strengthTokens(offAllText);
    const c = strengthTokens(plain);
    axes.strength = {
      official: o.length,
      canonical: c.length,
      missing: setDiff(o, c),
      extra: setDiff(c, o),
      note: 'INFORMATIONAL_ONLY_NOT_A_VERDICT_AXIS',
    };
  }
  for (const c of contradictions) findings.push({ axis: c.axis, kind: 'CONTRADICT', detail: c.extra });
  for (const m of numericMissing) findings.push({ axis: m.axis, kind: 'MISSING', detail: m.missing });

  // ── 축 6 투여 경로
  // 경로는 **용법 문맥에서만** 판정한다. 주의사항까지 포함하면 관장약·외용제의
  // "복용하지 마십시오" 같은 경고 문장이 oral 로 잡혀 전량 오탐이 된다.
  const offRoutes = routeSet(offSectionText.usage || offAllText);
  const canUsageText =
    (plain.match(/(?:복용|사용|투여|점안|점적)\s*안내([\s\S]*?)(?=주의\s*대상|주의사항|안전정보|$)/) ||
      [])[1] || plain;
  const canRoutes = routeSet(canUsageText);
  const routeMissing = offRoutes.filter((r) => !canRoutes.includes(r));
  const routeExtra = canRoutes.filter((r) => !offRoutes.includes(r));
  axes.route = { official: offRoutes, canonical: canRoutes, missing: routeMissing, extra: routeExtra };
  if (offRoutes.length > 0 && routeExtra.length > 0)
    findings.push({ axis: 'route', kind: 'CONTRADICT', detail: routeExtra });
  if (routeMissing.length > 0) findings.push({ axis: 'route', kind: 'MISSING', detail: routeMissing });

  // ── 축 12 부정어·경고 강도
  const offProh = countStrongProhibition(offAllText);
  const canProh = countStrongProhibition(plain);
  axes.prohibition = { official: offProh, canonical: canProh };
  if (offProh > 0 && canProh === 0)
    findings.push({ axis: 'prohibition', kind: 'MISSING', detail: [`원문 금지표현 ${offProh}건 → 본문 0건`] });
  else if (offProh > 0 && canProh < Math.ceil(offProh / 2))
    findings.push({
      axis: 'prohibition',
      kind: 'WEAKENED',
      detail: [`원문 ${offProh}건 → 본문 ${canProh}건`],
    });

  // ── 축 9 상담 필요 조건
  const offConsult = consultCount(offAllText);
  const canConsult = consultCount(plain);
  axes.consult = { official: offConsult, canonical: canConsult };
  if (offConsult > 0 && canConsult === 0)
    findings.push({ axis: 'consult', kind: 'MISSING', detail: ['원문 상담 안내가 본문에 없음'] });

  // ── 구조 잔여 결함 (문장 절단 · 태그 불균형)
  const openDiv = (rec.content.match(/<div/g) || []).length;
  const closeDiv = (rec.content.match(/<\/div>/g) || []).length;
  const openP = (rec.content.match(/<p[\s>]/g) || []).length;
  const closeP = (rec.content.match(/<\/p>/g) || []).length;
  const trimmed = plain.replace(/\s+$/, '');
  const structureIssues = [];
  const cosmeticIssues = [];
  if (openDiv !== closeDiv) structureIssues.push(`DIV_UNBALANCED ${openDiv}/${closeDiv}`);
  if (openP !== closeP) structureIssues.push(`P_UNBALANCED ${openP}/${closeP}`);
  if (plain.trim().length === 0) structureIssues.push('EMPTY_BODY');
  // 말미 구분선(--- 등)은 렌더 잔여물일 뿐 문장 절단이 아니다. 절단 판정과 분리한다.
  const withoutRule = trimmed.replace(/[\s\-–—_=·]+$/, '');
  if (withoutRule !== trimmed) cosmeticIssues.push('TRAILING_RULE_ARTIFACT');
  if (withoutRule.length > 0 && !/[.!?)\]”"']$|[요다음임함]$/.test(withoutRule))
    structureIssues.push(`SENTENCE_TRUNCATED_TAIL "${withoutRule.slice(-14)}"`);
  axes.structure = { issues: structureIssues, cosmetic: cosmeticIssues };

  // ── 판정
  const hasSource = offSectionText.efficacy.length > 0 && offSectionText.usage.length > 0;
  const missingFindings = findings.filter((f) => f.kind === 'MISSING' || f.kind === 'WEAKENED');
  const extraFindings = findings.filter((f) => f.kind === 'EXTRA');
  const contradictFindings = findings.filter((f) => f.kind === 'CONTRADICT');

  let verdict;
  if (structureIssues.length > 0) verdict = 'KO_STRUCTURE_REMAINING';
  else if (!hasSource) verdict = 'KO_SOURCE_UNRESOLVED';
  else if (attributionVerdict) verdict = 'KO_WRONG_ATTRIBUTION';
  else if (contradictFindings.length > 0) verdict = 'KO_CONTRADICTED';
  else if (missingFindings.length > 0) verdict = 'KO_MISSING_CONTENT';
  else if (extraFindings.length > 0) verdict = 'KO_EXTRA_CONTENT';
  else if (canon(plain) === canon(offAllText)) verdict = 'KO_SOURCE_MATCH';
  else verdict = 'KO_DISPLAY_ONLY_DIFFERENCE';

  return {
    ruleVersion: AUDIT_RULE_VERSION,
    itemSeq: rec.itemSeq,
    candidateId: rec.candidateId,
    descriptionId: rec.descriptionId,
    contentMd5: rec.contentMd5,
    sourceType: rec.sourceType,
    nMaster: rec.nMaster,
    masterName: rec.masterName,
    nPermitsSharingBody: rec.nPermitsSharingBody,
    nVariantsInPermit: rec.nVariantsInPermit,
    verdict,
    attributionReason: attributionVerdict ?? null,
    findingCounts: {
      missing: missingFindings.length,
      extra: extraFindings.length,
      contradict: contradictFindings.length,
      structure: structureIssues.length,
    },
    findings,
    axes,
    storageInOfficialOnly:
      offSectionText.storage.length > 0 && ngramCoverage(offSectionText.storage, cplain) < 0.6,
  };
}

// ─────────────────────────────────────────────────────────────── 귀속 판정 (전역 1패스)

const ATTRIBUTION_JACCARD_MIN = 0.6;

/**
 * 같은 본문(cmd5)을 2개 이상 허가품목이 공유하는 경우,
 * 그 허가품목들의 **공식 원문 효능**이 실질적으로 같은지 본다.
 * 하나라도 크게 다르면 그 본문은 특정 제품의 원문에서 온 것을 다른 제품에 붙인 것 → 오귀속.
 */
function computeAttribution(records) {
  const byBody = new Map();
  for (const r of records) {
    if (!byBody.has(r.contentMd5)) byBody.set(r.contentMd5, []);
    byBody.get(r.contentMd5).push(r);
  }
  const verdicts = new Map(); // key: itemSeq::cmd5 → reason
  for (const [cmd5, group] of byBody) {
    if (group.length < 2) continue;
    const termSets = group.map((r) => indicationTerms(String((r.officialConsumerText || {}).efficacy ?? '')));
    let worst = 1;
    let worstPair = null;
    for (let i = 0; i < termSets.length; i += 1) {
      for (let j = i + 1; j < termSets.length; j += 1) {
        const s = jaccard(termSets[i], termSets[j]);
        if (s < worst) {
          worst = s;
          worstPair = [group[i].itemSeq, group[j].itemSeq];
        }
      }
    }
    if (worst < ATTRIBUTION_JACCARD_MIN) {
      for (const r of group) {
        verdicts.set(
          `${r.itemSeq}::${cmd5}`,
          `SHARED_BODY_DIVERGENT_OFFICIAL_EFFICACY jaccard=${worst.toFixed(2)} permits=${group.length} worstPair=${worstPair?.join('/')}`,
        );
      }
    }
  }
  return verdicts;
}

// ─────────────────────────────────────────────────────────────── main

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`--${name} 필요`);
}

function main() {
  const inPath = arg('in');
  const outDir = arg('out');
  mkdirSync(outDir, { recursive: true });

  const records = readFileSync(inPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  const attribution = computeAttribution(records);

  const results = [];
  for (const r of records) {
    results.push(auditRecord(r, attribution.get(`${r.itemSeq}::${r.contentMd5}`) ?? null));
  }

  const byVerdict = {};
  const bySourceVerdict = {};
  const axisFindingCount = {};
  const permitVerdict = new Map(); // 허가품목 단위 최악 판정
  const SEVERITY = [
    'KO_SOURCE_MATCH',
    'KO_DISPLAY_ONLY_DIFFERENCE',
    'KO_EXTRA_CONTENT',
    'KO_MISSING_CONTENT',
    'KO_CONTRADICTED',
    'KO_WRONG_ATTRIBUTION',
    'KO_SOURCE_UNRESOLVED',
    'KO_STRUCTURE_REMAINING',
  ];
  let masterCovered = 0;
  const masterByVerdict = {};

  for (const x of results) {
    byVerdict[x.verdict] = (byVerdict[x.verdict] ?? 0) + 1;
    const sk = `${x.sourceType}::${x.verdict}`;
    bySourceVerdict[sk] = (bySourceVerdict[sk] ?? 0) + 1;
    masterCovered += x.nMaster;
    masterByVerdict[x.verdict] = (masterByVerdict[x.verdict] ?? 0) + x.nMaster;
    for (const f of x.findings) {
      const k = `${f.axis}::${f.kind}`;
      axisFindingCount[k] = (axisFindingCount[k] ?? 0) + 1;
    }
    const prev = permitVerdict.get(x.itemSeq);
    if (!prev || SEVERITY.indexOf(x.verdict) > SEVERITY.indexOf(prev)) permitVerdict.set(x.itemSeq, x.verdict);
  }

  const permitByVerdict = {};
  for (const v of permitVerdict.values()) permitByVerdict[v] = (permitByVerdict[v] ?? 0) + 1;

  const translatable = ['KO_SOURCE_MATCH', 'KO_DISPLAY_ONLY_DIFFERENCE'];
  const summary = {
    ruleVersion: AUDIT_RULE_VERSION,
    units: results.length,
    permits: permitVerdict.size,
    mastersCovered: masterCovered,
    byVerdict,
    permitByVerdict,
    masterByVerdict,
    bySourceVerdict,
    axisFindingCount: Object.fromEntries(
      Object.entries(axisFindingCount).sort((a, b) => b[1] - a[1]),
    ),
    confirmedTranslationPopulation: {
      units: results.filter((x) => translatable.includes(x.verdict)).length,
      masters: results
        .filter((x) => translatable.includes(x.verdict))
        .reduce((a, x) => a + x.nMaster, 0),
      permits: [...permitVerdict.entries()].filter(([, v]) => translatable.includes(v)).length,
    },
    storageOnlyInOfficial: results.filter((x) => x.storageInOfficialOnly).length,
  };

  writeFileSync(`${outDir}/audit-findings.jsonl`, results.map((x) => JSON.stringify(x)).join('\n') + '\n', 'utf8');
  writeFileSync(`${outDir}/audit-summary.json`, JSON.stringify(summary, null, 2), 'utf8');
  writeFileSync(
    `${outDir}/verdict-index.jsonl`,
    results
      .map((x) =>
        JSON.stringify({
          itemSeq: x.itemSeq,
          contentMd5: x.contentMd5,
          descriptionId: x.descriptionId,
          nMaster: x.nMaster,
          sourceType: x.sourceType,
          verdict: x.verdict,
        }),
      )
      .join('\n') + '\n',
    'utf8',
  );

  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

main();
