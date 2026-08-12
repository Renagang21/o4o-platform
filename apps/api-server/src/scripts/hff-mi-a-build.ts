/**
 * WO-O4O-HFF-MULTI-INGREDIENT-BULK-PRODUCTION-A-V1 — 다원료(복합) A 전용 additive 빌더.
 *
 * 대상: shard0(`stableHash(STTEMNT_NO)%3=0`) 미승격·미선점 제품 중 **원문이 원료별로 기능성을 명시 귀속**한 다원료.
 *   구조 3형식(원문 라벨에만 근거 · 추정 귀속 없음):
 *     ① `[원료] 기능성…`  ② `1) 원료 : 기능성…`  ③ `원료 : 기능성…`(2건 이상)
 *   `inline`(registry 추정 폴백)·`none` 은 원료↔기능성 연결이 원문에 없으므로 생산하지 않는다(HOLD).
 *
 * 기능성 누락 0 설계:
 *   - 라벨 블록을 **하나도 버리지 않는다.** 공용 `parseFnAttribution` 은 미분류 라벨을 `unknownLabels`
 *     로 보내고 그 블록의 기능성을 결과에서 제외하므로, 본 빌더는 로컬 파서로 **모든 블록을 보존**하고
 *     라벨이 registry 에 매핑되지 않으면 제품 전체를 HOLD 한다(LABEL_UNMAPPED).
 *   - 첫 라벨 앞의 기능성 문장(preamble)·기능성 0개 블록은 구조 붕괴 신호 → HOLD.
 *   - 최종적으로 원문 전체 기능성 원자(`splitFunctions`)가 **전부 렌더**되었는지 재확인(FN_ATOM_UNRENDERED).
 *   - 서로 다른 라벨이 같은 registry 키로 접히면(식이섬유 계열 등) 카드가 합쳐져 누락이 되므로 HOLD.
 *
 * 공식 기능성 문장은 원문 그대로 렌더링하며 삭제·순화·추가하지 않는다. 표시량은 기재하지 않는다.
 * EN 은 공용 매퍼(`mapFunctionEnC ?? mapFunctionEn`)로만 만들고 하나라도 미매핑이면 HOLD(임의 영문 0).
 * 전문가 상담 footer 유지. 공용 parser·registry·composer·apply 는 수정하지 않는다.
 *
 *   PROXY_PORT=5442 npx tsx src/scripts/hff-mi-a-build.ts --out <dir> [--chunk N] [--limit N]
 * DB write 0. 산출: <dir>/mi-a-target-<i>.json (hff-sf-apply.ts 입력) · mi-a-{pool,hold,selfcheck}.json
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { parseServing, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import { classify, normalizeSpecText, splitFunctions } from './hff-source-parse.js';
import { SF_INGREDIENTS } from './hff-sf-registry.js';
import { NUTRIENT_META, FUNCTIONAL_META, mapFunctionEn } from './hff-nutrient-registry.js';
import { mapFunctionEnC } from './hff-sf-c-en-overlay.js';

function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const esc = (s: string): string => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** 비교용 정규화(문장부호·공백 제거) — 렌더 누락 판정에만 사용. */
const cmp = (s: string): string => s.replace(/[\s.,。、·:：;()[\]/]/g, '');

// ── 로컬 라벨 블록 파서(공용 parseFnAttribution 무수정 · 블록 보존) ────────────────
type MiMode = 'bracket' | 'numbered' | 'colon' | 'none';
interface Block { label: string; seg: string }
interface LabelParse { mode: MiMode; blocks: Block[]; preamble: string }

function cut(t: string, ms: RegExpMatchArray[], labelOf: (m: RegExpMatchArray) => string): Block[] {
  const out: Block[] = [];
  for (let i = 0; i < ms.length; i++) {
    const start = (ms[i].index ?? 0) + ms[i][0].length;
    const end = i + 1 < ms.length ? (ms[i + 1].index ?? t.length) : t.length;
    out.push({ label: labelOf(ms[i]).trim(), seg: t.slice(start, end) });
  }
  return out;
}

