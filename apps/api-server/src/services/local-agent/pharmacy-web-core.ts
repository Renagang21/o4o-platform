/**
 * Pharmacy Web Automation Core — Site · Alias · EntryPoint · Intent · Usage 계약 (순수)
 *
 * WO-O4O-PHARMACY-WEB-AUTOMATION-CORE-AND-HEALTHKR-ADAPTER-V0 §2·§4·§5·§6·§7·§8·§11·§12·§13·§14·§15·§41·§42·§47
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 정하는 것 — **누적형 구조의 공통 코어**(§4)
 *
 *   Site Registry     = 약국이 반복해서 쓰는 웹사이트. 등재 browser site(BROWSER_SITE_REGISTRY) 위에 별칭 ·
 *                       로그인 성격 · 접근 정책(robots Disallow) · Adapter 를 붙인 정의.
 *   EntryPoint        = 그 사이트 안에서 실제로 자주 쓰는 업무 하나(의약품 검색 · 낱알 식별 …).
 *   Intent Resolution = 사용자 문장 → 사이트 + EntryPoint. 모호하면 고르지 않는다(§13).
 *   Usage Event       = 업무 유형 중심 최소 집계(§14) — 검색어 · 약 이름 · 환자정보 원문은 키 자체가 없다(§15).
 *
 *   새 사이트는 원칙적으로 **이 파일의 배열에 항목을 더하고 Adapter 를 하나 붙이는 것**으로 끝나야 한다.
 *   코어 로직(별칭 해석 · intent 해석 · usage) 은 사이트를 모른다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ URL 을 만들어내는 칸이 없다 (§7·§46)
 *
 *   siteId 는 등재 browser site 여야 하고(`findPharmacyWebSiteViolations`), canonicalOrigin 은 그 site 의
 *   allowedOrigins 와 같아야 한다. EntryPoint 의 `entryPath` 는 **health check 의 기준**일 뿐 이동 명령이 아니다 —
 *   이동은 등재 origin 안의 링크 클릭(DOM click) 으로만 일어난다(§40·§41 navigationStrategy).
 *   등재되지 않은 사이트 이름은 별칭 해석에서 null 로 끝난다 — 공식 origin 확인 · 정책 조사 · 등재 전에는
 *   이름만으로 자동 실행하지 않는다(§7).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ AI 는 intent 를 판단하고 runtime 이 검증·실행한다 (§12)
 *
 *   이 파일의 intent 해석은 결정론(키워드) 이다. 여기서 나온 entryPointId 는 실행 직전 다시 등재부와 대조된다.
 *   AI · 사용자 · 페이지 어느 쪽도 selector · JS · URL 을 실어 보낼 수 없다.
 */

import { BROWSER_SITE_REGISTRY } from './browser-site-registry.js';
import type { AutomationRiskLevel } from '../ai-tools/automation-execution-contract.js';

// ─── Site Registry (§5·§6·§7·§43) ───────────────────────────────────────────

export interface PharmacyWebSiteDefinition {
  /** 등재 browser site 의 siteId 와 같다. */
  siteId: string;
  displayName: string;
  /** 사용자가 부르는 이름들(§6). 공백 무시 · 대소문자 무시로 비교한다. */
  aliases: readonly string[];
  /** `https://` origin. 등재 browser site 의 allowedOrigins[0] 과 같아야 한다. */
  canonicalOrigin: string;
  loginRequired: boolean | 'sometimes';
  adapterId?: string;
  enabled: boolean;
  /**
   * 접근 정책(§18). robots.txt 가 `User-agent: *` 에 Disallow 한 경로 접두사. Adapter 는 이 경로로
   * 이동·클릭하지 않으며, 여기 적힌 경로를 가리키는 링크는 실행 전에 거른다(§43 정책 준수 근거).
   */
  robotsDisallow: readonly string[];
}

