/**
 * WO-O4O-OTC-EASY-DRUG-V4-NASAL14-RECTAL12-ROUTE-PROFILE-FINAL-READINESS-V1
 *   — nasal · rectal 전용 route profile (에이전트 가). DB 접근 0 · 부수효과 0.
 *
 * ── 왜 새 프로파일이 필요한가 ────────────────────────────────────────────────────
 * 공용 ROUTE_PROFILE 의 nasal/rectal 항목은 "비경구 공통"(복용→사용 재표현 + 경구 동사 금지)일 뿐,
 * 경로 고유 표현을 요구하지도 경로 역전을 막지도 않는다. 게다가
 *   - V4 composer 의 ROUTE_FORM_KO/EN 에 nasal/rectal 이 없어 '일반의약품'/'Medicine' 으로 뭉개지고,
 *   - 공용 rectal 의 EN usageLabel 이 vaginal 과 같은 'How to insert it' 이라 좌약/관장 구분이 사라진다
 *     (WO §7 금지 "좌약과 관장을 동일 표현으로 단순화").
 *
 * ── 설계 원칙 ────────────────────────────────────────────────────────────────────
 * 공식 원문에 없는 것은 만들지 않는다. 따라서 §6·§7 의 "필수 요소" 는 **생성 요구가 아니라 보존 요구**로
 * 구현한다: 공식 원문에 있으면 산출물에도 반드시 남아야 한다. 없으면 결손으로 기록하되 창작하지 않는다.
 * "금지 표현" 은 **도입 금지**로 구현한다: 산출물에 있는데 공식 원문에는 없는 경로 표현 = 역전.
 *
 * 공용 composer 파일(otc-v2/v3/v4-*)은 수정하지 않는다. `profiles` 주입 seam 만 쓴다.
 */
import {
  NONORAL_REWRITE, ORAL_VERB_RE, EN_ORAL_VERB_RE, type RouteProfile,
} from './otc-v2-store-leaflet-runner.shared.js';
import { toPlain } from './otc-v3-content-leaflet-composer.na.js';

// ════════════════════════════════════════════════════════════════════════════════
// 1. 경로 마커 — 경로 역전 판정의 단위
// ════════════════════════════════════════════════════════════════════════════════
/**
 * 경로 가족(family). 각 가족은 "그 경로로 투여한다"는 신호를 잡는다.
 * suppository/enema 를 rectal 안에서 다시 나누는 이유는 §7 이 둘의 동일화를 금지하기 때문이다.
 */
export type RouteFamily =
  | 'oral' | 'nasal' | 'inhalation' | 'ophthalmic' | 'dermal'
  | 'vaginal' | 'rectal' | 'suppository' | 'enema' | 'oromucosal';

export interface FamilyMarker { ko: RegExp; en: RegExp; label: string }

export const FAMILY: Record<RouteFamily, FamilyMarker> = {
  oral: {
    label: '경구 복용',
    ko: /복용|삼키|삼켜|먹이|먹는|먹은|먹고|섭취|마시|경구|내복/,
    en: /\b(take|takes|taken|taking|swallow|swallowed|swallowing|orally|oral administration|by mouth|ingest|ingested)\b/i,
  },
  nasal: {
    label: '비강 내 사용',
    ko: /비강|콧구멍|코\s*(안|속|에|를|의)|비점막|점비|코에/,
    en: /\b(nose|nasal|nostril|nostrils|intranasal|intranasally)\b/i,
  },
  inhalation: {
    label: '흡입',
    ko: /흡입|들이마시|들이쉬/,
    en: /\b(inhale|inhaled|inhaling|inhalation|breathe in)\b/i,
  },
  ophthalmic: {
    label: '점안',
    ko: /점안|결막|안구\s*에|눈\s*에\s*(넣|점적|투여|한|하고)/,
    en: /\b(eye|eyes|conjunctival|ophthalmic|instil into the eye)\b/i,
  },
  dermal: {
    label: '피부 도포',
    ko: /바르|발라|도포|문질러|환부|피부\s*에|붙이|부착/,
    en: /\b(apply to the skin|rub|smear|affected area|patch|topically)\b/i,
  },
  vaginal: {
    label: '질 내 삽입',
    ko: /질\s*(내|강|안|점막)|질에\s*(삽입|넣)/,
    en: /\b(vagina|vaginal|vaginally)\b/i,
  },
  rectal: {
    label: '직장 내 사용',
    ko: /직장\s*(내|안|에|으로)|항문\s*(내|안|에|으로|을|부위)|항문에/,
    en: /\b(rectum|rectal|rectally|anus|anally)\b/i,
  },
  suppository: {
    label: '좌약 삽입',
    ko: /좌제|좌약/,
    en: /\b(suppository|suppositories)\b/i,
  },
  enema: {
    label: '관장',
    ko: /관장|주입기|노즐을\s*항문/,
    en: /\b(enema|enemas|rectal irrigation)\b/i,
  },
  oromucosal: {
    label: '구강 내 사용',
    ko: /설하|혀\s*밑|가글|트로키|로젠지|머금|구강\s*(점막|청결)|입\s*안/,
    en: /\b(sublingual|gargle|lozenge|troche|buccal|in the mouth)\b/i,
  },
};