function parseLabelBlocks(mainFn: string): LabelParse {
  const t = normalizeSpecText(mainFn);
  const brackets = [...t.matchAll(/\[([^\]]+)\]/g)];
  if (brackets.length >= 2) {
    return { mode: 'bracket', blocks: cut(t, brackets, (m) => m[1]), preamble: t.slice(0, brackets[0].index ?? 0) };
  }
  const numbered = [...t.matchAll(/(?:^|\s)(\d+)\)\s*([가-힣A-Za-z0-9()\-·\s]{2,25}?)\s*[:：]\s*/g)];
  if (numbered.length >= 2) {
    return { mode: 'numbered', blocks: cut(t, numbered, (m) => m[2]), preamble: t.slice(0, numbered[0].index ?? 0) };
  }
  const colon = [...t.matchAll(/(?:^|\s)([가-힣A-Za-z0-9()\-·]{2,25})\s*[:：]\s*/g)];
  if (colon.length >= 2) {
    return { mode: 'colon', blocks: cut(t, colon, (m) => m[1]), preamble: t.slice(0, colon[0].index ?? 0) };
  }
  return { mode: 'none', blocks: [], preamble: t };
}

const FN_SPLIT = new RegExp(
  '[①②③④⑤⑥⑦⑧⑨⑩⑪⑫]' +
  '|\\((?:가|나|다|라|마|바|사|\\d+)\\)' +
  '|(?:^|\\s)\\d+[).]' +
  '|\\s*/\\s*' +
  '|(?<=필요|있음|있습니다|줌|도움|보호|유지|생성|합성|발달|개선|억제|완화|증진)\\s*[.,。、]?\\s+(?=[가-힣])');

/** 블록 세그먼트 → 공식 기능성 KO 문장(원문 그대로). 이중언어 병기는 KO 만 보존. */
function blockFunctions(seg: string): string[] {
  let raw = (seg ?? '').replace(/[（]/g, '(').replace(/[）]/g, ')');
  raw = raw.replace(/\(?\s*영문\s*\)?[\s\S]*$/, '').replace(/May\s+help[\s\S]*$/i, '').replace(/\(?\s*국문\s*\)?/g, '');
  const t = normalizeSpecText(raw);
  return [...new Set(t.split(FN_SPLIT)
    .map((x) => x.trim().replace(/^[-•*\s:：·,，]+/, '').replace(/[.。,，、·\s]+$/, '').trim())
    .filter((x) => x.length >= 5 && /도움|개선|필요|유지|억제|완화|증진|보호|생성|합성/.test(x)))];
}

// ── 카드 구성(hff-nb-a-combo-build.ts composeNbCombo 와 동일 레이아웃 계약 · 표시량 미기재) ──
function appearance(base: string): string {
  const t = normalizeSource(base);
  const m = t.match(/성상\s*[:：]\s*([^\n]+?)(?=\s*\d+\s*[).]|\s*[①②③④⑤]|\s*[가-힣]{2,10}\s*[:：]|$)/);
  if (!m) return ''; let a = m[1].trim().replace(/\s+/g, ' ').replace(/[\s(·,［]+$/, '').trim();
  if ((a.match(/\(/g) || []).length > (a.match(/\)/g) || []).length) a = a.split('(')[0].trim(); return a;
}
const coliformNeg = (base: string): boolean => /대장균군\s*[:：]?\s*음성/.test(normalizeSource(base));
function cautionParts(raw: string): { ko: string[]; en: string[] } {
  const s = normalizeSource(raw); const ko: string[] = [], en: string[] = [];
  if (/임산부|임신|수유/.test(s)) { ko.push('임산부·수유부는 섭취 전 전문가와 상담'); en.push('Pregnant or breastfeeding women should consult a professional before use'); }
  if (/의약품|질환|질병|치료/.test(s)) { ko.push('질환이 있거나 의약품 복용 시 전문가와 상담'); en.push('Consult a professional if you have a medical condition or take medication'); }
  if (/알레르기|알러지|과민/.test(s)) { ko.push('알레르기 체질 등은 개인에 따라 과민반응 가능'); en.push('Allergic reactions may occur in sensitive individuals'); }
  if (/이상사례|이상반응|부작용|중단/.test(s)) { ko.push('이상사례 발생 시 섭취를 중단하고 전문가와 상담'); en.push('Stop use and consult a professional if adverse effects occur'); }
  if (!ko.length) { ko.push('섭취 전 제품 표시사항을 확인'); en.push('Refer to the official labelling before use'); }
  ko.push('건강기능식품은 질병의 예방·치료를 위한 의약품이 아니며, 궁금한 점은 매장 내 약사 등 전문가와 상담하십시오');
  en.push('This health functional food is not a drug for preventing or treating disease; consult a pharmacist or professional in store');
  return { ko, en };
}
const COUNTER: Record<string, { ko: string; en: string }> = { 포: { ko: '포', en: 'sachet' }, 스틱: { ko: '포', en: 'sachet' }, 캡슐: { ko: '캡슐', en: 'capsule' }, 캅셀: { ko: '캡슐', en: 'capsule' }, 정: { ko: '정', en: 'tablet' }, 병: { ko: '병', en: 'bottle' }, 환: { ko: '환', en: 'pill' } };
function counter(unit: string | null, form: string): { ko: string; en: string } {
  if (unit && COUNTER[unit]) return COUNTER[unit];
  if (/캡슐|캅셀|연질/.test(form)) return COUNTER['캡슐']; if (/정제|정\b/.test(form)) return COUNTER['정']; if (/분말|포/.test(form)) return COUNTER['포']; return COUNTER['정'];
}