/**
 * V0 등재 — **약학정보원 1곳**(§17). 2026-09-12 실측:
 *   - `https://www.health.kr` → `https://health.kr` 301. canonical = apex.
 *   - 검색 · 식별 · 상세 페이지는 로그인 없이 열린다(`loginRequired: false`). 회원 전용 영역은 V0 밖.
 *   - robots.txt(`*`): `/searchDrug/ajax/` · `/searchDrug/result_sunb.asp` · `/searchDrug/search_DUR.asp` Disallow.
 *     동일성분 페이지(result_sunb)가 여기 포함되므로 Adapter 는 **성분명 재검색**으로 우회하지 않고 대체한다(§24).
 *   - 이용약관에 자동화 금지 조항 없음(이메일 수집 프로그램 거부 · 회원 이용 외 목적 복제/제3자 제공 금지만).
 */
export const PHARMACY_WEB_SITE_REGISTRY: readonly PharmacyWebSiteDefinition[] = Object.freeze([
  Object.freeze({
    siteId: 'healthkr',
    displayName: '약학정보원',
    aliases: Object.freeze(['약학정보원', '약정원', 'health.kr', 'healthkr', '약학 정보원']),
    canonicalOrigin: 'https://health.kr',
    loginRequired: false,
    adapterId: 'healthkr',
    enabled: true,
    robotsDisallow: Object.freeze(['/searchDrug/ajax/', '/searchDrug/result_sunb.asp', '/searchDrug/search_DUR.asp']),
  }) as PharmacyWebSiteDefinition,
]);

export const PHARMACY_WEB_SITE_IDS: readonly string[] = Object.freeze(PHARMACY_WEB_SITE_REGISTRY.map((s) => s.siteId));

export function findPharmacyWebSite(siteId: string): PharmacyWebSiteDefinition | undefined {
  return PHARMACY_WEB_SITE_REGISTRY.find((s) => s.siteId === siteId);
}

export function isRegisteredPharmacyWebSite(siteId: unknown): boolean {
  return typeof siteId === 'string' && PHARMACY_WEB_SITE_IDS.includes(siteId);
}

/** 원문을 되돌리지 않는다 — 모델이 만든 문자열이 화면에 찍히는 경로를 만들지 않는다. */
export function pharmacyWebSiteDisplayName(siteId: string): string {
  return findPharmacyWebSite(siteId)?.displayName ?? '해당 사이트';
}