/**
 * 면제 근거용 KO 존재 패턴 — 투여 표현(FAMILY.ko)보다 **넓다**.
 *
 * 역전 판정은 "산출물에 있는데 원문에 근거가 없는가" 이므로, 근거 판정은 관대해야 한다.
 * 예: 주의사항 "눈에 들어가지 않도록 하십시오" → EN 에 eye 가 나오는 것은 원문 충실 번역이다.
 * FAMILY.ophthalmic.ko(점안 표현)로는 이를 근거로 인정하지 못해 오탐이 난다.
 */
export const EVIDENCE_KO: Record<RouteFamily, RegExp> = {
  oral: /복용|삼키|삼켜|먹|섭취|마시|경구|내복|입안|입 안/,
  nasal: /코|콧|비강|비점막|점비|비내/,
  inhalation: /흡입|들이마시|들이쉬|호흡/,
  ophthalmic: /눈|안구|결막|점안|시야|시력|시각/,
  dermal: /피부|바르|발라|도포|환부|문질|붙이|부착|국소|점막/,
  vaginal: /질내|질 내|질에|질강|질좌|질염|외음/,
  rectal: /직장|항문|치핵|치질|배변/,
  suppository: /좌제|좌약/,
  enema: /관장|주입기/,
  oromucosal: /구강|혀|설하|가글|양치|머금|입안|입 안|치아|잇몸/,
};

/** route → 그 route 에서 정상인(=역전이 아닌) 가족. */
export const OWN_FAMILIES: Record<string, RouteFamily[]> = {
  nasal: ['nasal'],
  rectal: ['rectal', 'suppository', 'enema'],
};

/** route → 도입되면 경로 역전인 가족. §6·§7 금지 목록의 코드화. */
export const INVERSION_FAMILIES: Record<string, RouteFamily[]> = {
  // §6 nasal 금지: 경구 / 점안 / 피부 도포 / 질내·직장 삽입 / 원문에 없는 흡입법 / 일반 흡입제 변환
  nasal: ['oral', 'ophthalmic', 'dermal', 'vaginal', 'rectal', 'suppository', 'enema', 'inhalation', 'oromucosal'],
  // §7 rectal 금지: 경구 / 질내 삽입 / 피부 도포 / 점안·비강
  rectal: ['oral', 'vaginal', 'dermal', 'ophthalmic', 'nasal', 'inhalation', 'oromucosal'],
};

// ════════════════════════════════════════════════════════════════════════════════
// 2. 공식 조건 요소 — 원문에 있으면 반드시 보존
// ════════════════════════════════════════════════════════════════════════════════
export interface ElementSpec {
  key: string;
  label: string;
  /** WO §6/§7 필수 요소 번호(추적용). */
  woItem: number;
  ko: RegExp;
  en: RegExp;
  /** true = 수치 계약(missingNumerics/missingNumericsEn)이 이미 보존을 강제하는 항목. */
  numericBacked?: boolean;
}

