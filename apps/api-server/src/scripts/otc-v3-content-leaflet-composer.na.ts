/**
 * WO-O4O-OTC-EASY-DRUG-READY-TOPICAL-OROMUCOSAL-CONTENT-FP-V3-FINAL-READINESS-V1 — 나 전용 V3 composer/builder (라이브러리)
 *
 * 목적: content-fingerprint(V3) 기준 매장용 설명서를 저작·렌더한다.
 *   - 기존 3섹션 공용 composer(otc-v2-store-leaflet-runner.shared.ts:composeKo/buildGroupKo)는
 *     이상반응·경고·상호작용을 탈락 → 안전정보 약화. **기존 GREEN 파일은 수정하지 않는다.**
 *   - 본 파일은 신규 V3 route 전용 composer/builder 로 분리하여 공식 6섹션을 전부 보존한다.
 *
 * 6섹션 계약(otc-easy-drug-ready-1134-composer-safety-section-contract-v1.json):
 *   필수: 효능·효과, 용법·용량
 *   존재 시 보존: 경고, 사용상 주의사항, 이상반응, 상호작용
 *   - 존재하는 안전 섹션은 각각 별도 <h2> 섹션으로 방출(기존 sd-* 클래스 어휘만 사용 — design-core 무변경).
 *   - 공식 원문에 없는 안전정보 생성 금지. master 간 union 금지(V3 fp 내부는 6섹션 byte-identical).
 *   - route 비경구 동사 재표현(복용→사용) + 수치 불변.
 *
 * fp 산식은 라 census(otc-easy-drug-ready-1134-content-fingerprint-census.la.ts) 와 VERBATIM 동일.
 * DB 접근·부수효과 없음(순수 함수 라이브러리). import 시 자체 실행 없음.
 */
import crypto from 'node:crypto';
import {
  normalize,
  resolveRoute,
  missingNumerics,
  missingNumericsEn,
  ROUTE_PROFILE,
  type RouteProfile,
} from './otc-v2-store-leaflet-runner.shared.js';

// ── fp 산식 (라 census VERBATIM) ────────────────────────────────────────────────
export const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
export const H = (s: string): string => md5(s).slice(0, 16);

/** 공식 원문 섹션 파싱(제목→본문). census sections() 와 동일 정규식. */
export function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}
/** content fingerprint 에 포함하는 공식 content 섹션(순서 고정). 저장방법 제외. */
export const CONTENT_SECTIONS = ['효능·효과', '용법·용량', '경고', '사용상 주의사항', '이상반응', '상호작용'] as const;
export const MANDATORY_SECTIONS = ['효능·효과', '용법·용량'] as const;
export const SAFETY_SECTIONS = ['경고', '사용상 주의사항', '이상반응', '상호작용'] as const;