/** 비교용 정규화 — 공백 제거 + 소문자. */
export function compactAlias(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/**
 * 문장 안의 사이트 별칭 → siteId(§6). 둘 이상의 사이트가 걸리면 null — 어느 사이트인지 단정하지 않는다.
 * disabled 사이트는 걸리지 않는다. 등재되지 않은 이름은 null 이며 URL 을 묻지 않는다(§7 — 등재가 먼저다).
 */
export function resolvePharmacyWebSite(message: string): string | null {
  const compact = compactAlias(message);
  if (compact.length === 0) return null;
  const hits = PHARMACY_WEB_SITE_REGISTRY.filter(
    (s) => s.enabled && s.aliases.some((a) => compact.includes(compactAlias(a))),
  ).map((s) => s.siteId);
  const unique = [...new Set(hits)];
  return unique.length === 1 ? unique[0] : null;
}

/** 이 경로가 사이트 정책상 자동화 금지 경로인가(§18·§43). */
export function isRobotsDisallowedPath(siteId: string, path: string): boolean {
  const site = findPharmacyWebSite(siteId);
  if (!site) return false;
  const p = String(path ?? '');
  return site.robotsDisallow.some((prefix) => p.startsWith(prefix));
}

// ─── EntryPoint Registry (§8·§9·§10·§40·§41) ───────────────────────────────

/** 이동 방식(§41). hard-coded URL 로 이동하지 않는다 — 등재 origin 안의 링크를 클릭하거나, 지금 페이지를 쓴다. */
export type PharmacyWebNavigationStrategy =
  /** 어느 페이지에서나 있는 공통 요소(예: 헤더 검색창)를 쓴다 — 이동 없음. */
  | 'any_page'
  /** 헤더/메뉴의 링크(텍스트)를 클릭해 진입한다. entryPath 로 도착을 확인한다. */
  | 'header_link'
  /** 사용자가 이미 열어 둔 페이지를 읽는다. entryPath 가 아니면 사용자 행동을 요청한다. */
  | 'current_page';

export interface PharmacyWebEntryPoint {
  entryPointId: string;
  siteId: string;
  /** 사이트 무관 업무 종류. intent 해석의 결과값이다(§11). */
  intent: string;
  displayName: string;
  aliases?: readonly string[];
  /** 도착 확인용 pathname 접두사(§40·§42). 이동 명령이 아니다. */
  entryPath?: string;
  navigationStrategy: PharmacyWebNavigationStrategy;
  /** header_link 일 때 클릭할 링크 텍스트. */
  entryLinkText?: string;
  riskLevel: AutomationRiskLevel;
  enabled: boolean;
}

export const PHARMACY_WEB_INTENT = Object.freeze({
  DRUG_SEARCH: 'drug_search',
  SAME_INGREDIENT: 'same_ingredient',
  PILL_IDENTIFICATION: 'pill_identification',
  DRUG_DETAIL: 'drug_detail',
} as const);

export type PharmacyWebIntent = (typeof PHARMACY_WEB_INTENT)[keyof typeof PHARMACY_WEB_INTENT];

/**
 * 약학정보원 초기 EntryPoint 4개(§9). 2026-09-12 실측 경로:
 *   - 통합검색(제품명 또는 성분명)은 모든 페이지 헤더에 있다 → any_page. 결과 = `/searchDrug/search_total_result.asp` 표.
 *   - 식별검색 = `/searchIdentity/search.asp`, 헤더 "식별검색" 링크. 결과는 같은 페이지의 표.
 *   - 상세 = `/searchDrug/result_drug.asp?drug_cd=…`. 결과표의 제품명 셀이 `td onclick`(버튼/링크 아님)이라
 *     DOM V0 로는 열 수 없다 → 사용자가 클릭해 연 페이지를 읽는다(current_page).
 *   - 동일성분: 사이트의 동일성분 페이지는 robots Disallow → 성분명 재검색(any_page)으로 대체(§24).
 */
export const PHARMACY_WEB_ENTRYPOINT_REGISTRY: readonly PharmacyWebEntryPoint[] = Object.freeze([
  Object.freeze({
    entryPointId: 'healthkr.drug_search',
    siteId: 'healthkr',
    intent: PHARMACY_WEB_INTENT.DRUG_SEARCH,
    displayName: '의약품 검색',
    aliases: Object.freeze(['의약품검색', '약 검색', '제품 검색']),
    entryPath: '/searchDrug/search_total_result.asp',
    navigationStrategy: 'any_page',
    riskLevel: 'REVERSIBLE',
    enabled: true,
  }),
  Object.freeze({
    entryPointId: 'healthkr.same_ingredient',
    siteId: 'healthkr',
    intent: PHARMACY_WEB_INTENT.SAME_INGREDIENT,
    displayName: '동일성분 찾기',
    aliases: Object.freeze(['동일성분', '같은 성분', '동일 성분 의약품']),
    entryPath: '/searchDrug/search_total_result.asp',
    navigationStrategy: 'any_page',
    riskLevel: 'REVERSIBLE',
    enabled: true,
  }),
  Object.freeze({
    entryPointId: 'healthkr.pill_identification',
    siteId: 'healthkr',
    intent: PHARMACY_WEB_INTENT.PILL_IDENTIFICATION,
    displayName: '낱알 식별',
    aliases: Object.freeze(['낱알식별', '식별검색', '알약 식별']),
    entryPath: '/searchIdentity/search.asp',
    navigationStrategy: 'header_link',
    entryLinkText: '식별검색',
    riskLevel: 'REVERSIBLE',
    enabled: true,
  }),
  Object.freeze({
    entryPointId: 'healthkr.drug_detail',
    siteId: 'healthkr',
    intent: PHARMACY_WEB_INTENT.DRUG_DETAIL,
    displayName: '의약품 상세/설명서',
    aliases: Object.freeze(['의약품 상세', '설명서', '허가정보']),
    entryPath: '/searchDrug/result_drug.asp',
    navigationStrategy: 'current_page',
    riskLevel: 'READ',
    enabled: true,
  }),
]);

export const PHARMACY_WEB_ENTRYPOINT_IDS: readonly string[] = Object.freeze(
  PHARMACY_WEB_ENTRYPOINT_REGISTRY.map((e) => e.entryPointId),
);

export function findPharmacyWebEntryPoint(
  entryPointId: string,
  registry: readonly PharmacyWebEntryPoint[] = PHARMACY_WEB_ENTRYPOINT_REGISTRY,
): PharmacyWebEntryPoint | undefined {
  return registry.find((e) => e.entryPointId === entryPointId);
}

/** 실행 가능한 EntryPoint 인가 — 등재 · enabled · 사이트도 enabled. (registry 인자는 테스트용 — 등재부는 frozen 이다.) */
export function isEnabledPharmacyWebEntryPoint(
  entryPointId: unknown,
  registry: readonly PharmacyWebEntryPoint[] = PHARMACY_WEB_ENTRYPOINT_REGISTRY,
): boolean {
  if (typeof entryPointId !== 'string') return false;
  const ep = findPharmacyWebEntryPoint(entryPointId, registry);
  if (!ep || !ep.enabled) return false;
  const site = findPharmacyWebSite(ep.siteId);
  return !!site && site.enabled;
}

export function listPharmacyWebEntryPoints(siteId: string): PharmacyWebEntryPoint[] {
  return PHARMACY_WEB_ENTRYPOINT_REGISTRY.filter((e) => e.siteId === siteId);
}

/**
 * 등재부 정합성(§5·§8·§43). 테스트가 "위반 0" 을 단언한다.
 *   - 사이트는 등재 browser site 여야 하고 canonicalOrigin 이 그 allowedOrigins 와 같아야 한다.
 *   - EntryPoint 의 siteId 는 이 등재부에 있어야 하고, header_link 면 entryLinkText 가 있어야 한다.
 *   - entryPath 가 robots Disallow 경로면 위반 — 금지 경로를 업무 진입점으로 삼지 않는다.
 */
export function findPharmacyWebViolations(): { id: string; rule: string }[] {
  const out: { id: string; rule: string }[] = [];
  for (const s of PHARMACY_WEB_SITE_REGISTRY) {
    const b = BROWSER_SITE_REGISTRY.find((x) => x.siteId === s.siteId);
    if (!b) out.push({ id: s.siteId, rule: 'siteId 는 등재 browser site 여야 함(§43)' });
    else if (!b.allowedOrigins.includes(s.canonicalOrigin)) {
      out.push({ id: s.siteId, rule: 'canonicalOrigin 은 browser site allowedOrigins 와 같아야 함(§5)' });
    }
    if (!/^https:\/\/[^/\s]+$/.test(s.canonicalOrigin)) out.push({ id: s.siteId, rule: 'canonicalOrigin 은 https origin(경로 없음)' });
    if (s.aliases.length === 0) out.push({ id: s.siteId, rule: '별칭이 하나 이상 있어야 함(§6)' });
  }
  const seen = new Set<string>();
  for (const e of PHARMACY_WEB_ENTRYPOINT_REGISTRY) {
    if (seen.has(e.entryPointId)) out.push({ id: e.entryPointId, rule: 'entryPointId 중복' });
    seen.add(e.entryPointId);
    if (!e.entryPointId.startsWith(`${e.siteId}.`)) out.push({ id: e.entryPointId, rule: 'entryPointId 는 `<siteId>.<intent>` 형식' });
    if (!findPharmacyWebSite(e.siteId)) out.push({ id: e.entryPointId, rule: 'EntryPoint 의 siteId 는 등재 사이트여야 함(§8)' });
    if (e.navigationStrategy === 'header_link' && !e.entryLinkText) {
      out.push({ id: e.entryPointId, rule: 'header_link 는 entryLinkText 가 있어야 함(§41)' });
    }
    if (e.entryPath && isRobotsDisallowedPath(e.siteId, e.entryPath)) {
      out.push({ id: e.entryPointId, rule: 'entryPath 가 robots Disallow 경로(§18·§43)' });
    }
    if (!(Object.values(PHARMACY_WEB_INTENT) as string[]).includes(e.intent)) {
      out.push({ id: e.entryPointId, rule: 'intent 는 PHARMACY_WEB_INTENT 등재분' });
    }
  }
  return out;
}

// ─── Intent Resolution (§11·§12·§13) ────────────────────────────────────────

/**
 * intent 표식. 한글은 **문자열 리터럴**(정규식 리터럴에 한글을 넣으면 esbuild ascii charset 에서 깨진다).
 * 구체적인 업무(낱알 · 동일성분 · 설명서)가 일반 검색보다 우선하고, 서로 다른 구체 업무가 동시에 걸리면 모호하다(§13).
 */
const INTENT_KEYWORDS_KO: readonly { intent: PharmacyWebIntent; specific: boolean; ko: readonly string[] }[] = Object.freeze([
  { intent: PHARMACY_WEB_INTENT.PILL_IDENTIFICATION, specific: true, ko: Object.freeze(['낱알', '알약', '식별', '각인', '새겨']) },
  { intent: PHARMACY_WEB_INTENT.SAME_INGREDIENT, specific: true, ko: Object.freeze(['동일성분', '같은성분', '성분같은', '동일한성분']) },
  { intent: PHARMACY_WEB_INTENT.DRUG_DETAIL, specific: true, ko: Object.freeze(['설명서', '상세', '허가정보', '효능', '용법', '주의사항']) },
  { intent: PHARMACY_WEB_INTENT.DRUG_SEARCH, specific: false, ko: Object.freeze(['찾아', '검색', '조회', '뭐야', '알려']) },
]);
const INTENT_KEYWORDS_EN: readonly { intent: PharmacyWebIntent; re: RegExp }[] = Object.freeze([
  { intent: PHARMACY_WEB_INTENT.PILL_IDENTIFICATION, re: /\b(pill|imprint)\b/i },
  { intent: PHARMACY_WEB_INTENT.SAME_INGREDIENT, re: /\bsame\s+ingredient\b/i },
  { intent: PHARMACY_WEB_INTENT.DRUG_DETAIL, re: /\b(detail|leaflet|label)\b/i },
  { intent: PHARMACY_WEB_INTENT.DRUG_SEARCH, re: /\b(search|find|look\s*up)\b/i },
]);

export interface PharmacyWebIntentResolution {
  /** 하나로 정해졌을 때. */
  intent?: PharmacyWebIntent;
  /** 구체 업무 둘 이상이 동시에 걸렸다(§13). */
  ambiguous?: boolean;
  /** 걸린 구체 업무들(ambiguous 일 때 사용자에게 제시). */
  candidates?: PharmacyWebIntent[];
}

/** 문장 → intent(§11). 구체 업무 1개면 그것, 2개 이상이면 ambiguous, 없으면 일반 검색 표식이 있을 때만 drug_search. */
export function resolvePharmacyWebIntent(message: string): PharmacyWebIntentResolution {
  const compact = compactAlias(message);
  const raw = String(message ?? '');
  const hit = new Set<PharmacyWebIntent>();
  for (const k of INTENT_KEYWORDS_KO) if (k.ko.some((w) => compact.includes(compactAlias(w)))) hit.add(k.intent);
  for (const k of INTENT_KEYWORDS_EN) if (k.re.test(raw)) hit.add(k.intent);
  const specific = INTENT_KEYWORDS_KO.filter((k) => k.specific && hit.has(k.intent)).map((k) => k.intent);
  if (specific.length === 1) return { intent: specific[0] };
  if (specific.length > 1) return { ambiguous: true, candidates: specific };
  if (hit.has(PHARMACY_WEB_INTENT.DRUG_SEARCH)) return { intent: PHARMACY_WEB_INTENT.DRUG_SEARCH };
  return {};
}

/** intent + siteId → enabled EntryPoint. 없으면 undefined(§47 ENTRYPOINT_NOT_FOUND 의 입력). */
export function resolvePharmacyWebEntryPoint(
  siteId: string,
  intent: PharmacyWebIntent,
  registry: readonly PharmacyWebEntryPoint[] = PHARMACY_WEB_ENTRYPOINT_REGISTRY,
): PharmacyWebEntryPoint | undefined {
  return registry.find((e) => e.siteId === siteId && e.intent === intent && e.enabled);
}

// ─── 입력 구조화 (§21·§28·§29) ───────────────────────────────────────────────

export const PHARMACY_WEB_QUERY_MAX = 100;
// eslint-disable-next-line no-control-regex -- 제어문자 자체를 거르는 규칙이다
const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f-\u009f]/;

