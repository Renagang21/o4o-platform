/**
 * WO-O4O-HFF-FINAL-REVIEW-QUEUE-4544-FULL-PRODUCTION-V1  §4·§5·§6·§7·§8
 *
 * 최종 사람 검토 큐 4,544 행을 **현재 DB canonical 과 재대조**하여 §5 상태값을 부여한다. (read-only, DB write 0)
 *
 * 원칙
 *   - `alsoModifiedInThisWo` 만으로 해결 여부를 판단하지 않는다. 현재 canonical 에서 해당
 *     기능성 문제가 실제로 남아 있는지 공식 원문(MAIN_FNCTN) 대비 직접 재검증한다.
 *   - renderer family 는 클래스 존재로 판정하지 않는다(§6):
 *     ① 기존 family 감사 산출물 → ② h2 시그널 집합 → ③ 원본 큐 메타 순.
 *   - KO 는 삽입 전용 patch 계약(hff-ko-function-family-preserving-patch)으로 안전 여부를 판정한다.
 *   - EN 은 공식 원문 영문 근거가 전 원료 그룹을 커버할 때만 SAFE. KO 기계 번역은 하지 않는다(§8).
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { analyzeTarget, findFunctionalSections, cmpText, htmlText } from './hff-ko-function-family-preserving-patch.mjs';

const D = 'apps/api-server/src/scripts/data';
const OUT = `${D}/hff-final-review-4544-classification-v1.json`;
const sha = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');
const readJsonl = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const nrm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const dense = (s) => (s ?? '').replace(/&nbsp;/g, '').replace(/[\s 　]/g, '');

/* ── 입력 ──────────────────────────────────────────────────────────────── */
const queue = readJsonl(`${D}/hff-final-review-queue-v2.jsonl`);
if (queue.length !== 4544) throw new Error(`POPULATION_MISMATCH ${queue.length} != 4544`);
if (new Set(queue.map((r) => r.canonicalId)).size !== queue.length) throw new Error('DUPLICATE_CANONICAL_ID_IN_QUEUE');

const original = new Map(readJsonl(`${D}/hff-ko-function-human-review-queue-v1.jsonl`).map((r) => [r.canonicalId, r]));
const familyAudit = new Map(JSON.parse(fs.readFileSync(`${D}/hff-ko-skipped-existing-2451-renderer-family-audit-v1.json`, 'utf8')).items.map((x) => [x.canonicalId, x.family]));
const agent9 = new Set(readJsonl(`${D}/hff-ko-agent-09-hold-queue-v1.jsonl`).map((r) => r.canonicalId).filter(Boolean));

/* ── §6 renderer family 판정 — h2 시그널 집합 (클래스 존재로 판정 금지) ── */
const DRIVER_H2 = ['주요 기능성', '섭취량 및 섭취방법 (공식 표기 그대로)', '섭취 시 참고사항', '확인 가능한 기준·규격 정보', '매장 전문가 문의 안내'];
const COMPOSITE_H2 = ['왜 이 제품인가', '섭취방법 (공식 표기 그대로)', '표시 기준', '이런 분께'];
function familyByH2(content) {
  const h2 = [...String(content ?? '').matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => htmlText(m[1]));
  const d = DRIVER_H2.filter((x) => h2.includes(x)).length;
  const c = COMPOSITE_H2.filter((x) => h2.includes(x)).length + (h2.some((x) => /기능성/.test(x)) ? 1 : 0);
  if (d === 0 && c === 0) return { family: 'UNKNOWN', driverScore: d, compositeScore: c, h2 };
  return { family: d > c ? 'DRIVER' : d < c ? 'COMPOSITE' : 'AMBIGUOUS', driverScore: d, compositeScore: c, h2 };
}
function resolveFamily(canonicalId, content) {
  const byH2 = familyByH2(content);
  if (familyAudit.has(canonicalId)) return { family: familyAudit.get(canonicalId), source: 'FAMILY_AUDIT_ARTIFACT', h2Judgement: byH2 };
  if (byH2.family !== 'UNKNOWN' && byH2.family !== 'AMBIGUOUS') return { family: byH2.family, source: 'H2_SIGNAL_SET', h2Judgement: byH2 };
  const o = original.get(canonicalId);
  if (o?.rendererFamily) return { family: o.rendererFamily, source: 'ORIGINAL_QUEUE_META', h2Judgement: byH2 };
  return { family: byH2.family, source: 'H2_SIGNAL_SET_WEAK', h2Judgement: byH2 };
}