/** §6 nasal 필수 10요소. */
export const NASAL_ELEMENTS: ElementSpec[] = [
  { key: 'site', label: '비강 내 사용', woItem: 1, ko: FAMILY.nasal.ko, en: FAMILY.nasal.en },
  { key: 'delivery', label: '분무 또는 점적', woItem: 2, ko: /분무|스프레이|뿌리|뿌려|점적|점비|주입/, en: /\b(spray|sprays|sprayed|puff|puffs|instil|instill|instilled|drop|drops)\b/i },
  { key: 'nostril', label: '콧구멍 또는 비강 부위', woItem: 3, ko: /콧구멍|한쪽\s*코|양쪽\s*코|각\s*비강|비강\s*내|코\s*(안|속)/, en: /\b(nostril|nostrils|each side of the nose|inside the nose|nasal cavity)\b/i },
  // EN 은 `2 sprays` 뿐 아니라 `spray 2 times into each nostril` 형태로도 1회 분무 수를 보존한다
  // (KO 원문이 `1~2회씩 뿌립니다` 이므로 후자가 오히려 직역이다). 단 `N times a day` 는
  // 1일 횟수(perDay)이므로 negative lookahead 로 배제해 검출력을 잃지 않는다.
  { key: 'perDose', label: '1회 분무 수', woItem: 4, numericBacked: true, ko: /1\s*회[^\n]{0,24}\d|\d+\s*(?:회|번|방울|스프레이|분무|puff)/, en: /\b\d+\s*(spray|sprays|puff|puffs|drop|drops)\b|\b(one|two|three)\s+(spray|sprays|puff|puffs|drop|drops)\b|\b(spray|sprays|spraying|instil|instill|instilling)\s+once\b|\b(spray|sprays|sprayed|spraying|puff|puffs|puffing|instil|instill|instilled)\b[^.]{0,60}?\b\d+(?:\s*(?:to|~|-)\s*\d+)?\s*times?\b(?!\s*(a|per)\s+day)/i },
  { key: 'perDay', label: '1일 사용 횟수', woItem: 5, numericBacked: true, ko: /1\s*일\s*\d+\s*회|하루\s*\d+\s*회|매일\s*\d+/, en: /\b\d+\s*times?\s+(a|per)\s+day\b|\b(once|twice|three times|four times)\s+(a|per)\s+day\b|\bdaily\b/i },
  { key: 'interval', label: '사용 간격', woItem: 6, numericBacked: true, ko: /간격|시간\s*마다|시간\s*이상|간\s*\d+\s*시간|\d+\s*시간\s*(후|이후|이상|간격)/, en: /\bevery\s+\d+(?:\s*(?:to|~|-)\s*\d+)?\s*hours?\b|\bat least\s+\d+\s*hours?\b|\binterval\b/i },
  { key: 'duration', label: '사용 기간', woItem: 7, numericBacked: true, ko: /\d+\s*(일|주|주일|개월)\s*(이상|이내|동안|까지|넘게)|장기간|연용/, en: /\bfor (up to )?\d+\s*(days?|weeks?|months?)\b|\blong[- ]term\b|\bprolonged\b/i },
  { key: 'age', label: '연령 제한', woItem: 8, numericBacked: true, ko: /\d+\s*(세|개월)\s*(미만|이상|이하|초과)|소아|영아|유아|어린이|성인/, en: /\b(under|over|aged|from)\s+\d+\s*(years?|months?)\b|\b(children|infants?|adults?|paediatric|pediatric)\b/i },
  { key: 'preUse', label: '사용 전 흔들기 등 공식 조건', woItem: 9, ko: /흔들|코를\s*풀|세척한\s*후|사용\s*전에|처음\s*사용|공기를\s*빼/, en: /\b(shake|blow (your |the )?nose|before (first )?use|prime|priming)\b/i },
  { key: 'tipHygiene', label: '용기 끝 접촉 관련 공식 주의', woItem: 10, ko: /용기\s*(끝|입구|선단)|노즐|분무구|끝부분|닿지\s*않도록|닦아|다른\s*사람과\s*함께/, en: /\b(tip|nozzle|applicator)\b|\bdo not (let|allow)[^.]{0,30}touch\b|\bshare\b/i },
];