/** 검색어(제품명 · 성분명) 형상. 짧은 일반 문자열만 — `<>{}` · 제어문자 거절(selector/스크립트 조각 차단). */
export function isValidPharmacyWebQuery(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    v.trim().length > 0 &&
    v.length <= PHARMACY_WEB_QUERY_MAX &&
    !CONTROL_CHAR_RE.test(v) &&
    !/[<>{}]/.test(v)
  );
}

/** 낱알 식별 조건(§28). V0 에서 DOM 으로 적용할 수 있는 것은 식별문자(앞/뒤) · 제품명/성분명 · 회사명 뿐이다. */
export interface PillIdentificationInput {
  frontMark?: string;
  backMark?: string;
  color?: string;
  shape?: string;
  line?: string;
  dosageForm?: string;
}

export const PILL_COLORS_KO: readonly string[] = Object.freeze([
  '하양', '흰색', '노랑', '노란색', '주황', '주황색', '분홍', '분홍색', '빨강', '빨간색', '갈색', '연두', '초록', '녹색',
  '청록', '파랑', '파란색', '남색', '자주', '보라', '회색', '검정', '검은색', '투명',
]);
export const PILL_SHAPES_KO: readonly string[] = Object.freeze([
  '원형', '타원형', '장방형', '반원형', '삼각형', '사각형', '마름모형', '오각형', '육각형', '팔각형',
]);