/* ── 원료 귀속 감사 — 라벨 카드에 다른 원료의 공식 절이 들어갔는지(§11 혼입 0) ── */
function attributionAudit(content, officialGroups) {
  const labeled = (officialGroups ?? []).filter((g) => g.header != null);
  if (labeled.length < 2) return { checked: false, mismatches: [] };
  const byHeader = new Map(labeled.map((g) => [cmpText(g.header), g.items.map((i) => cmpText(i))]));
  const all = [...byHeader.values()].flat();
  const mismatches = [];
  for (const sec of findFunctionalSections(content)) {
    for (const ing of sec.ingredients) {
      if (!ing.name) continue;
      const key = cmpText(ing.name);
      const hit = [...byHeader.keys()].filter((h) => h === key || h.includes(key) || key.includes(h));
      if (hit.length !== 1) continue;                 // 카드↔원문 라벨 대응이 유일할 때만 판정
      const own = byHeader.get(hit[0]);
      for (const it of ing.items) {
        const t = cmpText(it);
        if (!t || own.some((o) => o.includes(t) || t.includes(o))) continue;
        if (all.some((o) => o.includes(t) || t.includes(o))) mismatches.push({ card: ing.name, item: htmlText(it).slice(0, 80) });
      }
    }
  }
  return { checked: true, mismatches };
}

