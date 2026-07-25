/**
 * WO-O4O-OTC-REMAINING-READY-V2-SHARED-RUNNER-V1 — 가·나·다 **공용** V2 생산 러너
 *
 * 작성: 에이전트 다 (단독). 공용 자산 — Shared Module Change Protocol 적용.
 * 소비처: 가(shard ga) · 나(shard na) · 다(shard da). 세 세션이 **동일 파일**을 공유한다.
 * 변경 시 반드시 3 shard 전부에 대한 영향을 확인하고, 세션 전용 분기를 넣지 않는다.
 *
 * ── 이 러너가 존재하는 이유 ────────────────────────────────────────────────────────
 * V1 러너 `otc-oral-combo-store-leaflet-runner.ga.ts` 의 fingerprint 는 **제품명 유래** 축
 * (ingredientOf(name) · formOf(name) · routeSig(name)) 을 쓴다. V2 census 는 D1 정정으로
 * 제품명을 축 판정에서 완전 배제하고 **일반명코드 + 공식 경로** 를 쓴다. 두 산식은 구성요소
 * 수부터 다르므로(6축 vs 5축) V1 러너는 V2 fp 를 하나도 재현하지 못한다.
 * → V1 러너는 **수정하지 않고 보존**하고, V2 계약 전용 러너를 신규로 둔다.
 *
 * ── V2 fingerprint 계약 (census-v2.ts:306 과 byte-identical) ──────────────────────
 *   fp = H([ H(norm(indication)), H(norm(dosage)), H(norm(caution)), gencode, route ].join('|'))
 *   H = md5(s).slice(0,16) · norm/sections 는 census VERBATIM.
 *   금지: 제품명 끝 괄호 성분 추출 · ingredientOf(name) · formOf(name) · routeSig(name) ·
 *         제품명에서 함량/제형/경로 추정 · V1 산식 재사용.
 *
 * ── 일반명코드 연결 계약 (census VERBATIM) ────────────────────────────────────────
 *   product_identifiers.identifier_value 는 13자리 KOREA_DRUG_CODE 이므로 MFDS_CODE 직접
 *   조인은 0 건이다. 반드시 product_candidates.raw_payload->>'mfdsCode' 로 연결한다.
 *   gencode 9자리 = [1-4]성분 [5-6]함량 [7]경로 [8-9]제형. 접미 [7-9] 는 allowlist.
 *
 * ── 입력 차단 (하드 게이트) ───────────────────────────────────────────────────────
 *   · 적용부위 미확정 접미 CLQ/CDS/CSI (651 master) — SITE_AMBIGUOUS
 *   · 빅콘에스600정 3 master (HOLD_SOURCE, 용법 1축 부재)
 *   · allowlist 미등재 접미 · shard 밖 master · 기존 완료분
 *
 * ── 경로별 용법 표현 ──────────────────────────────────────────────────────────────
 *   경구 'take/복용' 을 비경구 경로에 쓰지 않는다. usageLabel 은 플랫폼 DR-019 계약
 *   ('복용 안내'(경구) | '사용 안내'(비경구)) 를 따르며 **제형명으로 추정하지 않는다**.
 *   공식 용법의 대상·횟수·용량·기간·연령 수치는 전량 보존한다(수치 보존 게이트).
 *
 * ⚠️ 현 단계: **dry-run 전용**. apply 경로 없음 · DB write 0.
 *
 * Usage(apps/api-server 에서):
 *   ../../node_modules/.bin/tsx src/scripts/otc-v2-store-leaflet-runner.shared.ts --selftest
 *   ../../node_modules/.bin/tsx src/scripts/otc-v2-store-leaflet-runner.shared.ts \
 *       --shard=da --dry-run [--limit=N] [--fp=<fp>] [--out=<path>]
 *
 * 접속: Cloud SQL Auth Proxy 127.0.0.1:5442. env: DB_HOST DB_PORT DB_USERNAME DB_PASSWORD DB_NAME.
 *   (자격증명 값은 열람·출력하지 않는다. process.env 로만 전달한다. 루트 .env 미사용.)
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';
import {
  buildDrugOtcEnConsumerHtml,
  type DrugOtcEnTranslation,
} from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

// ════════════════════════════════════════════════════════════════════════════════
// 1. V2 census 계약 VERBATIM — 이 블록은 census-v2.ts 와 1:1 이어야 한다.
// ════════════════════════════════════════════════════════════════════════════════
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

/** census-v2.ts:60-66 VERBATIM */
function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
/** census-v2.ts:68-78 VERBATIM */
function normalize(s: string): string {
  return stripTags(s)
    .normalize('NFKC')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',')
    .replace(/^\s*\d+\)\s*/gm, '')
    .replace(/[，、]/g, ',').replace(/[．。]/g, '.')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim();
}

/** census-v2.ts:82-111 VERBATIM — 일반명코드 [7-9] → (route, form) */
const SUFFIX_MAP: Record<string, { route: string; form: string }> = {
  ATB: { route: 'oral', form: '정' },
  ATE: { route: 'oral', form: '장용정' },
  ATR: { route: 'oral', form: '서방정' },
  ACH: { route: 'oral', form: '캡슐' },
  ACS: { route: 'oral', form: '연질캡슐' },
  ACE: { route: 'oral', form: '장용캡슐' },
  ASY: { route: 'oral', form: '시럽' },
  ASS: { route: 'oral', form: '현탁액' },
  ALQ: { route: 'oral', form: '내복액' },
  AGN: { route: 'oral', form: '과립' },
  APD: { route: 'oral', form: '산' },
  ATO: { route: 'oromucosal', form: '트로키' },
  AMS: { route: 'oromucosal', form: '껌' },
  ATD: { route: 'oromucosal', form: '구강용해필름' },
  COS: { route: 'ophthalmic', form: '점안액' },
  COO: { route: 'ophthalmic', form: '점안겔' },
  CCM: { route: 'topical', form: '크림' },
  COM: { route: 'topical', form: '연고' },
  CPA: { route: 'topical', form: '파스타' },
  CLT: { route: 'topical', form: '로션' },
  CPL: { route: 'topical', form: '플라스타' },
  CPO: { route: 'topical', form: '카타플라스마' },
  CPC: { route: 'topical', form: '패취' },
  CTB: { route: 'vaginal', form: '질정' },
};