const MARK_RE = /^\s*:?\s*"?([A-Za-z0-9][A-Za-z0-9.\-/ ]{0,19})/;
// 라벨은 문자열 리터럴로 둔다(한글 정규식 리터럴 금지). 긴 것이 먼저 — "앞면" 이 "앞" 보다 먼저 걸려야 한다.
const FRONT_LABELS: readonly string[] = Object.freeze(['앞면', '앞쪽', '앞', 'front']);
const BACK_LABELS: readonly string[] = Object.freeze(['뒷면', '뒤쪽', '뒤', 'back']);
const MARK_LABELS: readonly string[] = Object.freeze(['식별문자', '각인']);
const PARTICLES: readonly string[] = Object.freeze(['에는', '에', '은', '는', '이', ':']);

/** 라벨 뒤의 식별문자 하나. 라벨 → (조사) → 문자. 못 찾으면 undefined. */
function markAfter(raw: string, labels: readonly string[]): string | undefined {
  // 전각 콜론은 ASCII 콜론으로 맞춘다(정규식 리터럴에 비ASCII 를 두지 않는다).
  raw = raw.split(String.fromCharCode(0xff1a)).join(':');
  for (const label of labels) {
    const at = raw.indexOf(label);
    if (at < 0) continue;
    let rest = raw.slice(at + label.length);
    for (const particle of PARTICLES) {
      if (rest.startsWith(particle)) {
        rest = rest.slice(particle.length);
        break;
      }
    }
    const m = rest.match(MARK_RE);
    const mark = m ? m[1].trim().replace(/[",]+$/, '') : '';
    if (mark.length > 0) return mark;
  }
  return undefined;
}

/**
 * 자연어 → 낱알 조건(§29). "앞에 ABC, 뒤에 10" · "앞면 ABC" · "각인 ABC" 만 결정론으로 뽑는다.
 * 색상 · 모양은 어휘 표에 있는 단어를 그대로 적는다(사이트 매핑은 Adapter 몫). 못 찾은 칸은 비운다.
 */
export function parsePillConditions(message: string): PillIdentificationInput {
  const raw = String(message ?? '');
  const out: PillIdentificationInput = {};
  const front = markAfter(raw, FRONT_LABELS) ?? markAfter(raw, MARK_LABELS);
  const back = markAfter(raw, BACK_LABELS);
  if (front) out.frontMark = front;
  if (back) out.backMark = back;
  const compact = compactAlias(raw);
  const color = PILL_COLORS_KO.find((c) => compact.includes(c));
  if (color) out.color = color;
  const shape = PILL_SHAPES_KO.find((sh) => compact.includes(sh));
  if (shape) out.shape = shape;
  if (compact.includes('분할선')) out.line = compact.includes('분할선없') ? '없음' : '있음';
  if (compact.includes('캡슐')) out.dosageForm = '캡슐';
  else if (compact.includes('정제') || compact.includes('알약')) out.dosageForm = '정제';
  return out;
}

/** 낱알 입력 형상 검증 — 허용 키만, 각 값은 짧은 문자열, 식별문자 하나는 있어야 한다(V0 DOM 적용 가능 조건). */
export function validatePillIdentificationInput(input: unknown): { ok: boolean; input?: PillIdentificationInput } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false };
  const allowed = ['frontMark', 'backMark', 'color', 'shape', 'line', 'dosageForm'];
  const out: PillIdentificationInput = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!allowed.includes(k)) return { ok: false };
    if (v === undefined) continue;
    if (typeof v !== 'string' || v.trim().length === 0 || v.length > 40 || CONTROL_CHAR_RE.test(v) || /[<>{}]/.test(v)) {
      return { ok: false };
    }
    (out as Record<string, string>)[k] = v.trim();
  }
  if (!out.frontMark && !out.backMark) return { ok: false };
  return { ok: true, input: out };
}