/** §7 rectal 필수 9요소. */
export const RECTAL_ELEMENTS: ElementSpec[] = [
  { key: 'site', label: '직장 내 사용', woItem: 1, ko: /직장|항문|대장\s*내/, en: /\b(rectum|rectal|rectally|anus|anal)\b/i },
  { key: 'delivery', label: '좌약 삽입 또는 관장', woItem: 2, ko: /좌제|좌약|삽입|넣으|주입|관장/, en: /\b(suppository|suppositories|insert|inserted|inserting|enema|instil|instill)\b/i },
  { key: 'perDose', label: '1회 사용량', woItem: 3, numericBacked: true, ko: /1\s*회[^\n]{0,24}\d|\d+\s*(?:개|정|매|g|그램|mL|밀리리터)/, en: /\b\d+\s*(suppository|suppositories|piece|pieces|mL|g)\b|\b(one|two)\s+(suppository|suppositories)\b/i },
  { key: 'perDay', label: '1일 사용 횟수', woItem: 4, numericBacked: true, ko: /1\s*일\s*\d+\s*회|하루\s*\d+\s*회|매일\s*\d+/, en: /\b\d+\s*times?\s+(a|per)\s+day\b|\b(once|twice|three times)\s+(a|per)\s+day\b|\bdaily\b/i },
  { key: 'interval', label: '사용 간격', woItem: 5, numericBacked: true, ko: /간격|시간\s*마다|시간\s*이상|\d+\s*시간\s*(후|이후|이상|간격)/, en: /\bevery\s+\d+(?:\s*(?:to|~|-)\s*\d+)?\s*hours?\b|\bat least\s+\d+\s*hours?\b|\binterval\b/i },
  { key: 'duration', label: '사용 기간', woItem: 6, numericBacked: true, ko: /\d+\s*(일|주|주일|개월)\s*(이상|이내|동안|까지|넘게)|장기간|연용/, en: /\bfor (up to )?\d+\s*(days?|weeks?|months?)\b|\blong[- ]term\b|\bprolonged\b/i },
  { key: 'age', label: '연령 제한', woItem: 7, numericBacked: true, ko: /\d+\s*(세|개월)\s*(미만|이상|이하|초과)|소아|영아|유아|어린이|성인/, en: /\b(under|over|aged|from)\s+\d+\s*(years?|months?)\b|\b(children|infants?|adults?)\b/i },
  { key: 'timing', label: '배변 전후 등 공식 조건', woItem: 8, ko: /배변|배설|대변|화장실|취침\s*전|아침|저녁/, en: /\b(bowel movement|defaecation|defecation|stool|toilet|bedtime|morning|evening)\b/i },
  { key: 'posture', label: '삽입 깊이·자세 등 공식 조건', woItem: 9, ko: /깊숙이|깊이|눕|옆으로|무릎|자세|끝이\s*뾰족|손가락/, en: /\b(deep|deeply|lie down|lying|side|knee|position|pointed end|finger)\b/i },
];

export const ELEMENTS: Record<string, ElementSpec[]> = { nasal: NASAL_ELEMENTS, rectal: RECTAL_ELEMENTS };

// ════════════════════════════════════════════════════════════════════════════════
// 3. RouteProfile — composeKoV3 / renderEnV3 주입용
// ════════════════════════════════════════════════════════════════════════════════
/**
 * koUsageLabel 은 DR-019 계약(비경구='사용 안내')을 그대로 지킨다.
 * enUsageLabel 만 경로 고유로 분리한다 — 공용 rectal 의 'How to insert it' 은 vaginal 과 동일해
 * 좌약/관장 구분이 사라지므로 §7 금지에 걸린다.
 */