interface MiIng { key: string; label: string; displayKo: string; displayEn: string; fnKo: string[]; fnEn: string[] }
function metaOf(key: string): { displayKo: string; displayEn: string } | null {
  const sf = Object.values(SF_INGREDIENTS).find((i) => i.key === key);
  if (sf) return { displayKo: sf.displayKo, displayEn: sf.displayEn };
  const m = FUNCTIONAL_META[key] ?? NUTRIENT_META[key];
  return m ? { displayKo: m.displayKo, displayEn: m.displayEn } : null;
}
interface MiSeed {
  statementNo: string; candidateId: string; productName: string; manufacturer: string; ings: MiIng[];
  source: { mainFunction: string; baseStandard: string; intake: string; dosageForm: string; shelfLife: string; storage: string; caution: string };
}

function composeMiCombo(seed: MiSeed): { ko: string; en: string } | { error: string } {
  const srv = parseServing(seed.source.intake); if (srv.kind !== 'PARSED') return { error: `SERVING_${srv.kind}` };
  const s = srv.value; const ct = counter(s.unitType, seed.source.dosageForm);
  const perServeKo = s.unitsPerServing != null ? `${s.unitsPerServing}${ct.ko}` : null;
  const perServeEn = s.unitsPerServing != null ? `${s.unitsPerServing} ${ct.en}${s.unitsPerServing > 1 ? 's' : ''}` : null;
  const sd = s.servingsPerDay ?? 1; const dayKo = `1일 ${sd}회`, dayEn = sd === 1 ? 'Once a day' : `${sd} times a day`;
  const app = appearance(seed.source.baseStandard); const coli = coliformNeg(seed.source.baseStandard);
  const shelf = normalizeSource(seed.source.shelfLife), storage = normalizeSource(seed.source.storage);
  const caut = cautionParts(seed.source.caution); const li = (a: string[]): string => a.map((x) => `<li>${x}</li>`).join('');
  const waterInSource = /물|음용수/.test(normalizeSource(seed.source.intake)) && !/물\s*없이/.test(normalizeSource(seed.source.intake));
  const ings = seed.ings;
  const titleKo = ings.map((a) => a.displayKo).join(' · '), titleEn = ings.map((a) => a.displayEn).join(' · ');

  const badgeKo = '<span class="sd-badge">건강기능식품</span>' + ings.map((a) => `<span class="sd-badge is-solid">${esc(a.displayKo)}</span>`).join('') + `<span class="sd-badge">${dayKo}</span>`;
  const badgeEn = '<span class="sd-badge">Health Functional Food</span>' + ings.map((a) => `<span class="sd-badge is-solid">${esc(a.displayEn)}</span>`).join('') + `<span class="sd-badge">${dayEn}</span>`;
  const metaKo = `${esc(seed.manufacturer)} 제조 · ${dayKo}${perServeKo ? ` 1회 ${perServeKo}` : ''}`;
  const metaEn = `Made by ${esc(seed.manufacturer)} · ${dayEn}${perServeEn ? ` · ${perServeEn} per serving` : ''}`;
  const introKo = `이 제품은 ${ings.map((a) => `<b>${esc(a.displayKo)}</b>`).join(', ')}를 주원료로 한 ${ings.length}원료 복합 건강기능식품입니다. 공식 섭취방법은 <b>${dayKo}${perServeKo ? `, 1회 ${perServeKo}` : ''}</b>이며, 각 원료의 공식 인정 기능성은 아래와 같습니다.`;
  const introEn = `This product combines ${ings.map((a) => `<b>${esc(a.displayEn)}</b>`).join(', ')} as its ${ings.length} functional ingredients. The official directions are <b>${dayEn}${perServeEn ? `, ${perServeEn} per serving` : ''}</b>. The officially recognised functions of each are listed below.`;

  const whyKo = [`주원료: ${ings.map((a) => `<b>${esc(a.displayKo)}</b>`).join(', ')}`]; if (coli) whyKo.push('대장균군 음성 — 식약처 신고 기준 적합'); whyKo.push(`${app ? esc(app) + ' · ' : ''}${esc(seed.manufacturer)} 제조`);
  const whyEn = [`Functional ingredients: ${ings.map((a) => `<b>${esc(a.displayEn)}</b>`).join(', ')}`]; if (coli) whyEn.push('Coliform negative — meets its MFDS notified standard'); whyEn.push(`Made by ${esc(seed.manufacturer)}`);

  const fnKo = ings.map((a) => `<li><b>${esc(a.displayKo)}</b><ul class="sd-why">${li(a.fnKo.map(esc))}</ul></li>`).join('');
  const fnEn = ings.map((a) => `<li><b>${esc(a.displayEn)}</b><ul class="sd-why">${li(a.fnEn.map(esc))}</ul></li>`).join('');

  const chipsKo = [`<span class="sd-tag">${dayKo}</span>`]; if (perServeKo) chipsKo.push(`<span class="sd-tag">1회 ${perServeKo}</span>`); if (waterInSource) chipsKo.push('<span class="sd-tag">물과 함께</span>');
  const chipsEn = [`<span class="sd-tag">${dayEn}</span>`]; if (perServeEn) chipsEn.push(`<span class="sd-tag">${perServeEn} per serving</span>`); if (waterInSource) chipsEn.push('<span class="sd-tag">With water</span>');
  const specKo: string[] = []; if (app) specKo.push(`<div class="sd-item"><b>성상</b> ${esc(app)}</div>`); if (coli) specKo.push('<div class="sd-item"><b>대장균군</b> 음성</div>'); if (shelf) specKo.push(`<div class="sd-item"><b>유통기한</b> ${esc(shelf)}</div>`); if (storage) specKo.push(`<div class="sd-item"><b>보관</b> ${esc(storage)}</div>`);
  const specEn: string[] = []; if (app) specEn.push(`<div class="sd-item"><b>Appearance</b> ${esc(app)}</div>`); if (coli) specEn.push('<div class="sd-item"><b>Coliform</b> Negative</div>'); if (shelf) specEn.push(`<div class="sd-item"><b>Shelf life</b> ${esc(shelf)}</div>`); if (storage) specEn.push(`<div class="sd-item"><b>Storage</b> ${esc(storage)}</div>`);
  const whoKo = [`매일 ${titleKo} 섭취를 함께 챙기고 싶은 분`, `${ct.ko} 형태를 선호하는 분`, '여러 원료를 간편하게 함께 관리하고 싶은 분'];
  const whoEn = [`Those who want to take ${titleEn} daily`, `Those who prefer ${ct.en}s`, 'Those who want a convenient way to manage multiple ingredients'];

  const ko = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badgeKo}</div>
  <h1>${esc(seed.productName)}<small>${esc(titleKo)}</small></h1><p class="sd-meta">${metaKo}</p></div>
  <div class="sd-body"><p class="sd-intro">${introKo}</p>
  <h2>왜 이 제품인가</h2><ul class="sd-why">${li(whyKo)}</ul>
  <h2>원료별 공식 인정 기능성</h2><ul class="sd-func">${fnKo}</ul>
  <h2>섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips">${chipsKo.join('')}</span></div>${specKo.length ? `
  <h2>표시 기준</h2><div class="sd-spec">${specKo.join('')}</div>` : ''}
  <h2>이런 분께</h2><ul class="sd-who">${li(whoKo)}</ul></div><div class="sd-foot"><b>섭취 시 주의사항</b> · ${caut.ko.join(' · ')}</div></div>`;
  const en = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badgeEn}</div>
  <h1>${esc(seed.productName)}<small>${esc(titleEn)}</small></h1><p class="sd-meta">${metaEn}</p></div>
  <div class="sd-body"><p class="sd-intro">${introEn}</p>
  <h2>Why this product</h2><ul class="sd-why">${li(whyEn)}</ul>
  <h2>Officially recognised functions by ingredient</h2><ul class="sd-func">${fnEn}</ul>
  <h2>Directions (exactly as officially stated)</h2><div class="sd-intake"><span class="sd-chips">${chipsEn.join('')}</span></div>${specEn.length ? `
  <h2>Labelled standard</h2><div class="sd-spec">${specEn.join('')}</div>` : ''}
  <h2>Who it suits</h2><ul class="sd-who">${li(whoEn)}</ul></div><div class="sd-foot"><b>Precautions</b> · ${caut.en.join(' · ')}</div></div>`;
  return { ko, en };
}

/** 로컬 combo guard: 카드 수 ko=en=N · 원료별 KO/EN 개수 일치 및 draft 포함 · 키 중복 0. */
function miComboGuard(seed: MiSeed, ko: string, en: string): string[] {
  const out: string[] = []; const n = seed.ings.length;
  const koCards = (ko.match(/<li><b>[^<]+<\/b><ul class="sd-why">/g) || []).length;
  const enCards = (en.match(/<li><b>[^<]+<\/b><ul class="sd-why">/g) || []).length;
  if (koCards !== n || enCards !== n) out.push(`G-MI-CARD-COUNT: n${n}/ko${koCards}/en${enCards}`);
  for (const a of seed.ings) {
    if (!a.fnKo.length || a.fnKo.length !== a.fnEn.length) out.push(`G-MI-FUNC-COUNT:${a.key}`);
    for (const f of a.fnKo) if (!ko.includes(esc(f))) out.push(`G-MI-KO-MISSING:${a.key}`);
    for (const f of a.fnEn) if (!en.includes(esc(f))) out.push(`G-MI-EN-MISSING:${a.key}`);
  }
  const keys = seed.ings.map((a) => a.key);
  if (new Set(keys).size !== keys.length) out.push(`G-MI-DUP:${keys.join(',')}`);
  return out;
}

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUTDIR = arg('out'); if (!OUTDIR) throw new Error('--out <dir> 필요');
const CHUNK = parseInt(arg('chunk', '250'), 10);
const LIMIT = parseInt(arg('limit', '0'), 10);
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5442', 10);
fs.mkdirSync(OUTDIR, { recursive: true });

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: false, ssl: false, extra: { max: 2, statement_timeout: 600000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(
      `SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));
    const hasMaster = new Set((await ds.query(`SELECT DISTINCT mfds_permit_number p FROM product_masters WHERE mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));

    const funnel = { scanned: 0, shard0: 0, skipped: 0, noStructure: 0, notMulti: 0, preambleResidue: 0, labelUnmapped: 0, emptyBlock: 0, dupKey: 0, fiberPending: 0, noMeta: 0, enPending: 0, atomUnrendered: 0, composeHold: 0, comboGuardFail: 0, guardBlock: 0, guardReview: 0, target: 0 };
    const target: unknown[] = []; const pool: unknown[] = []; const hold: Array<Record<string, unknown>> = [];
    const seen = new Set<string>(); const holdReason: Record<string, number> = {}; const distMode: Record<string, number> = {}; const distN: Record<string, number> = {};
    const H = (stmt: string, name: string, reason: string, extra: Record<string, unknown> = {}): void => {
      holdReason[reason.split(':')[0]] = (holdReason[reason.split(':')[0]] ?? 0) + 1;
      if (hold.length < 4000) hold.push({ stmt, name, reason, ...extra });
    };

    let after = '00000000-0000-0000-0000-000000000000';
    outer: for (;;) {
      const rows: Array<{ id: string; mid: string | null; stmt: string; name: string; maker: string; sungsang: string; srv: string; fn: string; base: string; shelf: string; storage: string; caution: string }> = await ds.query(
        `SELECT id, matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt,
           coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'ENTRPS','') maker,
           coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang, coalesce(raw_payload->'source'->>'SRV_USE','') srv,
           coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn, coalesce(raw_payload->'source'->>'BASE_STANDARD','') base,
           coalesce(raw_payload->'source'->>'DISTB_PD','') shelf, coalesce(raw_payload->'source'->>'PRSRV_PD','') storage,
           coalesce(raw_payload->'source'->>'INTAKE_HINT1','') caution
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1
         ORDER BY id ASC LIMIT 5000`, [after]);
      if (!rows.length) break;
      after = rows[rows.length - 1].id;

      for (const r of rows) {
        funnel.scanned++;
        const stmt = String(r.stmt).trim(); if (!stmt) continue;
        if (stableHash(stmt) % 3 !== 0) continue; funnel.shard0++;
        if (seen.has(stmt)) continue; seen.add(stmt);
        if (r.mid != null || taken.has(stmt) || hasMaster.has(stmt)) { funnel.skipped++; continue; }
        const mf = r.fn || ''; const name = r.name.trim();

        // 1) 명시 구조만 — inline 추정 귀속 없음
        const lp = parseLabelBlocks(mf);
        if (lp.mode === 'none') { funnel.noStructure++; H(stmt, name, 'NO_EXPLICIT_STRUCTURE'); continue; }
        if (lp.blocks.length < 2) { funnel.notMulti++; continue; }
        // 2) 첫 라벨 앞 기능성 문장 = 귀속 불명 잔여 → HOLD
        if (blockFunctions(lp.preamble).length) { funnel.preambleResidue++; H(stmt, name, 'RESIDUE_PREAMBLE', { mode: lp.mode }); continue; }

        // 3) 모든 블록 보존: 라벨 미매핑·기능성 0개는 제품 전체 HOLD (기능성 누락 방지)
        const ings: MiIng[] = []; let holdReasonStr = ''; const usedKeys = new Set<string>();
        for (const b of lp.blocks) {
          const label = b.label.replace(/\s+/g, ' ').trim();
          const k = classify(label);
          if (!k) { holdReasonStr = `LABEL_UNMAPPED:${label.slice(0, 24)}`; funnel.labelUnmapped++; break; }
          const fnKo = blockFunctions(b.seg);
          if (!fnKo.length) { holdReasonStr = `EMPTY_FN_BLOCK:${label.slice(0, 24)}`; funnel.emptyBlock++; break; }
          if (usedKeys.has(k)) { holdReasonStr = `DUP_KEY_LABELS:${k}`; funnel.dupKey++; break; }
          if (k === '식이섬유') { holdReasonStr = 'PENDING_SHARED_FIBER'; funnel.fiberPending++; break; }
          usedKeys.add(k);
          const meta = metaOf(k); if (!meta) { holdReasonStr = `NO_META:${k}`; funnel.noMeta++; break; }
          const fnEn: string[] = []; let enMiss = '';
          for (const f of fnKo) { const e = mapFunctionEnC(f) ?? mapFunctionEn(f); if (!e) { enMiss = f; break; } fnEn.push(e); }
          if (enMiss) { holdReasonStr = `GROUNDING_PENDING_EN:${enMiss.slice(0, 40)}`; funnel.enPending++; break; }
          ings.push({ key: k, label, displayKo: meta.displayKo, displayEn: meta.displayEn, fnKo, fnEn });
        }
        if (holdReasonStr) { H(stmt, name, holdReasonStr, { mode: lp.mode }); continue; }
        if (ings.length < 2) { funnel.notMulti++; continue; }

        // 4) 원문 전체 기능성 원자가 모두 렌더되는지 재확인 — 기능성 누락 0 게이트
        const rendered = new Set(ings.flatMap((a) => a.fnKo).map(cmp));
        const missing = splitFunctions(mf).filter((a) => {
          const c = cmp(a); if (!c) return false;
          for (const rr of rendered) if (rr.includes(c) || c.includes(rr)) return false;
          return true;
        });
        if (missing.length) { funnel.atomUnrendered++; H(stmt, name, 'FN_ATOM_UNRENDERED', { mode: lp.mode, miss: missing.slice(0, 3) }); continue; }

        const seed: MiSeed = { statementNo: stmt, candidateId: r.id, productName: name, manufacturer: r.maker.trim(), ings,
          source: { mainFunction: mf.trim(), baseStandard: (r.base || '').trim(), intake: r.srv.trim(), dosageForm: r.sungsang.trim(), shelfLife: r.shelf.trim(), storage: r.storage.trim(), caution: r.caution.trim() } };
        const c = composeMiCombo(seed);
        if ('error' in c) { funnel.composeHold++; H(stmt, name, `COMPOSE_${c.error}`); continue; }
        const cg = miComboGuard(seed, c.ko, c.en);
        if (cg.length) { funnel.comboGuardFail++; H(stmt, name, `COMBO_GUARD:${cg[0]}`); continue; }

        const gi = { candidateId: r.id, productName: name, productNameEn: name, manufacturer: seed.manufacturer, manufacturerEn: null, statementNo: stmt, category: 'hff',
          source: { mainFunction: seed.source.mainFunction, baseStandard: seed.source.baseStandard, intake: seed.source.intake, caution: seed.source.caution, dosageForm: seed.source.dosageForm, storage: seed.source.storage, shelfLife: seed.source.shelfLife },
          grounding: { declaredAmount: null, serving: null, calculationAllowed: false, ageBandsRaw: null }, drafts: { ko: c.ko, en: c.en } };
        const g = runGuard(gi as never, { phase: 'all' });
        const blocked = g.findings.filter((f) => f.status === 'BLOCKED');
        if (blocked.length) { funnel.guardBlock++; H(stmt, name, `GUARD_BLOCKED:${blocked.map((f) => f.ruleId).join(',')}`); continue; }
        if (g.overallStatus === 'REVIEW_REQUIRED') { funnel.guardReview++; H(stmt, name, `GUARD_REVIEW:${g.findings.filter((f) => f.status === 'REVIEW_REQUIRED').map((f) => f.ruleId).join(',')}`); continue; }

        distMode[lp.mode] = (distMode[lp.mode] ?? 0) + 1;
        distN[String(ings.length)] = (distN[String(ings.length)] ?? 0) + 1;
        target.push(gi); pool.push({ stmt, name, mode: lp.mode, keys: ings.map((a) => a.key), nFn: ings.reduce((s2, a) => s2 + a.fnKo.length, 0) });
        funnel.target++;
        if (LIMIT && target.length >= LIMIT) break outer;
      }
    }

    const chunks: number[] = [];
    for (let i = 0, b = 0; i < target.length; i += CHUNK, b++) {
      fs.writeFileSync(path.join(OUTDIR, `mi-a-target-${b}.json`), JSON.stringify(target.slice(i, i + CHUNK), null, 1));
      chunks.push(Math.min(CHUNK, target.length - i));
    }
    const w = (nm: string, d: unknown): void => fs.writeFileSync(path.join(OUTDIR, `mi-a-${nm}.json`), JSON.stringify(d, null, 1));
    w('pool', pool); w('hold', hold); w('selfcheck', { funnel, distMode, distN, holdReason, chunks });
    console.log('JSON_MI_A_BEGIN');
    console.log(JSON.stringify({ funnel, distMode, distN, holdReason, targetTotal: target.length, chunks }, null, 2));
    console.log('JSON_MI_A_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