// ─── tool 인자 형상 (§21·§28·§46) ──────────────────────────────────────────

/**
 * `{ entryPointId, input }` — entryPointId 는 enabled 등재분, input 은 그 EntryPoint 의 intent 가 정한 형상만.
 * siteId · url · selector · elementRef 칸은 없다(§46).
 */
export function validatePharmacyWebEntryArgs(
  args: unknown,
  registry: readonly PharmacyWebEntryPoint[] = PHARMACY_WEB_ENTRYPOINT_REGISTRY,
): { ok: boolean; entryPointId?: string; input?: Record<string, unknown> } {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return { ok: false };
  const a = args as Record<string, unknown>;
  if (Object.keys(a).sort().join(',') !== 'entryPointId,input') return { ok: false };
  if (!isEnabledPharmacyWebEntryPoint(a.entryPointId, registry)) return { ok: false };
  const ep = findPharmacyWebEntryPoint(String(a.entryPointId), registry) as PharmacyWebEntryPoint;
  const input = a.input;
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false };
  const i = input as Record<string, unknown>;
  switch (ep.intent) {
    case PHARMACY_WEB_INTENT.DRUG_SEARCH:
    case PHARMACY_WEB_INTENT.SAME_INGREDIENT:
      if (Object.keys(i).join(',') !== 'query' || !isValidPharmacyWebQuery(i.query)) return { ok: false };
      return { ok: true, entryPointId: ep.entryPointId, input: { query: String(i.query).trim() } };
    case PHARMACY_WEB_INTENT.PILL_IDENTIFICATION: {
      const v = validatePillIdentificationInput(i);
      return v.ok && v.input ? { ok: true, entryPointId: ep.entryPointId, input: v.input as Record<string, unknown> } : { ok: false };
    }
    case PHARMACY_WEB_INTENT.DRUG_DETAIL:
      return Object.keys(i).length === 0 ? { ok: true, entryPointId: ep.entryPointId, input: {} } : { ok: false };
    default:
      return { ok: false };
  }
}