export const NR_ROUTE_PROFILE: Record<string, RouteProfile> = {
  nasal: {
    koUsageLabel: '사용 안내',
    enUsageLabel: 'How to use it in the nose',
    koVerbRewrite: NONORAL_REWRITE,
    koForbidden: ORAL_VERB_RE,
    enForbidden: EN_ORAL_VERB_RE,
  },
  rectal: {
    koUsageLabel: '사용 안내',
    enUsageLabel: 'How to use it in the rectum',
    koVerbRewrite: NONORAL_REWRITE,
    koForbidden: ORAL_VERB_RE,
    enForbidden: EN_ORAL_VERB_RE,
  },
};

/** route → KO 요약표 '분류' 라벨. V4 composer 의 ROUTE_FORM_KO 결손(→'일반의약품') 보완. */
export const NR_FORM_KO: Record<string, string> = { nasal: '비강용제', rectal: '직장용제' };
/** route → EN 제형 라벨. V4 composer 의 ROUTE_FORM_EN 결손(→'Medicine') 보완. */
export const NR_FORM_EN: Record<string, string> = { nasal: 'Nasal medicine', rectal: 'Rectal medicine' };

export function nrFormKo(route: string, dosageForm: string | null): string {
  const f = (dosageForm || '').trim();
  return f && !/^[0-9]+$/.test(f) && !['개', '통', '병', '포', '매', '없음'].includes(f)
    ? f
    : NR_FORM_KO[route] || '일반의약품';
}
export function nrFormEn(route: string): string {
  return NR_FORM_EN[route] || 'Medicine';
}

// ════════════════════════════════════════════════════════════════════════════════
// 4. 경로 게이트 — 보존 요구 + 도입 금지
// ════════════════════════════════════════════════════════════════════════════════
export interface ElementCheck {
  key: string; label: string; woItem: number; numericBacked: boolean;
  inOfficial: boolean; inRendered: boolean;
  /** 공식에 있는데 산출물에 없음 = 보존 실패. */
  violation: boolean;
}
export interface InversionHit {
  family: RouteFamily; label: string; section: string;
  /** 산출물에는 있고 공식 원문에는 없다 = 도입. */
  introduced: true;
  evidence: string;
}
export interface RouteGateResult {
  route: string;
  lang: 'ko' | 'en';
  elements: ElementCheck[];
  elementViolations: string[];
  inversions: InversionHit[];
  /** 공식 원문 어디에도 자기 경로 마커가 없음 — 창작 금지 대상이므로 별도 신호. */
  ownMarkerAbsentInOfficial: boolean;
  ownMarkerInRendered: boolean;
  /** 공식 용법 섹션에 자기 경로 마커가 있는데 산출물 용법 섹션에서 사라졌는가. */
  ownMarkerLostInUsage: boolean;
  anomalies: string[];
}

/** 게이트 입력 — 용법 섹션과 문서 전체를 분리해 받는다. */
export interface GateText { usage: string; all: string }

/** 매칭 근거 문자열(리포트용). 원문 그대로 40자만 남긴다. */
function evidenceOf(re: RegExp, text: string): string {
  const m = text.match(new RegExp(re.source, re.flags.replace('g', '')));
  return m ? m[0].slice(0, 40) : '';
}

/**
 * 경로 게이트.
 *
 * 대조 단위는 **문서 전체**다. 공식 원문은 경로 표현을 용법 섹션에만 두지 않는다
 * (예: 나자린플러스는 용법이 "…뿌립니다" 뿐이고 비강 표현은 효능·주의 섹션에 있다).
 * 용법 섹션만 보면 멀쩡한 제품을 경로 미상으로 오판한다.
 * EN 도 대조 기준은 KO 공식 원문이다 — 원문이 유일한 근거이기 때문이다.
 *
 * @param route    nasal | rectal
 * @param lang     ko | en — 산출물 쪽 마커 정규식 선택
 * @param official 공식 원문 {usage: 용법·용량, all: 6섹션 전체}
 * @param rendered 산출물 {usage: 용법 섹션, all: 문서 전체}
 */