/* ── EN 근거 판정 (§8) — Phase 4-C 와 동일 규칙 ── */
function labeledGroupCount(src) {
  const s = nrm(src); let i = 0, n = 0;
  while (i < s.length) {
    if (s[i] === '[') { let depth = 0, j = i;
      for (; j < s.length; j++) { if (s[j] === '[') depth++; else if (s[j] === ']') { depth--; if (depth === 0) break; } }
      if (depth !== 0) return -1; n++; i = j + 1;
    } else i++;
  }
  return n;
}
function enParts(src) {
  const s = nrm(src); const parts = [];
  const re = /\(\s*영\s*문\s*\)\s*([^[(]*(?:\([^)]*\)[^[(]*)*)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const t = m[1].replace(/^[\s,]+|[\s,.]+$/g, '');
    if (t && /[A-Za-z]/.test(t) && !/[가-힣]/.test(t)) parts.push(t);
  }
  if (parts.length) return { kind: 'BILINGUAL_MARKER', parts };
  if (/[A-Za-z]/.test(s) && !/[가-힣]/.test(s) && s) return { kind: 'ENGLISH_ONLY_SOURCE', parts: [s] };
  return { kind: 'NONE', parts: [] };
}

/* ── §5 상태 매핑 ──────────────────────────────────────────────────────── */
const HOLD_SOURCE_REASONS = new Set(['NO_OFFICIAL_KO_CLAUSE', 'INSERT_CLAUSE_LEADING_PUNCTUATION', 'INSERT_CLAUSE_LANGUAGE_MARKER_PREFIX', 'INSERT_CLAUSE_TOO_SHORT', 'INSERT_CLAUSE_NO_FUNCTION_PREDICATE', 'INSERT_CLAUSE_MULTI_CLAUSE_SEGMENT']);
const HOLD_RENDERER_REASONS = new Set(['MULTIPLE_FUNCTIONAL_SECTIONS', 'MULTIPLE_TOP_LEVEL_LISTS', 'UNRECOGNIZED_GROUP_STRUCTURE', 'INGREDIENT_LIST_UNBALANCED', 'NO_FUNCTIONAL_SECTION', 'NO_INSERTABLE_LIST']);
const koStatus = (cls, reason) => {
  if (cls === 'FUNCTION_COMPLETE') return 'ALREADY_RESOLVED';
  if (cls === 'SAFE_MISSING_CLAUSE') return 'SAFE_APPLY';
  if (cls === 'STRUCTURE_ADAPTER_REQUIRED') return 'HOLD_RENDERER';
  if (HOLD_SOURCE_REASONS.has(reason)) return 'HOLD_SOURCE';
  if (HOLD_RENDERER_REASONS.has(reason)) return 'HOLD_RENDERER';
  return 'HOLD_AMBIGUOUS';
};
/* §14 정규화 holdReason */
const HOLD_REASON = {
  HOLD_SOURCE: 'SOURCE_REPAIR_REQUIRED',
  HOLD_RENDERER: 'UNSUPPORTED_RENDERER_STRUCTURE',
  HOLD_NO_EN_GROUNDING: 'NO_OFFICIAL_EN_GROUNDING',
};
const ambiguousReason = (reason) => (/INGREDIENT|LABEL|ATTRIBUTION|FLAT_LIST/.test(reason) ? 'AMBIGUOUS_INGREDIENT_OWNERSHIP' : 'AMBIGUOUS_FUNCTION_BOUNDARY');

/* ── DB 재측정 ─────────────────────────────────────────────────────────── */
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const ids = queue.map((r) => r.canonicalId);
const live = new Map();
for (let i = 0; i < ids.length; i += 500) {
  const rows = (await c.query(`
    SELECT spd.id, spd.master_id, spd.language, spd.description_type, spd.status, spd.content, spd.updated_at,
           pc.id candidate_id,
           pc.raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
           pc.raw_payload::jsonb->'source'->>'PRDUCT' pname,
           pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn
      FROM shared_product_descriptions spd
      LEFT JOIN product_candidates pc ON pc.matched_product_master_id = spd.master_id
        AND pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
     WHERE spd.id = ANY($1) AND spd.deleted_at IS NULL`, [ids.slice(i, i + 500)])).rows;
  for (const r of rows) live.set(r.id, r);
}
const baseline = (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) spd_all,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND coalesce(language,'ko')='ko') ko_total,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND language='en') en_total`)).rows[0];
await c.end();

/* ── 분류 ──────────────────────────────────────────────────────────────── */
const items = [];
for (const q of queue) {
  const r = live.get(q.canonicalId);
  const base = {
    canonicalId: q.canonicalId, language: q.language, track: q.track, queueReason: q.reason ?? null,
    alsoModifiedInThisWo: !!q.alsoModifiedInThisWo,
    previousQueueSources: q.sources ?? [], agent9Hold: agent9.has(q.canonicalId),
  };
  if (!r) { items.push({ ...base, status: 'FAILED_SYSTEM', statusReason: 'CANONICAL_NOT_FOUND', holdReason: 'CANONICAL_STRUCTURE_UNSAFE' }); continue; }
  const o = original.get(q.canonicalId) ?? null;
  const fam = resolveFamily(q.canonicalId, r.content);
  const meta = {
    ...base, productMasterId: r.master_id, candidateId: r.candidate_id ?? null,
    statementNo: r.stmt ?? o?.statementNo ?? q.statementNo ?? null,
    productName: r.pname ?? o?.productName ?? q.productName ?? null,
    dbLanguage: r.language, rendererFamily: fam.family, rendererFamilySource: fam.source,
    contentHash: sha(r.content), contentLength: r.content.length,
    originalReasons: o?.standardizedReviewReasons ?? (q.reason ? [q.reason] : []),
    originalRecommendedAction: o?.recommendedAction ?? null,
  };

  if (q.language === 'en') {
    const hasFn = /<h2>[^<]*function[^<]*<\/h2>/i.test(r.content);
    if (hasFn) { items.push({ ...meta, status: 'ALREADY_RESOLVED', statusReason: 'EN_FUNCTION_SECTION_PRESENT' }); continue; }
    if (!r.candidate_id) { items.push({ ...meta, status: 'HOLD_SOURCE', statusReason: 'NO_HFF_CANDIDATE_LINK', holdReason: 'SOURCE_REPAIR_REQUIRED' }); continue; }
    const g = enParts(r.fn); const gc = labeledGroupCount(r.fn);
    let st, why;
    if (!g.parts.length) { st = 'HOLD_NO_EN_GROUNDING'; why = 'NO_OFFICIAL_EN_GROUNDING'; }
    else if (gc < 0) { st = 'HOLD_SOURCE'; why = 'UNBALANCED_LABEL_BRACKET'; }
    else if (gc > g.parts.length) { st = 'HOLD_NO_EN_GROUNDING'; why = `EN_GROUNDING_PARTIAL_${g.parts.length}_OF_${gc}_GROUPS`; }
    else if (!g.parts.every((x) => dense(nrm(r.fn)).includes(dense(x)))) { st = 'HOLD_SOURCE'; why = 'EN_CLAUSE_NOT_VERBATIM'; }
    else if (g.parts.some((x) => /[가-힣]/.test(x))) { st = 'HOLD_SOURCE'; why = 'KOREAN_LEAKED_INTO_EN_CLAUSE'; }
    else if ((r.content.match(/<h2>Directions/g) ?? []).length !== 1) { st = 'HOLD_RENDERER'; why = 'ANCHOR_NOT_UNIQUE'; }
    else { st = 'SAFE_APPLY'; why = `SAFE_EN_APPLY:${g.kind}`; }
    items.push({ ...meta, status: st, statusReason: why,
      holdReason: st === 'SAFE_APPLY' ? null : st === 'HOLD_NO_EN_GROUNDING' ? (why.startsWith('EN_GROUNDING_PARTIAL') ? 'PARTIAL_EN_GROUNDING' : 'NO_OFFICIAL_EN_GROUNDING') : (HOLD_REASON[st] ?? 'SOURCE_REPAIR_REQUIRED'),
      enGrounding: { kind: g.kind, partCount: g.parts.length, officialLabeledGroups: gc, parts: st === 'SAFE_APPLY' ? g.parts : g.parts.slice(0, 2) },
      officialSourceEvidence: r.fn ? [String(r.fn).slice(0, 400)] : [] });
    continue;
  }

  /* KO */
  if (!r.candidate_id || !r.fn) { items.push({ ...meta, status: 'HOLD_SOURCE', statusReason: r.candidate_id ? 'NO_OFFICIAL_MAIN_FNCTN' : 'NO_HFF_CANDIDATE_LINK', holdReason: 'SOURCE_REPAIR_REQUIRED', officialSourceEvidence: [] }); continue; }
  let a;
  try { a = analyzeTarget({ content: r.content, mainFnctn: r.fn, family: fam.family }); }
  catch (e) { items.push({ ...meta, status: 'FAILED_SYSTEM', statusReason: `ANALYZE_ERROR:${String(e.message || e).slice(0, 120)}`, holdReason: 'CANONICAL_STRUCTURE_UNSAFE' }); continue; }
  const attr = attributionAudit(r.content, a.detail.coverage.length ? groupsOf(a) : []);
  let st = koStatus(a.classification, a.reason);
  let why = a.reason;
  if (st === 'ALREADY_RESOLVED' && attr.mismatches.length) { st = 'HOLD_AMBIGUOUS'; why = 'INGREDIENT_ATTRIBUTION_MISMATCH'; }
  if (st === 'SAFE_APPLY' && attr.mismatches.length) { st = 'HOLD_AMBIGUOUS'; why = 'INGREDIENT_ATTRIBUTION_MISMATCH'; }
  items.push({ ...meta, status: st, statusReason: why,
    holdReason: st === 'SAFE_APPLY' || st === 'ALREADY_RESOLVED' ? null
      : st === 'HOLD_AMBIGUOUS' ? ambiguousReason(why) : (HOLD_REASON[st] ?? 'CANONICAL_STRUCTURE_UNSAFE'),
    analysis: {
      classification: a.classification, reason: a.reason,
      officialClauseCount: a.detail.officialClauseCount, officialBlockCount: a.detail.officialBlockCount,
      officialLabeledBlockCount: a.detail.officialLabeledBlockCount,
      missingClauses: a.detail.coverage.filter((x) => x.how === 'MISSING').map((x) => ({ header: x.header, clause: x.clause })),
      sections: a.detail.sections, hazard: a.detail.hazard ?? null,
      attributionMismatches: attr.mismatches,
      insertCount: a.plan?.inserts.length ?? 0,
      insertPlan: a.plan ? a.plan.inserts.map((x) => ({ atIndex: x.atIndex, ingredient: x.ingredient, text: x.text })) : null,
      sectionMode: a.plan?.mode ?? a.detail.sections[0]?.mode ?? null,
    },
    officialSourceEvidence: [String(r.fn).slice(0, 400)] });
}

/** analyzeTarget 이 노출하는 coverage 로부터 공식 그룹(header→items) 재구성 */
function groupsOf(a) {
  const m = new Map();
  for (const cv of a.detail.coverage) {
    const k = cv.header ?? null;
    if (!m.has(k)) m.set(k, { header: k, items: [] });
    m.get(k).items.push(cv.clause);
  }
  return [...m.values()];
}

/* ── 집계·불변식 ───────────────────────────────────────────────────────── */
const tally = (arr, f) => arr.reduce((a, x) => { const k = f(x); a[k] = (a[k] ?? 0) + 1; return a; }, {});
const ko = items.filter((x) => x.language === 'ko');
const en = items.filter((x) => x.language === 'en');
const out = {
  builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  wo: 'WO-O4O-HFF-FINAL-REVIEW-QUEUE-4544-FULL-PRODUCTION-V1',
  phase: '§4·§5 — 최종 큐 4,544 재대조 및 분류',
  baseline,
  population: { queueRows: queue.length, classified: items.length, uniqueCanonicalIds: new Set(items.map((x) => x.canonicalId)).size, ko: ko.length, en: en.length },
  invariants: {
    statusSumEquals4544: items.length === 4544,
    canonicalDup: items.length - new Set(items.map((x) => x.canonicalId)).size,
    failedSystem: items.filter((x) => x.status === 'FAILED_SYSTEM').length,
    languageMatchesDb: items.every((x) => x.dbLanguage === undefined || (x.language === 'en' ? x.dbLanguage === 'en' : (x.dbLanguage ?? 'ko') === 'ko')),
  },
  statusTally: tally(items, (x) => x.status),
  koStatusTally: tally(ko, (x) => x.status),
  enStatusTally: tally(en, (x) => x.status),
  koReasonTally: tally(ko, (x) => `${x.status}|${x.statusReason}`),
  enReasonTally: tally(en, (x) => `${x.status}|${x.statusReason}`),
  rendererFamilyTally: tally(ko, (x) => `${x.rendererFamily}|${x.rendererFamilySource}`),
  attributionMismatchDocs: ko.filter((x) => x.analysis?.attributionMismatches?.length).length,
  alreadyResolvedFromThisWo: items.filter((x) => x.status === 'ALREADY_RESOLVED' && x.alsoModifiedInThisWo).length,
  safeApplyClauses: ko.filter((x) => x.status === 'SAFE_APPLY').reduce((n, x) => n + (x.analysis?.insertCount ?? 0), 0),
  items,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
const { items: _drop, ...brief } = out;
console.log(JSON.stringify(brief, null, 2));