// ─── Usage Event (§14·§15·§16) ──────────────────────────────────────────────

/**
 * 업무 유형 중심 최소 집계(§14). **여기 없는 키는 기록되지 않는다** — 검색어 · 약 이름 · 환자정보 · 페이지 텍스트 ·
 * HTML · credential 은 칸이 없다(§15). V0 는 기존 로그 인프라(logger → Cloud Logging)에 이 형상으로만 남긴다(§50).
 */
export interface PharmacyWebUsageEvent {
  siteId: string;
  entryPointId: string;
  intent: string;
  status: 'success' | 'failed';
  errorCode: string | null;
  durationMs: number;
  domCommands: number;
  timestamp: string;
}

export const PHARMACY_WEB_USAGE_KEYS: readonly string[] = Object.freeze([
  'siteId', 'entryPointId', 'intent', 'status', 'errorCode', 'durationMs', 'domCommands', 'timestamp',
]);

/** usage event 를 만든다. 입력 객체에 다른 키가 섞여 들어와도 **여기 정의된 키만** 남는다. */
export function buildPharmacyWebUsageEvent(input: {
  siteId: string;
  entryPointId: string;
  intent: string;
  status: 'success' | 'failed';
  errorCode?: string | null;
  durationMs: number;
  domCommands: number;
  now?: Date;
}): PharmacyWebUsageEvent {
  return {
    siteId: input.siteId,
    entryPointId: input.entryPointId,
    intent: input.intent,
    status: input.status,
    errorCode: input.errorCode ?? null,
    durationMs: Math.max(0, Math.round(input.durationMs)),
    domCommands: Math.max(0, Math.round(input.domCommands)),
    timestamp: (input.now ?? new Date()).toISOString(),
  };
}