export function routeGate(
  route: string,
  lang: 'ko' | 'en',
  official: GateText,
  rendered: GateText,
): RouteGateResult {
  const specs = ELEMENTS[route] || [];
  const own = OWN_FAMILIES[route] || [];
  const inv = INVERSION_FAMILIES[route] || [];
  const anomalies: string[] = [];

  const off = toPlain(official.all || '');
  const offUsage = toPlain(official.usage || '');
  const ren = rendered.all || '';
  const renUsage = rendered.usage || '';

  // ── 요소 보존 ────────────────────────────────────────────────────────────────
  const elements: ElementCheck[] = specs.map((s) => {
    const inOfficial = s.ko.test(off);
    const inRendered = (lang === 'ko' ? s.ko : s.en).test(ren);
    return {
      key: s.key, label: s.label, woItem: s.woItem, numericBacked: !!s.numericBacked,
      inOfficial, inRendered, violation: inOfficial && !inRendered,
    };
  });
  const elementViolations = elements.filter((e) => e.violation).map((e) => `${e.key}(${e.label})`);
  if (elementViolations.length) {
    anomalies.push(`${route} 공식 요소 보존 실패 ${elementViolations.length}: ${elementViolations.join(',')}`);
  }

  // ── 경로 역전(도입) ──────────────────────────────────────────────────────────
  const inversions: InversionHit[] = [];
  for (const fam of inv) {
    const mk = FAMILY[fam];
    const re = lang === 'ko' ? mk.ko : mk.en;
    if (!re.test(ren)) continue;
    // 공식 원문(KO)에 근거가 있으면 원문 충실 번역이지 도입이 아니다.
    if (mk.ko.test(off) || EVIDENCE_KO[fam].test(off)) continue;
    inversions.push({
      family: fam, label: mk.label,
      section: (lang === 'ko' ? mk.ko : mk.en).test(renUsage) ? 'usage' : 'document',
      introduced: true, evidence: evidenceOf(re, ren),
    });
  }
  if (inversions.length) {
    anomalies.push(`${route} 경로 표현 역전(원문 근거 없는 도입) ${inversions.length}: ${inversions.map((h) => h.family).join(',')}`);
  }

  // ── 자기 경로 마커 ────────────────────────────────────────────────────────────
  const ownRe = (f: RouteFamily): RegExp => (lang === 'ko' ? FAMILY[f].ko : FAMILY[f].en);
  const ownMarkerAbsentInOfficial = !own.some((f) => FAMILY[f].ko.test(off));
  const ownMarkerInRendered = own.some((f) => ownRe(f).test(ren));
  // 용법 섹션 한정 — 공식 용법에 있었는데 산출물 용법에서 사라졌다면 그 자체로 소실이다.
  const ownMarkerLostInUsage = own.some((f) => FAMILY[f].ko.test(offUsage)) && !own.some((f) => ownRe(f).test(renUsage));
  if (!ownMarkerAbsentInOfficial && !ownMarkerInRendered) {
    anomalies.push(`${route} 자기 경로 마커 소실 — 공식 원문에 있으나 산출물에 없음`);
  }
  if (ownMarkerLostInUsage) {
    anomalies.push(`${route} 용법 섹션 자기 경로 마커 소실`);
  }
  if (ownMarkerAbsentInOfficial) {
    // 창작하지 않는다. 선정 단계에서 걸러야 할 신호이므로 anomaly 로 올린다.
    anomalies.push(`${route} 공식 원문 전체에 자기 경로 마커 부재 — 창작 금지, 대상 적격성 재검토`);
  }

  // ── 좌약/관장 동일화 금지(§7) ─────────────────────────────────────────────────
  if (route === 'rectal') {
    const offSup = FAMILY.suppository.ko.test(off);
    const offEne = FAMILY.enema.ko.test(off);
    const renSup = ownRe('suppository').test(ren);
    const renEne = ownRe('enema').test(ren);
    if (offSup && !offEne && renEne) anomalies.push('rectal 좌약을 관장 표현으로 치환');
    if (offEne && !offSup && renSup) anomalies.push('rectal 관장을 좌약 표현으로 치환');
  }

  return {
    route, lang, elements, elementViolations, inversions,
    ownMarkerAbsentInOfficial, ownMarkerInRendered, ownMarkerLostInUsage, anomalies,
  };
}