export function sectionHashVector(sec: Record<string, string>): Record<string, string> {
  const v: Record<string, string> = {};
  for (const k of CONTENT_SECTIONS) v[k] = H(normalize(sec[k] || ''));
  return v;
}
export function contentFingerprint(gencode: string, route: string, hv: Record<string, string>): string {
  return H([gencode, route, ...CONTENT_SECTIONS.map((k) => hv[k])].join('|'));
}
export function contentFpToUuid(fp: string): string {
  const h = md5('otc-v3-content-leaflet:' + fp);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// ── 평문 변환 (shared toPlain 과 동일 규칙 — private 라 복제) ────────────────────
export function toPlain(htmlish: string): string {
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

// ── V3 KO 구조화 소스 (6섹션) ────────────────────────────────────────────────────
export interface KoV3Source {
  summaryTable: Record<string, string>;
  efficacy: string;
  usage: string;
  usageLabel: string;
  /** 안전 섹션(존재 시). 원문 보존 + route 동사 재표현. */
  warning: string;      // 경고
  precaution: string;   // 사용상 주의사항
  adverse: string;      // 이상반응
  interaction: string;  // 상호작용
}
export interface KoV3Result { source: KoV3Source; anomalies: string[] }

const PHARM_FOOT_KO = '이 설명서는 매장 상담을 돕기 위한 것입니다. 제품 선택과 사용 전 매장 약사 등 전문가에게 문의하세요.';

/**
 * 공식 6섹션 → KO 구조화 소스. 효능·용법·안전 4섹션 보존, 경로 동사만 재표현, 수치 불변.
 * sec = sections(원문). route 프로파일로 비경구 동사 재표현.
 */
export function composeKoV3(
  sec: Record<string, string>,
  route: string,
  form: string,
  gencode: string,
  profiles: Record<string, RouteProfile> = ROUTE_PROFILE,
): KoV3Result {
  const prof = profiles[route];
  const anomalies: string[] = [];
  if (!prof) {
    return { source: { summaryTable: {}, efficacy: '', usage: '', usageLabel: '', warning: '', precaution: '', adverse: '', interaction: '' }, anomalies: [`미지원 route(${route})`] };
  }
  const rewrite = (s: string): string => { let t = s; for (const [re, to] of prof.koVerbRewrite) t = t.replace(re, to); return t; };

  const efficacy = toPlain(sec['효능·효과'] || '');
  const usage = rewrite(toPlain(sec['용법·용량'] || ''));
  const warning = rewrite(toPlain(sec['경고'] || ''));
  const precaution = rewrite(toPlain(sec['사용상 주의사항'] || ''));
  const adverse = rewrite(toPlain(sec['이상반응'] || ''));
  const interaction = rewrite(toPlain(sec['상호작용'] || ''));

  // 필수 섹션 공란 검증
  if (!efficacy) anomalies.push('효능 공란');
  if (!usage) anomalies.push('용법 공란');

  // 수치 보존 — 재표현 후에도 원문 수치 전량 유지
  const lostU = missingNumerics(sec['용법·용량'] || '', usage);
  if (lostU.length) anomalies.push(`용법 수치 누락 ${lostU.length}: ${lostU.slice(0, 5).join(',')}`);
  const lostE = missingNumerics(sec['효능·효과'] || '', efficacy);
  if (lostE.length) anomalies.push(`효능 수치 누락 ${lostE.length}: ${lostE.slice(0, 5).join(',')}`);

  // 경로 동사 게이트 — 비경구 용법/안전 섹션에 경구 동사 잔존 시 중지
  for (const re of prof.koForbidden) {
    for (const [label, txt] of [['용법', usage], ['경고', warning], ['주의', precaution], ['이상반응', adverse], ['상호작용', interaction]] as const) {
      re.lastIndex = 0;
      if (txt && re.test(txt)) anomalies.push(`비경구(${route}) ${label}에 경구 동사 잔존: ${re.source}`);
    }
  }

  const summaryTable: Record<string, string> = {
    분류: `일반의약품 · ${form}`,
    작용: efficacy.split('\n')[0]?.slice(0, 120) || '',
    '선택 포인트': `동일 일반명코드(${gencode}) 제품은 성분·함량·제형이 같습니다. 제품명이 아니라 성분과 함량으로 확인하세요.`,
    '주의 대상': (warning || precaution) ? '아래 안전정보 대상에 해당하면 매장 약사에게 먼저 문의하세요.' : '',
  };
  for (const k of Object.keys(summaryTable)) if (!summaryTable[k]) delete summaryTable[k];

  return { source: { summaryTable, efficacy, usage, usageLabel: prof.koUsageLabel, warning, precaution, adverse, interaction }, anomalies };
}

// ── V3 KO HTML 빌더 (6섹션, sd-* 어휘) ──────────────────────────────────────────
const escHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const paragraphs = (text: string): string[] => text.replace(/\r\n/g, '\n').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
const isBlank = (v: unknown): boolean => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

export interface BuildResult { html: string; missing: string[] }
const KO_REQUIRED = ['efficacy', 'usage', 'summaryTable'] as const;

export function buildKoV3Html(src: KoV3Source, opts: { title: string }): BuildResult {
  const missing: string[] = [];
  for (const f of KO_REQUIRED) {
    const v = (src as any)[f];
    if (f === 'summaryTable') { if (!v || typeof v !== 'object' || Object.keys(v).length === 0) missing.push(f); }
    else if (isBlank(v)) missing.push(f);
  }
  // 안전 섹션은 최소 하나 존재해야 한다(원문 보존 계약 — 전 안전 섹션 공란이면 승격 불가)
  if (isBlank(src.warning) && isBlank(src.precaution) && isBlank(src.adverse) && isBlank(src.interaction)) missing.push('safetyAll');
  if (missing.length) return { html: '', missing };

  const st = src.summaryTable;
  const out: string[] = [];
  out.push('<div class="sd-card">');
  out.push('  <div class="sd-hero">');
  const badges: string[] = [];
  if (!isBlank(st['분류'])) badges.push(`<span class="sd-badge is-solid">${escHtml(st['분류'])}</span>`);
  if (!isBlank(st['작용'])) badges.push(`<span class="sd-badge">${escHtml(st['작용'])}</span>`);
  if (badges.length) out.push(`    <div class="sd-badges">${badges.join('')}</div>`);
  const subtitle = st['선택 포인트'];
  out.push(`    <h1>${escHtml(opts.title)}${!isBlank(subtitle) ? `<small>${escHtml(subtitle)}</small>` : ''}</h1>`);
  if (!isBlank(st['성분'])) out.push(`    <p class="sd-meta">${escHtml(st['성분'])}</p>`);
  out.push('  </div>');

  out.push('  <div class="sd-body">');
  out.push(`    <p class="sd-intro">${paragraphs(src.efficacy).map(escHtml).join('<br>')}</p>`);

  const items = Object.entries(st).filter(([, v]) => !isBlank(v));
  if (items.length) {
    out.push('    <h2>한눈에 보기</h2>');
    out.push('    <div class="sd-core">');
    for (const [k, v] of items) { out.push('      <div class="sd-item">'); out.push(`        <span class="sd-tag">${escHtml(k)}</span>`); out.push(`        <p>${escHtml(v)}</p>`); out.push('      </div>'); }
    out.push('    </div>');
  }

  out.push(`    <h2>${escHtml(src.usageLabel || '사용 안내')}</h2>`);
  out.push(`    <p class="sd-intake">${paragraphs(src.usage).map(escHtml).join('<br>')}</p>`);

  // 안전 4섹션 — 존재 시 각각 별도 <h2> + sd-warn
  const safety: Array<[string, string]> = [['경고', src.warning], ['사용상 주의사항', src.precaution], ['이상반응', src.adverse], ['상호작용', src.interaction]];
  for (const [label, body] of safety) {
    if (isBlank(body)) continue;
    out.push(`    <h2>${escHtml(label)}</h2>`);
    out.push('    <ul class="sd-warn">');
    for (const p of paragraphs(body)) out.push(`      <li>${escHtml(p)}</li>`);
    out.push('    </ul>');
  }

  out.push(`    <p class="sd-foot">${escHtml(PHARM_FOOT_KO)}</p>`);
  out.push('  </div>');
  out.push('</div>');
  return { html: out.join('\n'), missing: [] };
}

// ── V3 EN 구조화 페이로드 (6섹션) ────────────────────────────────────────────────
export interface EnV3Payload {
  groupKey: string;
  title: string;
  usageLabel: string;   // route 주입(저작 자유입력 금지)
  efficacy: string;
  usage: string;
  warning: string;
  precaution: string;
  adverse: string;
  interaction: string;
  summaryTable: Record<string, string>;
}
export interface EnV3RenderResult { html: string; anomalies: string[] }
const HANGUL_RE = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const EN_PHARM_FOOT =
  'This leaflet supports in-store consultation. Ask a pharmacist at the store about product choice and use. ' +
  'Products with the same ingredient, strength and form are managed to the same quality standard. ' +
  'Check by ingredient and strength rather than by product name.';
const EN_REQUIRED = ['title', 'efficacy', 'usage', 'summaryTable'] as const;

export function buildEnV3Html(t: EnV3Payload): BuildResult {
  const missing: string[] = [];
  for (const f of EN_REQUIRED) {
    const v = (t as any)[f];
    if (f === 'summaryTable') { if (!v || typeof v !== 'object' || Object.keys(v).length === 0) missing.push(f); }
    else if (typeof v !== 'string' || v.trim() === '') missing.push(f);
  }
  if (isBlank(t.warning) && isBlank(t.precaution) && isBlank(t.adverse) && isBlank(t.interaction)) missing.push('safetyAll');
  if (missing.length) return { html: '', missing };

  const st = t.summaryTable;
  const enParas = (s: string): string[] => s.replace(/\r\n/g, '\n').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const sentences = (text: string): string[] => text.split(/(?<=\.)\s+(?=[A-Z(])/).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  out.push('<div class="sd-card">');
  out.push('  <div class="sd-hero">');
  const badges: string[] = [];
  if (st['Category']) badges.push(`<span class="sd-badge is-solid">${escHtml(st['Category'])}</span>`);
  if (st['How it works']) badges.push(`<span class="sd-badge">${escHtml(st['How it works'])}</span>`);
  if (badges.length) out.push(`    <div class="sd-badges">${badges.join('')}</div>`);
  out.push(`    <h1>${escHtml(t.title)}${st['Why this one'] ? `<small>${escHtml(st['Why this one'])}</small>` : ''}</h1>`);
  if (st['Ingredient']) out.push(`    <p class="sd-meta">${escHtml(st['Ingredient'])}</p>`);
  out.push('  </div>');

  out.push('  <div class="sd-body">');
  out.push(`    <p class="sd-intro">${enParas(t.efficacy).map(escHtml).join('<br>')}</p>`);
  out.push('    <h2>At a glance</h2>');
  out.push('    <div class="sd-core">');
  for (const [k, v] of Object.entries(st)) { if (!v) continue; out.push('      <div class="sd-item">'); out.push(`        <span class="sd-tag">${escHtml(k)}</span>`); out.push(`        <p>${escHtml(v)}</p>`); out.push('      </div>'); }
  out.push('    </div>');

  out.push(`    <h2>${escHtml(t.usageLabel)}</h2>`);
  out.push(`    <p class="sd-intake">${enParas(t.usage).map(escHtml).join('<br>')}</p>`);

  const safety: Array<[string, string]> = [['Warning', t.warning], ['Precautions for use', t.precaution], ['Possible side effects', t.adverse], ['Interactions', t.interaction]];
  for (const [label, body] of safety) {
    if (isBlank(body)) continue;
    out.push(`    <h2>${escHtml(label)}</h2>`);
    out.push('    <ul class="sd-warn">');
    for (const s of sentences(body)) out.push(`      <li>${escHtml(s)}</li>`);
    out.push('    </ul>');
  }
  out.push(`    <p class="sd-foot">${escHtml(EN_PHARM_FOOT)}</p>`);
  out.push('  </div>');
  out.push('</div>');
  return { html: out.join('\n'), missing: [] };
}

/**
 * EN 페이로드 검증 + route 라벨 주입 + 렌더. officialDosage = 원문 용법(수치 대조용).
 * usageLabel 은 route 에서 주입(저작 자유입력 금지).
 */
export function renderEnV3(
  t: Omit<EnV3Payload, 'usageLabel'>,
  route: string,
  officialDosage: string,
  profiles: Record<string, RouteProfile> = ROUTE_PROFILE,
): EnV3RenderResult {
  const prof = profiles[route];
  const anomalies: string[] = [];
  if (!prof) return { html: '', anomalies: [`미지원 route(${route})`] };
  const payload: EnV3Payload = { ...t, usageLabel: prof.enUsageLabel };
  const built = buildEnV3Html(payload);
  if (built.missing.length) anomalies.push(`EN 필수필드 누락 ${built.missing.join(',')}`);
  if (built.html && HANGUL_RE.test(built.html)) anomalies.push('EN 한글 잔존');
  for (const re of prof.enForbidden) {
    for (const [label, txt] of [['usage', payload.usage], ['warning', payload.warning], ['precaution', payload.precaution], ['adverse', payload.adverse], ['interaction', payload.interaction]] as const) {
      re.lastIndex = 0;
      if (txt && re.test(txt)) anomalies.push(`비경구(${route}) EN ${label}에 경구 동사: ${re.source}`);
    }
  }
  const lost = missingNumericsEn(officialDosage, payload.usage);
  if (lost.length) anomalies.push(`EN 용법 수량 누락 ${lost.length}: ${lost.slice(0, 5).join(',')}`);
  return { html: built.html, anomalies };
}

export { resolveRoute, normalize };