// ─── 오류 코드 (§47) ────────────────────────────────────────────────────────

export const PHARMACY_WEB_ERROR = Object.freeze({
  SITE_NOT_REGISTERED: 'PHARMACY_WEB_SITE_NOT_REGISTERED',
  ENTRYPOINT_NOT_FOUND: 'PHARMACY_WEB_ENTRYPOINT_NOT_FOUND',
  INTENT_AMBIGUOUS: 'PHARMACY_WEB_INTENT_AMBIGUOUS',
  SITE_NOT_READY: 'PHARMACY_WEB_SITE_NOT_READY',
  ENTRYPOINT_OUTDATED: 'PHARMACY_WEB_ENTRYPOINT_OUTDATED',
  CROSS_ORIGIN: 'PHARMACY_WEB_CROSS_ORIGIN',
  USER_ACTION_REQUIRED: 'PHARMACY_WEB_USER_ACTION_REQUIRED',
  /** 입력이 비었거나 허용 형상 밖(§21·§28). */
  INPUT_INVALID: 'PHARMACY_WEB_INPUT_INVALID',
} as const);

export type PharmacyWebErrorCode = (typeof PHARMACY_WEB_ERROR)[keyof typeof PHARMACY_WEB_ERROR];

/**
 * DOM 축 오류 → 공통 오류(§47). 비밀번호 · 로그인 단계 차단은 사용자 행동 요청으로, 등재 밖 이동 차단은
 * cross-origin 으로, 탭 · 확장 · 준비 상태는 site not ready 로 모은다. 매핑이 없으면 undefined.
 */
export function pharmacyWebErrorFromDom(domErrorCode: string | undefined): PharmacyWebErrorCode | undefined {
  switch (domErrorCode) {
    case 'DOM_USER_ACTION_REQUIRED':
      return PHARMACY_WEB_ERROR.USER_ACTION_REQUIRED;
    case 'DOM_CROSS_ORIGIN_BLOCKED':
      return PHARMACY_WEB_ERROR.CROSS_ORIGIN;
    case 'DOM_SITE_NOT_ALLOWED':
    case 'DOM_TAB_NOT_FOUND':
    case 'DOM_CONTENT_UNAVAILABLE':
    case 'DOM_ELEMENT_STALE':
    case 'BROWSER_DOM_PERMISSION_REQUIRED':
    case 'O4O_EXTENSION_NOT_CONNECTED':
      return PHARMACY_WEB_ERROR.SITE_NOT_READY;
    default:
      return undefined;
  }
}