/** census-v2.ts:119-123 VERBATIM — 적용부위 미확정. READY 금지 · 러너 입력 차단. */
const SITE_AMBIGUOUS: Record<string, string> = {
  CLQ: '외용액(직장/질/구강/피부 혼재)',
  CDS: '첩부·드레싱·소독(제형 의미 미확정)',
  CSI: '스프레이(구강/피부 혼재)',
};

const AUTHORED_SOURCES = ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'nutrition_combo'] as const;

/** 빅콘에스600정 — 공식 용법 1축 부재로 HOLD_SOURCE 확정(8bab22471). 입력 차단. */
const BLOCKED_MASTER_IDS = new Set<string>([
  '96b520aa-eb65-43cd-86bf-8bf4d442f9f0',
  'ae6ada5f-a9ae-4cba-80d2-86225a56e672',
  'bf9dba11-5d9f-4c4e-8e57-ca5c6054e170',
]);
const BLOCKED_FPS = new Set<string>(['44a15789a2cc1596']);

// ════════════════════════════════════════════════════════════════════════════════
// 2. V2 fingerprint 재현기 — census 와 동일 입력 → 동일 출력
// ════════════════════════════════════════════════════════════════════════════════
export interface OfficialAxes { ind: string; dos: string; cau: string }

/** e약은요 원문 content → 공식 3축. census-v2.ts:295-298 VERBATIM. */
export function officialAxes(content: string): OfficialAxes {
  const sec = sections(content);
  return {
    ind: sec['효능·효과'] || '',
    dos: sec['용법·용량'] || '',
    cau: [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n'),
  };
}

/**
 * V2 fingerprint. census-v2.ts:304-306 과 byte-identical.
 * 제품명은 어떤 형태로도 입력되지 않는다.
 */
export function fingerprintV2(ax: OfficialAxes, gencode: string, route: string): string {
  const normInd = H(normalize(ax.ind)), normDos = H(normalize(ax.dos)), normCau = H(normalize(ax.cau));
  return H([normInd, normDos, normCau, gencode, route].join('|'));
}

/** 결정론 source_ref 앵커 — V2 네임스페이스(V1 앵커와 충돌하지 않는다). */
export function fpToUuidV2(fp: string): string {
  const h = md5(`otc-v2-leaflet:${fp}`);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// ════════════════════════════════════════════════════════════════════════════════
// 3. 일반명코드 · 공식 경로 verifier
// ════════════════════════════════════════════════════════════════════════════════
export interface RouteResolution { ok: boolean; route: string; form: string; reason?: string }

/** gencode → 공식 route/form. 제품명 미개입. 미등재·미확정 접미는 차단. */
export function resolveRoute(gencode: string | null | undefined): RouteResolution {
  if (!gencode || gencode.length < 9) {
    return { ok: false, route: 'unknown', form: '', reason: 'general_name_code_malformed' };
  }
  const suffix = gencode.slice(6, 9).toUpperCase();
  if (SITE_AMBIGUOUS[suffix]) {
    return { ok: false, route: 'unknown', form: '', reason: `external_site_ambiguous(${suffix})` };
  }
  const mapped = SUFFIX_MAP[suffix];
  if (!mapped) return { ok: false, route: 'unknown', form: '', reason: `suffix_not_allowlisted(${suffix})` };
  return { ok: true, route: mapped.route, form: mapped.form };
}

// ════════════════════════════════════════════════════════════════════════════════
// 4. 경로별 표현 프로파일 — 경구 동사를 비경구에 쓰지 않는다
// ════════════════════════════════════════════════════════════════════════════════
export interface RouteProfile {
  /** 플랫폼 DR-019 계약: '복용 안내'(경구) | '사용 안내'(비경구) */
  koUsageLabel: string;
  enUsageLabel: string;
  /** 비경구에서 원문의 경구 동사를 경로 동사로 재표현(수치·대상·기간은 불변) */
  koVerbRewrite: Array<[RegExp, string]>;
  /** 렌더 결과에 남아 있으면 안 되는 경구 동사 */
  koForbidden: RegExp[];
  enForbidden: RegExp[];
}

const ORAL_VERB_RE = [/복용/g, /먹\s*(?:습니다|어요|는다)/g, /내복/g];
const EN_ORAL_VERB_RE = [/\btake\b/gi, /\btaken\b/gi, /\bswallow\b/gi, /\borally\b/gi, /\bby mouth\b/gi];

/** 비경구 공통 재표현 — 동사만 바꾸고 수치·연령·횟수·기간은 건드리지 않는다. */
const NONORAL_REWRITE: Array<[RegExp, string]> = [
  [/복용하기\s*전에/g, '사용하기 전에'],
  [/복용을\s*중지/g, '사용을 중지'],
  [/복용을\s*중단/g, '사용을 중단'],
  [/복용하지\s*마십시오/g, '사용하지 마십시오'],
  [/복용시키지/g, '사용하지'],
  [/복용시킨/g, '사용한'],
  [/복용하십시오/g, '사용하십시오'],
  [/복용한다/g, '사용한다'],
  [/복용할/g, '사용할'],
  [/복용하는/g, '사용하는'],
  [/복용하고/g, '사용하고'],
  [/복용하면/g, '사용하면'],
  [/복용해야/g, '사용해야'],
  [/복용후/g, '사용 후'],
  [/복용\s*중/g, '사용 중'],
  [/복용량/g, '사용량'],
  [/복용법/g, '사용법'],
  [/복용/g, '사용'],
  [/내복/g, '사용'],
];

export const ROUTE_PROFILE: Record<string, RouteProfile> = {
  oral: {
    koUsageLabel: '복용 안내',
    enUsageLabel: 'How to take it',
    koVerbRewrite: [],
    koForbidden: [],
    enForbidden: [],
  },
  oromucosal: {
    koUsageLabel: '사용 안내',
    enUsageLabel: 'How to use it in the mouth',
    koVerbRewrite: [[/삼키지/g, '삼키지'], ...NONORAL_REWRITE],
    koForbidden: ORAL_VERB_RE,
    enForbidden: [/\bswallow whole\b/gi],
  },
  topical: {
    koUsageLabel: '사용 안내',
    enUsageLabel: 'How to apply it',
    koVerbRewrite: NONORAL_REWRITE,
    koForbidden: ORAL_VERB_RE,
    enForbidden: EN_ORAL_VERB_RE,
  },
  ophthalmic: {
    koUsageLabel: '사용 안내',
    enUsageLabel: 'How to use the eye drops',
    koVerbRewrite: NONORAL_REWRITE,
    koForbidden: ORAL_VERB_RE,
    enForbidden: EN_ORAL_VERB_RE,
  },
  nasal: {
    koUsageLabel: '사용 안내',
    enUsageLabel: 'How to use it in the nose',
    koVerbRewrite: NONORAL_REWRITE,
    koForbidden: ORAL_VERB_RE,
    enForbidden: EN_ORAL_VERB_RE,
  },
  vaginal: {
    koUsageLabel: '사용 안내',
    enUsageLabel: 'How to insert it',
    koVerbRewrite: NONORAL_REWRITE,
    koForbidden: ORAL_VERB_RE,
    enForbidden: EN_ORAL_VERB_RE,
  },
  rectal: {
    koUsageLabel: '사용 안내',
    enUsageLabel: 'How to insert it',
    koVerbRewrite: NONORAL_REWRITE,
    koForbidden: ORAL_VERB_RE,
    enForbidden: EN_ORAL_VERB_RE,
  },
};

export const SUPPORTED_ROUTES = Object.keys(ROUTE_PROFILE);

// ════════════════════════════════════════════════════════════════════════════════
// 5. 수치 보존 게이트 — 대상·횟수·용량·기간·연령
// ════════════════════════════════════════════════════════════════════════════════
/** 원문에서 보존되어야 하는 수치 토큰(숫자 + 단위/조사 문맥). */
export function numericTokens(text: string): string[] {
  const t = normalize(text);
  const out = new Set<string>();
  const re = /\d+(?:[.,]\d+)?\s*(?:회|정|캡슐|포|매|방울|밀리그램|밀리리터|그램|시간|일|주|개월|년|세|개|mL|mg|g|%|IU|㎎|㎖)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) out.add(m[0].replace(/\s+/g, ''));
  return [...out].sort();
}

/** 원문 수치가 산출물에 전량 남아 있는지. 누락분을 돌려준다. (KO 전용 — 단위까지 동일 표기) */
export function missingNumerics(official: string, rendered: string): string[] {
  const r = normalize(rendered).replace(/\s+/g, '');
  return numericTokens(official).filter((tok) => !r.includes(tok));
}

/**
 * EN 수치 보존 — 한글 단위 토큰을 영문에 그대로 대조할 수 없으므로 **수량값**만 본다.
 * 영어는 '1일 2회' 를 'twice a day' 로 옮기는 것이 정상 번역이므로 숫자 단어형도 인정한다.
 * 인정하지 않으면 어색한 직역을 강제하게 되어 오히려 원문 충실도가 떨어진다.
 */
const EN_NUM_WORDS: Record<string, string[]> = {
  '1': ['one', 'once', 'a day', 'a time', 'daily', 'each day'],
  '2': ['two', 'twice'],
  '3': ['three'], '4': ['four'], '5': ['five'], '6': ['six'],
  '7': ['seven'], '8': ['eight'], '9': ['nine'], '10': ['ten'],
  '11': ['eleven'], '12': ['twelve'],
};
export function missingNumericsEn(official: string, en: string): string[] {
  const lower = ' ' + en.toLowerCase().replace(/\s+/g, ' ') + ' ';
  const vals = new Set<string>();
  const re = /(\d+(?:[.,]\d+)?)\s*(세|개월|주|일|회|정|캡슐|포|매|방울|밀리그램|밀리리터|그램|시간|년|mg|ml|g|%|iu)/gi;
  const t = normalize(official);
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) vals.add(m[1].replace(/,/g, ''));
  return [...vals].sort().filter((v) => {
    const esc = v.replace('.', '\\.');
    if (new RegExp(`(?:^|[^\\d])${esc}(?:[^\\d]|$)`).test(lower)) return false;
    return !(EN_NUM_WORDS[v] || []).some((w) => lower.includes(w));
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// 6. route별 KO composer — 공식 원문 grounding, 신규 의료 사실 0
// ════════════════════════════════════════════════════════════════════════════════
export interface KoComposeResult {
  source: {
    summaryTable: Record<string, string>;
    efficacy: string; usage: string; usageLabel: string; caution: string;
  };
  anomalies: string[];
}

/** 원문 HTML 조각 → 소비자 평문. 태그 제거 + 개행 보존. */
function toPlain(htmlish: string): string {
  return htmlish
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map((l) => l.trim()).join('\n')
    .trim();
}

/**
 * 공식 3축 + 공식 경로 → KO 구조화 소스.
 * 효능·용법·주의 정보층을 보존하고, 경로 동사만 재표현한다. 수치는 불변.
 */
export function composeKo(
  ax: OfficialAxes,
  route: string,
  form: string,
  gencode: string,
): KoComposeResult {
  const prof = ROUTE_PROFILE[route];
  const anomalies: string[] = [];
  if (!prof) {
    return { source: { summaryTable: {}, efficacy: '', usage: '', usageLabel: '', caution: '' },
      anomalies: [`미지원 route(${route})`] };
  }

  const efficacy = toPlain(ax.ind);
  let usage = toPlain(ax.dos);
  let caution = toPlain(ax.cau);
  for (const [re, to] of prof.koVerbRewrite) { usage = usage.replace(re, to); caution = caution.replace(re, to); }

  // 수치 보존 검증 — 재표현 후에도 원문 수치가 전량 남아야 한다.
  const lostU = missingNumerics(ax.dos, usage);
  if (lostU.length) anomalies.push(`용법 수치 누락 ${lostU.length}: ${lostU.slice(0, 5).join(',')}`);
  const lostE = missingNumerics(ax.ind, efficacy);
  if (lostE.length) anomalies.push(`효능 수치 누락 ${lostE.length}: ${lostE.slice(0, 5).join(',')}`);

  // 경로 동사 게이트 — 비경구에 경구 동사가 남으면 중지
  for (const re of prof.koForbidden) {
    re.lastIndex = 0;
    if (re.test(usage)) anomalies.push(`비경구(${route}) 용법에 경구 동사 잔존: ${re.source}`);
  }

  const summaryTable: Record<string, string> = {
    분류: `일반의약품 · ${form}`,
    작용: efficacy.split('\n')[0]?.slice(0, 120) || '',
    '선택 포인트': `동일 일반명코드(${gencode}) 제품은 성분·함량·제형이 같습니다. 제품명이 아니라 성분과 함량으로 확인하세요.`,
    '주의 대상': caution ? '아래 주의사항 대상에 해당하면 매장 약사에게 먼저 문의하세요.' : '',
  };
  for (const k of Object.keys(summaryTable)) if (!summaryTable[k]) delete summaryTable[k];

  if (!efficacy) anomalies.push('효능 공란');
  if (!usage) anomalies.push('용법 공란');

  return { source: { summaryTable, efficacy, usage, usageLabel: prof.koUsageLabel, caution }, anomalies };
}

// ════════════════════════════════════════════════════════════════════════════════
// 7. route별 EN renderer — 저작된 EN 페이로드 검증 + 경로 라벨 주입
// ════════════════════════════════════════════════════════════════════════════════
export interface EnRenderResult { html: string; anomalies: string[] }

const HANGUL_RE = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;

/**
 * 저작 EN 페이로드 → EN HTML.
 * usageLabel 은 **경로에서 주입**한다(저작자 자유입력 금지 — 경구 라벨 오용 차단).
 */
export function renderEn(
  t: Omit<DrugOtcEnTranslation, 'usageLabel'>,
  route: string,
  officialDosage: string,
): EnRenderResult {
  const prof = ROUTE_PROFILE[route];
  const anomalies: string[] = [];
  if (!prof) return { html: '', anomalies: [`미지원 route(${route})`] };

  const payload: DrugOtcEnTranslation = { ...t, usageLabel: prof.enUsageLabel };
  const built = buildDrugOtcEnConsumerHtml(payload);
  if (built.missing.length) anomalies.push(`EN 필수필드 누락 ${built.missing.join(',')}`);
  if (built.html && HANGUL_RE.test(built.html)) anomalies.push('EN 한글 잔존');

  for (const re of prof.enForbidden) {
    re.lastIndex = 0;
    if (re.test(payload.usage)) anomalies.push(`비경구(${route}) EN 용법에 경구 동사: ${re.source}`);
  }
  const lost = missingNumericsEn(officialDosage, payload.usage);
  if (lost.length) anomalies.push(`EN 용법 수량 누락 ${lost.length}: ${lost.slice(0, 5).join(',')}`);

  return { html: built.html, anomalies };
}

// ════════════════════════════════════════════════════════════════════════════════
// 8. V2 SSOT 로더
// ════════════════════════════════════════════════════════════════════════════════
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const SSOT_V2 = path.join(DATA_DIR, 'otc-remaining-shard-assignment-ssot-v2.json');
const CENSUS_V2 = path.join(DATA_DIR, 'otc-remaining-full-corpus-census-v2.json');

export interface V2Group { fp: string; gencode: string; route: string; form: string; size: number; masterIds: string[] }
export interface V2Shard { shard: string; fingerprints: number; masters: number; routes: Record<string, number>; groups: V2Group[] }

export function loadShard(shard: string): V2Shard {
  const ssot = JSON.parse(fs.readFileSync(SSOT_V2, 'utf8'));
  const census = JSON.parse(fs.readFileSync(CENSUS_V2, 'utf8'));
  if (ssot.supersedes?.file && !/v1/.test(String(ssot.supersedes.file))) {
    throw new Error('SSOT supersedes 계약 불일치 — V2 SSOT 아님');
  }
  const s = ssot.shards?.[shard];
  if (!s) throw new Error(`shard '${shard}' 없음 (가능: ${Object.keys(ssot.shards || {}).join(',')})`);
  const fpSet = new Set<string>(s.fingerprintList);
  const groups: V2Group[] = (census.readyGroups as V2Group[])
    .filter((g) => fpSet.has(g.fp))
    .map((g) => ({ ...g, masterIds: [...g.masterIds].sort() }))
    .sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : a.fp > b.fp ? 1 : 0));

  if (groups.length !== s.fingerprints) {
    throw new Error(`SSOT fp ${s.fingerprints} != census readyGroups ${groups.length}`);
  }
  const masterSum = groups.reduce((t, g) => t + g.size, 0);
  if (masterSum !== s.masters) throw new Error(`SSOT master ${s.masters} != groups ${masterSum}`);

  return { shard, fingerprints: s.fingerprints, masters: s.masters, routes: s.routes, groups };
}

// ════════════════════════════════════════════════════════════════════════════════
// 9. 입력 차단 게이트
// ════════════════════════════════════════════════════════════════════════════════
export function admissionCheck(g: V2Group): string[] {
  const bad: string[] = [];
  if (BLOCKED_FPS.has(g.fp)) bad.push(`차단 fp(${g.fp})`);
  const blocked = g.masterIds.filter((id) => BLOCKED_MASTER_IDS.has(id));
  if (blocked.length) bad.push(`차단 master ${blocked.length}건(빅콘에스600정)`);
  const rr = resolveRoute(g.gencode);
  if (!rr.ok) bad.push(`route 차단: ${rr.reason}`);
  else if (rr.route !== g.route) bad.push(`route 상충: gencode→${rr.route} vs SSOT ${g.route}`);
  else if (rr.form !== g.form) bad.push(`form 상충: gencode→${rr.form} vs SSOT ${g.form}`);
  if (!ROUTE_PROFILE[g.route]) bad.push(`미지원 route(${g.route})`);
  return bad;
}

// ════════════════════════════════════════════════════════════════════════════════
// 10. 오프라인 selftest — DB 미접속
// ════════════════════════════════════════════════════════════════════════════════
const FIXTURE = (ind: string, dos: string, cau: string): string =>
  `<p><strong>효능·효과</strong><br/>${ind}</p>` +
  `<p><strong>용법·용량</strong><br/>${dos}</p>` +
  `<p><strong>사용상 주의사항</strong><br/>${cau}</p>`;

function selfTest(): void {
  const fail: string[] = [];
  const eq = (label: string, a: unknown, b: unknown): void => {
    if (JSON.stringify(a) !== JSON.stringify(b)) fail.push(`${label}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
  };

  // (1) fp 산식이 census 정의와 동일 구성인지 — 5축 · 제품명 미개입
  const ax = officialAxes(FIXTURE('감기 증상 완화', '만 15세 이상 1회 1정, 1일 3회 복용합니다.', '임부는 복용 전 문의'));
  eq('축 추출 ind', ax.ind, '감기 증상 완화');
  eq('축 추출 dos', ax.dos, '만 15세 이상 1회 1정, 1일 3회 복용합니다.');
  const expect = H([H(normalize(ax.ind)), H(normalize(ax.dos)), H(normalize(ax.cau)), 'D05200ATB', 'oral'].join('|'));
  eq('fp 재현', fingerprintV2(ax, 'D05200ATB', 'oral'), expect);
  eq('fp 결정성(2회)', fingerprintV2(ax, 'D05200ATB', 'oral'), fingerprintV2(ax, 'D05200ATB', 'oral'));
  // 제품명이 달라도 fp 는 불변이어야 한다(제품명 미개입 증명)
  eq('제품명 무관', fingerprintV2(ax, 'D05200ATB', 'oral'), fingerprintV2(officialAxes(FIXTURE('감기 증상 완화', '만 15세 이상 1회 1정, 1일 3회 복용합니다.', '임부는 복용 전 문의')), 'D05200ATB', 'oral'));
  // gencode/route 가 다르면 fp 도 달라야 한다
  if (fingerprintV2(ax, 'D05200ATB', 'oral') === fingerprintV2(ax, 'D05200ACH', 'oral')) fail.push('gencode 축 미반영');
  if (fingerprintV2(ax, 'D05200ATB', 'oral') === fingerprintV2(ax, 'D05200ATB', 'topical')) fail.push('route 축 미반영');

  // (2) route resolver
  eq('ATB→oral/정', resolveRoute('D05200ATB'), { ok: true, route: 'oral', form: '정' });
  eq('COS→ophthalmic', resolveRoute('D05200COS').route, 'ophthalmic');
  eq('ATO→oromucosal', resolveRoute('D05200ATO').route, 'oromucosal');
  eq('CTB→vaginal', resolveRoute('D05200CTB').route, 'vaginal');
  eq('CLQ 차단', resolveRoute('D05200CLQ').ok, false);
  eq('CDS 차단', resolveRoute('D05200CDS').ok, false);
  eq('CSI 차단', resolveRoute('D05200CSI').ok, false);
  eq('CSP 미등재 차단', resolveRoute('D05200CSP').ok, false);

  // (3) 경로별 KO composer — 비경구에서 경구 동사 소거 + 수치 보존
  const topAx = officialAxes(FIXTURE(
    '무좀에 의한 가려움',
    '만 12세 이상 1일 2회 환부에 적당량을 복용합니다. 4주간 계속 복용하십시오.',
    '눈에 들어가지 않도록 하고, 복용 전 손을 씻으십시오.'));
  const top = composeKo(topAx, 'topical', '크림', 'D05200CCM');
  eq('topical usageLabel', top.source.usageLabel, '사용 안내');
  if (/복용/.test(top.source.usage)) fail.push('topical 용법에 복용 잔존');
  if (/복용/.test(top.source.caution)) fail.push('topical 주의에 복용 잔존');
  for (const tok of ['12세', '2회', '4주']) {
    if (!top.source.usage.replace(/\s+/g, '').includes(tok)) fail.push(`topical 수치 누락 ${tok}`);
  }
  eq('topical 이상 0', top.anomalies, []);

  const oral = composeKo(ax, 'oral', '정', 'D05200ATB');
  eq('oral usageLabel', oral.source.usageLabel, '복용 안내');
  if (!/복용/.test(oral.source.usage)) fail.push('oral 용법에서 복용이 사라짐');
  eq('oral 이상 0', oral.anomalies, []);

  const eye = composeKo(officialAxes(FIXTURE('눈의 피로', '1회 1~2방울, 1일 3회 점안합니다.', '3일간 복용해도 나아지지 않으면 상담')), 'ophthalmic', '점안액', 'D05200COS');
  eq('ophthalmic usageLabel', eye.source.usageLabel, '사용 안내');
  if (/복용/.test(eye.source.caution)) fail.push('ophthalmic 주의에 복용 잔존');
  if (!eye.source.usage.includes('방울')) fail.push('ophthalmic 방울 소실');

  const mouth = composeKo(officialAxes(FIXTURE('인후 통증', '1회 1정을 입안에서 서서히 녹여 복용합니다. 1일 4회까지.', '5일 이상 복용하지 마십시오.')), 'oromucosal', '트로키', 'D05200ATO');
  eq('oromucosal usageLabel', mouth.source.usageLabel, '사용 안내');
  if (/복용/.test(mouth.source.usage)) fail.push('oromucosal 용법에 복용 잔존');

  // (4) KO 빌더 계약
  const built = buildDrugOtcConsumerHtml(oral.source as never, { title: '테스트 정' });
  eq('KO 필수필드 누락 0', built.missing, []);
  if (!built.html || built.html.includes('<table') || built.html.includes('<!--')) fail.push('KO html 계약 위반');

  // (5) EN renderer — 경로 라벨 주입 + 한글/경구동사/수치 게이트
  const enOk = renderEn({
    groupKey: 'g1', title: 'Test Cream',
    efficacy: 'For itching caused by athlete\'s foot.',
    usage: 'Apply an appropriate amount to the affected area twice a day for those aged 12 years and over. Continue for 4 weeks.',
    caution: 'Avoid contact with the eyes. Wash hands before use.',
    summaryTable: { Category: 'OTC · Cream' },
  }, 'topical', '만 12세 이상 1일 2회 환부에 적당량을 바릅니다. 4주간 계속 사용하십시오.');
  eq('EN topical 이상 0', enOk.anomalies, []);
  if (HANGUL_RE.test(enOk.html)) fail.push('EN 한글 잔존');

  const enBad = renderEn({
    groupKey: 'g2', title: 'Test Cream',
    efficacy: 'For itching.',
    usage: 'Take twice a day for those aged 12 years and over for 4 weeks.',
    caution: 'Avoid the eyes.',
    summaryTable: { Category: 'OTC · Cream' },
  }, 'topical', '만 12세 이상 1일 2회 4주간');
  if (!enBad.anomalies.some((a) => /경구 동사/.test(a))) fail.push('EN 경구동사 게이트 미작동');

  // (6) 입력 차단
  const blockedG: V2Group = { fp: '44a15789a2cc1596', gencode: 'D05200ATB', route: 'oral', form: '정', size: 3, masterIds: [...BLOCKED_MASTER_IDS] };
  if (admissionCheck(blockedG).length < 2) fail.push('빅콘/차단fp 게이트 미작동');
  const clqG: V2Group = { fp: 'aaaa', gencode: 'D05200CLQ', route: 'topical', form: '액', size: 1, masterIds: ['x'] };
  if (!admissionCheck(clqG).some((b) => /CLQ/.test(b))) fail.push('CLQ 게이트 미작동');

  // (7) 앵커 결정성 · V1 네임스페이스와 분리
  eq('앵커 결정성', fpToUuidV2('abc'), fpToUuidV2('abc'));
  if (fpToUuidV2('abc') === `${md5('otc-combo-leaflet:abc').slice(0, 8)}-${md5('otc-combo-leaflet:abc').slice(8, 12)}-${md5('otc-combo-leaflet:abc').slice(12, 16)}-${md5('otc-combo-leaflet:abc').slice(16, 20)}-${md5('otc-combo-leaflet:abc').slice(20, 32)}`) {
    fail.push('V1 앵커와 충돌');
  }

  if (fail.length) { console.error(`SELFTEST FAIL ${fail.length}건`); for (const f of fail) console.error('  - ' + f); process.exit(1); }
  console.log(`SELFTEST PASS — fp 재현(제품명 미개입)·route resolver·경로별 KO/EN·수치 보존·차단 게이트·앵커 분리. 지원 route: ${SUPPORTED_ROUTES.join(', ')}. DB 미접속.`);
}

// ════════════════════════════════════════════════════════════════════════════════
// 11. DB read-only dry-run
// ════════════════════════════════════════════════════════════════════════════════
const retRows = <T>(res: unknown): T[] => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res as unknown[])) as T[];
const arg = (k: string): string => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');

async function dryRun(): Promise<void> {
  const shard = arg('shard');
  if (!shard) { console.error('--shard=ga|na|da 필요'); process.exit(2); }
  const limit = arg('limit') ? parseInt(arg('limit'), 10) : 0;
  const onlyFp = arg('fp');
  const outPath = arg('out') || path.join(DATA_DIR, `otc-v2-dryrun-manifest.${shard}.json`);

  const sh = loadShard(shard);
  let groups = sh.groups;
  if (onlyFp) groups = groups.filter((g) => g.fp === onlyFp);
  if (limit > 0) groups = groups.slice(0, limit);

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'],
    extra: { statement_timeout: 900000 },
  });
  await ds.initialize();

  const allIds = [...new Set(groups.flatMap((g) => g.masterIds))].sort();

  // gencode — census 조인 계약 VERBATIM (raw_payload->>'mfdsCode', MFDS_CODE 직접 조인 금지)
  const stdRows = retRows<{ mid: string; gencodes: string[] | null }>(await ds.query(`
    SELECT pi.product_master_id::text mid,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes
    FROM product_identifiers pi
    JOIN product_drug_extensions e
      ON e.product_master_id = pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
    JOIN product_candidates pc
      ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
     AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
      AND pi.product_master_id = ANY($1::uuid[])
    GROUP BY 1 ORDER BY 1`, [allIds]));
  const gencodeByMid = new Map<string, string | null>();
  for (const r of stdRows) {
    const gs = (r.gencodes || []).filter(Boolean).sort();
    gencodeByMid.set(r.mid, gs.length === 1 ? gs[0] : null);
  }

  // e약은요 원문 — census LATERAL VERBATIM
  const contentRows = retRows<{ id: string; content: string }>(await ds.query(`
    SELECT pop.id, es.content FROM (SELECT unnest($1::uuid[])::text id) pop
    JOIN LATERAL (
      SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY length(s.content) DESC LIMIT 1) es ON true`, [allIds]));
  const contentByMid = new Map(contentRows.map((r) => [r.id, r.content]));

  // 슬롯 상태 — easy ko canonical 정확히 1 · authored 충돌 · 기존 canonical · EN canonical
  const slotRows = retRows<{ mid: string; easy1: string; authored: string; encanon: string }>(await ds.query(`
    SELECT m.mid::text mid,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.source_type='mfds_easy_drug'
        AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)::text easy1,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND COALESCE(s.language,'ko')='ko' AND s.status IN ('canonical','needs_review')
        AND s.source_type = ANY($2) AND s.deleted_at IS NULL)::text authored,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND COALESCE(s.language,'ko')='en' AND s.status='canonical' AND s.deleted_at IS NULL)::text encanon
    FROM unnest($1::uuid[]) m(mid) ORDER BY 1`, [allIds, AUTHORED_SOURCES as unknown as string[]]));
  const slotByMid = new Map(slotRows.map((r) => [r.mid, r]));

  // ── 그룹별 검증 ────────────────────────────────────────────────────────────────
  const results: Array<Record<string, unknown>> = [];
  const anomaliesAll: string[] = [];
  let fpReproduced = 0, fpFailed = 0, koPlan = 0, enPlan = 0, admitted = 0;
  const routeTally: Record<string, { fp: number; master: number }> = {};

  for (const g of groups) {
    const anomalies: string[] = [...admissionCheck(g)];
    const per = { fp: g.fp, gencode: g.gencode, route: g.route, form: g.form, size: g.size,
      sourceRef: fpToUuidV2(g.fp), fpOk: 0, fpBad: 0, easyCanonical1: 0, authoredConflict: 0,
      enCanonical: 0, koWritePlan: 0, enWritePlan: 0, anomalies };

    for (const mid of g.masterIds) {
      const gc = gencodeByMid.get(mid) ?? null;
      const content = contentByMid.get(mid);
      if (!gc) { anomalies.push(`gencode 연결 실패 ${mid}`); per.fpBad++; continue; }
      if (gc !== g.gencode) { anomalies.push(`gencode 상충 ${mid}: ${gc} vs ${g.gencode}`); per.fpBad++; continue; }
      const rr = resolveRoute(gc);
      if (!rr.ok || rr.route !== g.route || rr.form !== g.form) { anomalies.push(`route/form 상충 ${mid}`); per.fpBad++; continue; }
      if (!content) { anomalies.push(`원문 부재 ${mid}`); per.fpBad++; continue; }
      const ax = officialAxes(content);
      if (!ax.ind || !ax.dos) { anomalies.push(`공식 축 부족 ${mid}`); per.fpBad++; continue; }
      const fp = fingerprintV2(ax, gc, rr.route);
      if (fp !== g.fp) { anomalies.push(`fp 불일치 ${mid}: ${fp} != ${g.fp}`); per.fpBad++; continue; }
      per.fpOk++;
      const slot = slotByMid.get(mid);
      if (slot) {
        if (parseInt(slot.easy1, 10) === 1) per.easyCanonical1++;
        per.authoredConflict += parseInt(slot.authored, 10);
        per.enCanonical += parseInt(slot.encanon, 10);
      }
    }

    // 대표 원문으로 KO 합성 (그룹 내 원문 동일 — fp 가 이를 보장)
    const repId = g.masterIds.find((id) => contentByMid.has(id));
    if (repId) {
      const ax = officialAxes(contentByMid.get(repId)!);
      const ko = composeKo(ax, g.route, g.form, g.gencode);
      anomalies.push(...ko.anomalies);
      const built = buildDrugOtcConsumerHtml(ko.source as never, { title: `${g.form} (${g.gencode})` });
      if (built.missing.length) anomalies.push(`KO 필수필드 누락 ${built.missing.join(',')}`);
      if (built.html.includes('<table') || built.html.includes('<!--')) anomalies.push('KO html 계약 위반');
      (per as Record<string, unknown>).koHtmlMd5 = md5(built.html);
      (per as Record<string, unknown>).koHtmlLen = built.html.length;
    } else anomalies.push('대표 원문 없음');

    if (per.authoredConflict > 0) anomalies.push(`기존 authored 슬롯 충돌 ${per.authoredConflict}`);
    if (per.easyCanonical1 !== g.size) anomalies.push(`easy ko canonical 정확히1 아님 ${per.easyCanonical1}/${g.size}`);

    // write plan — KO 4T(insert+demote+flip+audit) · EN 2T(insert+flip)
    per.koWritePlan = per.fpOk * 4;
    per.enWritePlan = per.fpOk * 2;
    if (anomalies.length === 0) {
      admitted++; koPlan += per.koWritePlan; enPlan += per.enWritePlan;
      routeTally[g.route] = routeTally[g.route] || { fp: 0, master: 0 };
      routeTally[g.route].fp++; routeTally[g.route].master += g.size;
    }
    fpReproduced += per.fpOk; fpFailed += per.fpBad;
    if (anomalies.length) anomaliesAll.push(`[${g.fp}] ${anomalies.join(' | ')}`);
    results.push(per);
  }

  // canonicalDup — 동일 master 에 ko/en canonical 이 2건 이상인지
  const dupRows = retRows<{ n: string }>(await ds.query(`
    SELECT count(*)::text n FROM (
      SELECT master_id, COALESCE(language,'ko') lang, count(*) c
      FROM shared_product_descriptions
      WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
      GROUP BY 1,2 HAVING count(*) > 1) d`, [allIds]));
  const canonicalDup = parseInt(dupRows[0]?.n || '0', 10);

  // 기존 완료분(ko authored canonical AND en canonical) 교집합
  const completeRows = retRows<{ n: string }>(await ds.query(`
    SELECT count(*)::text n FROM (
      SELECT s.master_id FROM shared_product_descriptions s
      WHERE s.master_id = ANY($1::uuid[]) AND s.description_type='STORE' AND s.status='canonical'
        AND COALESCE(s.language,'ko')='ko' AND s.source_type = ANY($2) AND s.deleted_at IS NULL
      INTERSECT
      SELECT s.master_id FROM shared_product_descriptions s
      WHERE s.master_id = ANY($1::uuid[]) AND s.description_type='STORE' AND s.status='canonical'
        AND COALESCE(s.language,'ko')='en' AND s.deleted_at IS NULL) x`,
    [allIds, AUTHORED_SOURCES as unknown as string[]]));
  const completeIntersection = parseInt(completeRows[0]?.n || '0', 10);

  await ds.destroy();

  const manifest = {
    wo: 'WO-O4O-OTC-REMAINING-READY-V2-SHARED-RUNNER-V1',
    runner: 'otc-v2-store-leaflet-runner.shared.ts',
    ssot: 'otc-remaining-shard-assignment-ssot-v2.json',
    census: 'otc-remaining-full-corpus-census-v2.json',
    baseCommit: '81b39da72',
    shard, mode: 'dry-run', dbWrite: 0, apply: false,
    supportedRoutes: SUPPORTED_ROUTES,
    ssotDeclared: { fingerprints: sh.fingerprints, masters: sh.masters, routes: sh.routes },
    processed: { fingerprints: groups.length, masters: groups.reduce((t, g) => t + g.size, 0) },
    gates: {
      fpReproduced, fpFailed,
      fpReproductionRate: fpReproduced + fpFailed > 0 ? fpReproduced / (fpReproduced + fpFailed) : 0,
      admittedGroups: admitted,
      groupsWithAnomalies: results.filter((r) => (r.anomalies as string[]).length > 0).length,
      canonicalDup, completeIntersection,
      blockedFpInInput: groups.filter((g) => BLOCKED_FPS.has(g.fp)).length,
      blockedMasterInInput: allIds.filter((id) => BLOCKED_MASTER_IDS.has(id)).length,
      siteAmbiguousInInput: groups.filter((g) => SITE_AMBIGUOUS[g.gencode.slice(6, 9)]).length,
      outOfShardMasters: 0,
    },
    writePlan: { ko_4T: koPlan, en_2T: enPlan, total: koPlan + enPlan },
    routeTally,
    groups: results,
    anomalies: anomaliesAll,
  };
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 1) + '\n', 'utf8');

  console.log(`DRY-RUN ${shard} — fp ${groups.length}/${sh.fingerprints} · master ${manifest.processed.masters}/${sh.masters}`);
  console.log(`  fp 재현 ${fpReproduced} / 실패 ${fpFailed} · 이상 그룹 ${manifest.gates.groupsWithAnomalies}`);
  console.log(`  canonicalDup ${canonicalDup} · 완료분 교집합 ${completeIntersection} · 차단 혼입 fp ${manifest.gates.blockedFpInInput} / master ${manifest.gates.blockedMasterInInput} / CLQ·CDS·CSI ${manifest.gates.siteAmbiguousInInput}`);
  console.log(`  writePlan KO ${koPlan} + EN ${enPlan} = ${koPlan + enPlan} · dbWrite 0`);
  console.log(`  manifest → ${outPath}`);
  if (anomaliesAll.length) { console.log(`  ⚠ 이상 ${anomaliesAll.length}건 (manifest.anomalies 참조)`); }
}

/**
 * 경로별 샘플 실물 확인 — 공식 축 보존·경로 동사·수치 보존을 사람이 대조할 수 있게 출력한다.
 * read-only. `--shard=<s> --emit-sample --per-route=<n>`
 */
async function emitSample(): Promise<void> {
  const shard = arg('shard');
  if (!shard) { console.error('--shard=ga|na|da 필요'); process.exit(2); }
  const perRoute = arg('per-route') ? parseInt(arg('per-route'), 10) : 2;
  const outPath = arg('out') || path.join(DATA_DIR, `otc-v2-samples.${shard}.json`);
  const sh = loadShard(shard);

  const picked: V2Group[] = [];
  const seen: Record<string, number> = {};
  for (const g of sh.groups) {
    seen[g.route] = seen[g.route] || 0;
    if (seen[g.route] < perRoute) { picked.push(g); seen[g.route]++; }
  }

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 },
  });
  await ds.initialize();
  const ids = picked.map((g) => g.masterIds[0]);
  const rows = retRows<{ id: string; content: string }>(await ds.query(`
    SELECT pop.id, es.content FROM (SELECT unnest($1::uuid[])::text id) pop
    JOIN LATERAL (SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY length(s.content) DESC LIMIT 1) es ON true`, [ids]));
  await ds.destroy();
  const byId = new Map(rows.map((r) => [r.id, r.content]));

  const out = picked.map((g) => {
    const content = byId.get(g.masterIds[0]) || '';
    const ax = officialAxes(content);
    const ko = composeKo(ax, g.route, g.form, g.gencode);
    const prof = ROUTE_PROFILE[g.route];
    return {
      fp: g.fp, gencode: g.gencode, route: g.route, form: g.form, size: g.size,
      fpReproduced: fingerprintV2(ax, g.gencode, g.route) === g.fp,
      official: { indication: ax.ind, dosage: ax.dos, caution: ax.cau.slice(0, 1200) },
      composedKo: ko.source,
      routeCheck: {
        usageLabel: ko.source.usageLabel,
        expectedLabel: prof?.koUsageLabel,
        oralVerbInNonOralUsage: g.route !== 'oral' && /복용|내복/.test(ko.source.usage),
        officialNumerics: numericTokens(ax.dos),
        missingInComposed: missingNumerics(ax.dos, ko.source.usage),
      },
      anomalies: ko.anomalies,
    };
  });
  fs.writeFileSync(outPath, JSON.stringify({ shard, perRoute, samples: out }, null, 1) + '\n', 'utf8');
  console.log(`SAMPLES ${shard} — ${out.length}건 (route별 ${perRoute})`);
  for (const s of out) {
    console.log(`  ${s.route.padEnd(11)} ${s.fp} ${s.gencode} ${String(s.size).padStart(3)}m · fp재현 ${s.fpReproduced} · label "${s.routeCheck.usageLabel}" · 경구동사혼입 ${s.routeCheck.oralVerbInNonOralUsage} · 수치누락 ${s.routeCheck.missingInComposed.length} · 이상 ${s.anomalies.length}`);
  }
  console.log(`  → ${outPath}`);
}

async function main(): Promise<void> {
  if (process.argv.includes('--selftest')) { selfTest(); return; }
  if (process.argv.includes('--emit-sample')) { await emitSample(); return; }
  if (process.argv.includes('--dry-run')) { await dryRun(); return; }
  console.error('--selftest 또는 --shard=<ga|na|da> --dry-run 필요. apply 경로는 본 러너에 없다(dry-run 전용).');
  process.exit(2);
}

if (process.argv[1] && /otc-v2-store-leaflet-runner\.shared\./.test(process.argv[1])) {
  main().catch((e) => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); });
}
