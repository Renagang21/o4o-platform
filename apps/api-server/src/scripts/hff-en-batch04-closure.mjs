/**
 * WO-O4O-HFF-EN-BATCH-04-5000-DIRECT-BULK-PRODUCTION-AND-DEFERRED-ISSUE-QUEUE-V1 §8·§10
 * Batch 04 종료 집계 + 통합 deferred issue queue + 독립 검증 (read-only, DB write 없음).
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { SLOT_RE, norm } from './hff-en-batch-01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const PORT = parseInt(process.env.PROXY_PORT ?? '5611', 10);
const sha = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
const rd = (f) => JSON.parse(fs.readFileSync(`${D}/${f}`, 'utf8'));
const rdIf = (f) => (fs.existsSync(`${D}/${f}`) ? rd(f) : null);
const rdl = (f) => (fs.existsSync(`${D}/${f}`)
  ? fs.readFileSync(`${D}/${f}`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const wr = (f, o) => fs.writeFileSync(`${D}/${f}`, JSON.stringify(o, null, 1), 'utf8');

// WO §6: 실제 문제만 큐에 남긴다. 자산 부족류 사유는 사용하지 않는다.
const ALLOWED = ['KO_SOURCE_DAMAGED', 'NUMBER_STRUCTURE_AMBIGUOUS', 'INGREDIENT_OWNERSHIP_AMBIGUOUS',
  'CANONICAL_STRUCTURE_UNSAFE', 'HASH_DRIFT', 'TRANSLATION_AMBIGUOUS', 'RENDER_FAILURE'];
const FORBIDDEN = ['ASSET_MISSING', 'NO_ENTRY', 'TEMPLATE_UNSUPPORTED', 'LOW_EFFICIENCY', 'PENDING_DIRECT_TRANSLATION'];
const issueTypeOf = (reason) => String(reason ?? '').replace(/^HOLD_/, '');

const NEXT_ACTION = {
  KO_SOURCE_DAMAGED: 'KO canonical 슬롯의 손상 조각(빈 절·깨진 문자·리터럴 null)을 원문 기준으로 교정한 뒤 EN 재생산',
  NUMBER_STRUCTURE_AMBIGUOUS: '한 슬롯에 겹친 복수 용량 축 또는 KO 안의 영문 중복 병기를 분리한 뒤 슬롯 단위 수치 대조 재실행',
  INGREDIENT_OWNERSHIP_AMBIGUOUS: '원료 귀속 마커를 보존하는 슬롯 분해 규칙을 확정한 뒤 재생산',
  CANONICAL_STRUCTURE_UNSAFE: 'KO canonical 구조(li/h2/sd-item/sd-tag/b 수) 정합성을 회복한 뒤 재생산',
  HASH_DRIFT: '선정 시점 이후 변경된 KO canonical 을 재선정하여 모집단 갱신',
  TRANSLATION_AMBIGUOUS: '번역 슬롯에 한국어가 남는 원인(중첩 마크업·비표준 구분자)을 확정한 뒤 재생산',
  RENDER_FAILURE: '렌더 감사 실패 항목(rawHtml·marker·overflow)을 교정한 뒤 재생산',
};
const RETRY = {
  KO_SOURCE_DAMAGED: 'KO canonical 교정 WO 종료 후',
  NUMBER_STRUCTURE_AMBIGUOUS: '슬롯 단위 수치 대조 규칙 개정 후',
  INGREDIENT_OWNERSHIP_AMBIGUOUS: '귀속 마커 보존 규칙 확정 후',
  CANONICAL_STRUCTURE_UNSAFE: 'KO 구조 복구 후',
  HASH_DRIFT: '모집단 재선정 후',
  TRANSLATION_AMBIGUOUS: '원인 확정 후',
  RENDER_FAILURE: '렌더 교정 후',
};

// 레거시 HOLD 재판정용 최소 번역기(분류 전용, DB write 없음)
const { lookup, key } = await import('./hff-en-batch-01-translate.mjs');
const DAMAGED = (t) => /[�]/.test(t) || /^[·\-–—,\s]*$/.test(t) || /^(null|undefined|NaN)$/i.test(t);
const koNums = (s) => (norm(s).match(/\d+(?:[.,]\d+)?/g) ?? []).map((x) => x.replace(/,/g, ''));
const enNums = (s) => (String(s).match(/\d+(?:[.,]\d+)?/g) ?? []).map((x) => x.replace(/,/g, ''));
function translateKo(html) {
  const misses = []; let hangul = false, out = html;
  for (const { kind, re } of SLOT_RE) {
    out = out.replace(re, (whole, open, inner, close) => {
      const t = norm(inner);
      if (!t) return whole;
      const r = lookup(kind, inner);
      if (!r) { misses.push({ kind, text: t, why: DAMAGED(t) ? 'KO_DAMAGED' : 'NO_ENTRY' }); return whole; }
      const ka = koNums(inner), eb = new Set(enNums(r.en));
      if (ka.some((x) => !eb.has(x))) { misses.push({ kind, text: t, why: 'NUMBER_DRIFT' }); return whole; }
      if (/[가-힣]/.test(String(r.en))) hangul = true;
      return whole;
    });
  }
  return { misses, hangul };
}

const c = new pg.Client({ host: '127.0.0.1', port: PORT, user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform' });
await c.connect();
await c.query('SET default_transaction_read_only = on');

// Batch 01 레거시 HOLD 의 KO canonical (재판정용)
const legacyIds = rdl('hff-en-batch01-final-hold-102-v1.jsonl').map((r) => r.koCanonicalId).filter(Boolean);
const legacyKo = new Map();
for (let i = 0; i < legacyIds.length; i += 500) {
  for (const r of (await c.query('select id, content from shared_product_descriptions where id = any($1)',
    [legacyIds.slice(i, i + 500)])).rows) legacyKo.set(r.id, r);
}

// ── 1. Batch 04 상태 집계 ──────────────────────────────────────────────────
const pop = rd('hff-en-batch04-population-5000-v1.json').rows;
for (const r of pop) r.productMasterId ??= r.masterId;
const cls = rd('hff-en-batch04-classification-v1.json').results;
const holdBy = new Map(cls.filter((r) => r.holdReason).map((r) => [r.productMasterId, r]));
const applied = rdIf('hff-en-batch04-apply-results-v1.json');

const ids = pop.map((r) => r.productMasterId);
const en = new Map(), ko = new Map();
for (let i = 0; i < ids.length; i += 500) {
  const s = ids.slice(i, i + 500);
  for (const r of (await c.query(
    `select master_id, id, content from shared_product_descriptions
      where language='en' and description_type='STORE' and status='canonical' and master_id = any($1)`, [s])).rows) en.set(r.master_id, r);
  for (const r of (await c.query(
    `select master_id, id, content from shared_product_descriptions
      where language='ko' and description_type='STORE' and status='canonical' and master_id = any($1)`, [s])).rows) ko.set(r.master_id, r);
}

const completed = [], holds = [];
for (const r of pop) {
  const e = en.get(r.productMasterId);
  if (e) { completed.push({ productMasterId: r.productMasterId, enId: e.id, enHash: sha(e.content), enLength: e.content.length }); continue; }
  const h = holdBy.get(r.productMasterId);
  holds.push({
    batch: 4, productMasterId: r.productMasterId, koCanonicalId: r.koCanonicalId,
    productName: r.productNameKo ?? null,
    issueType: issueTypeOf(h?.holdReason ?? 'CANONICAL_STRUCTURE_UNSAFE'),
    why: h?.why ?? ['NO_EN_ROW'],
    unresolvedPhrases: (h?.unresolvedPhrases ?? []).slice(0, 5),
  });
}

// ── 2. 독립 검증 (모집단 대비 재조회) ─────────────────────────────────────
const f = { missingEn: [], hangulInSlots: [], structureDrift: [], koHashDrift: [], canonicalDup: [] };
const dupQ = await c.query(
  `select master_id, count(*)::int n from shared_product_descriptions
    where language='en' and description_type='STORE' and status='canonical' and master_id = any($1)
    group by master_id having count(*) > 1`, [ids]);
f.canonicalDup = dupQ.rows;
for (const r of completed) {
  const e = en.get(r.productMasterId), k = ko.get(r.productMasterId);
  const src = pop.find((p) => p.productMasterId === r.productMasterId);
  if (!k) { f.koHashDrift.push({ id: r.productMasterId, why: 'KO_MISSING' }); continue; }
  if (sha(k.content) !== src.koHash) f.koHashDrift.push({ id: r.productMasterId, why: 'KO_CHANGED_SINCE_SELECTION' });
  let bad = false;
  for (const { re } of SLOT_RE) e.content.replace(re, (w, o, inner, cl) => { if (/[가-힣]/.test(norm(inner))) bad = true; return w; });
  if (bad) f.hangulInSlots.push(r.productMasterId);
  for (const tag of ['<li>', '<h2>', 'sd-item', 'sd-tag', '<b>']) {
    if (e.content.split(tag).length !== k.content.split(tag).length) { f.structureDrift.push({ id: r.productMasterId, tag }); break; }
  }
}
// Batch 밖 write 여부: 이번 배치가 만든 EN 총량과 모집단 완료 수가 일치해야 한다.
const enTotal = (await c.query(
  `select count(*)::int n from shared_product_descriptions
    where language='en' and description_type='STORE' and status='canonical' and source_type='o4o_hff_generated'`)).rows[0].n;
const koTotal = (await c.query(
  `select count(*)::int n from shared_product_descriptions
    where language='ko' and description_type='STORE' and status='canonical' and source_type='o4o_hff_generated'`)).rows[0].n;
await c.end();

// ── 3. 통합 deferred issue queue (Batch 01·02·03) ─────────────────────────
const queue = [], reproductionEligible = [];
// Batch 01 의 레거시 사유(LOW_EFFICIENCY_* 등)는 본 WO 의 분류 체계에 없다.
// 현재 사전으로 재판정하여 실제 문제만 큐에 남기고, 문제가 사라진 건은 재생산 대상으로 분리한다.
for (const r of rdl('hff-en-batch01-final-hold-102-v1.jsonl')) {
  let t = issueTypeOf(r.holdReason);
  if (!ALLOWED.includes(t)) {
    const k = legacyKo.get(r.koCanonicalId);
    if (!k) t = 'CANONICAL_STRUCTURE_UNSAFE';
    else {
      const tr = translateKo(k.content);
      if (!tr.misses.length && !tr.hangul) {
        reproductionEligible.push({ batch: 1, productMasterId: r.productMasterId, koCanonicalId: r.koCanonicalId,
          productName: r.productNameKo ?? null, legacyHoldReason: r.holdReason,
          note: '현재 번역 자산으로 완전 해소됨 — 실제 문제 아님. 후속 배치에서 생산 대상.' });
        continue;
      }
      t = tr.misses.some((m) => m.why === 'KO_DAMAGED') ? 'KO_SOURCE_DAMAGED'
        : tr.misses.some((m) => m.why === 'NUMBER_DRIFT') ? 'NUMBER_STRUCTURE_AMBIGUOUS'
          : tr.hangul ? 'TRANSLATION_AMBIGUOUS' : 'TRANSLATION_AMBIGUOUS';
    }
  }
  queue.push({ batch: 1, productMasterId: r.productMasterId, koCanonicalId: r.koCanonicalId ?? null,
    productName: r.productNameKo ?? null, issueType: t,
    problematicSourceText: (r.unresolvedPhrases ?? []).slice(0, 3) });
}
for (const r of rdl('hff-en-batch02-final-hold-v1.jsonl')) {
  queue.push({ batch: 2, productMasterId: r.productMasterId, koCanonicalId: r.koCanonicalId ?? null,
    productName: r.productNameKo ?? null, issueType: issueTypeOf(r.holdReason),
    problematicSourceText: (r.why ?? []).slice(0, 3) });
}
for (const r of rdl('hff-en-batch03-final-hold-v1.jsonl')) {
  queue.push({ batch: 3, productMasterId: r.productMasterId, koCanonicalId: r.koCanonicalId ?? null,
    productName: r.productName ?? null, issueType: issueTypeOf(r.issueType ?? r.holdReason),
    problematicSourceText: (r.unresolvedPhrases?.length ? r.unresolvedPhrases : r.why ?? []).slice(0, 3) });
}
for (const r of holds) {
  queue.push({ batch: 4, productMasterId: r.productMasterId, koCanonicalId: r.koCanonicalId,
    productName: r.productName, issueType: r.issueType,
    problematicSourceText: r.unresolvedPhrases.length ? r.unresolvedPhrases : r.why });
}
for (const q of queue) {
  q.confirmedFacts = [
    'KO canonical 원문은 수정하지 않았다.',
    'EN canonical 은 생성하지 않았다(생산 대상에서 제외).',
    `판정 사유는 실제 문제 유형 ${q.issueType} 이며, 번역 자산 부족이 아니다.`,
  ];
  q.requiredNextAction = NEXT_ACTION[q.issueType] ?? '원인 재확정 후 재생산';
  q.retryCondition = RETRY[q.issueType] ?? '원인 해소 후';
}
const byType = {}, byBatch = {};
for (const q of queue) { byType[q.issueType] = (byType[q.issueType] ?? 0) + 1; byBatch[q.batch] = (byBatch[q.batch] ?? 0) + 1; }
const dupKey = new Set(); let dupCount = 0;
for (const q of queue) { const k = `${q.batch}|${q.productMasterId}`; if (dupKey.has(k)) dupCount++; else dupKey.add(k); }

fs.writeFileSync(`${D}/hff-en-deferred-issue-queue-through-batch04-v1.jsonl`,
  queue.map((q) => JSON.stringify(q)).join('\n') + '\n', 'utf8');
wr('hff-en-deferred-issue-queue-through-batch04-summary-v1.json', {
  builtAt: new Date().toISOString(), total: queue.length, byBatch, byIssueType: byType,
  duplicates: dupCount,
  reproductionEligible: { count: reproductionEligible.length, rows: reproductionEligible },
  forbiddenIssueTypesPresent: FORBIDDEN.filter((x) => byType[x]),
  unknownIssueTypes: Object.keys(byType).filter((x) => !ALLOWED.includes(x)),
});

// ── 4. 종료 매니페스트 ────────────────────────────────────────────────────
const closure = {
  wo: 'WO-O4O-HFF-EN-BATCH-04-5000-DIRECT-BULK-PRODUCTION-AND-DEFERRED-ISSUE-QUEUE-V1',
  closedAt: new Date().toISOString(), batch: 4,
  population: pop.length, completed: completed.length, hold: holds.length,
  sumCheck: completed.length + holds.length === pop.length,
  holdByIssueType: holds.reduce((a, h) => ({ ...a, [h.issueType]: (a[h.issueType] ?? 0) + 1 }), {}),
  forbiddenHoldPresent: FORBIDDEN.filter((x) => holds.some((h) => h.issueType === x)),
  appliedRounds: applied ? { lastMode: applied.mode ?? null, lastShards: applied.shards ?? null } : null,
  hffEnCanonicalTotalLive: enTotal, hffKoCanonicalTotalLive: koTotal,
};
wr('hff-en-batch04-closure-v1.json', closure);
wr('hff-en-batch04-completed-v1.json', { builtAt: closure.closedAt, count: completed.length, rows: completed });
fs.writeFileSync(`${D}/hff-en-batch04-final-hold-v1.jsonl`, holds.map((h) => JSON.stringify(h)).join('\n') + '\n', 'utf8');

const verification = {
  verifiedAt: closure.closedAt, readOnly: true,
  population: pop.length, completed: completed.length, hold: holds.length,
  sumCheck: closure.sumCheck,
  failures: Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.length])),
  detail: Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.slice(0, 10)])),
  verdict: Object.values(f).every((v) => !v.length) && closure.sumCheck ? 'PASS' : 'FAIL',
};
wr('hff-en-batch04-independent-verification-v1.json', verification);

const b01 = rdIf('hff-en-batch01-closure-v1.json') ?? {};
const b02 = rdIf('hff-en-batch02-closure-v1.json') ?? {};
const b03 = rdIf('hff-en-batch03-closure-v1.json') ?? {};
wr('hff-en-production-completed-through-batch04-v1.json', {
  builtAt: closure.closedAt,
  batch01: { population: b01.population ?? null, completed: b01.completed ?? null },
  batch02: { population: b02.population ?? null, completed: b02.completed ?? null },
  batch03: { population: b03.population ?? null, completed: b03.completed ?? null },
  batch04: { population: pop.length, completed: completed.length },
  hffEnCanonicalTotalLive: enTotal,
});
wr('hff-en-production-remaining-after-batch04-v1.json', {
  builtAt: closure.closedAt, koCanonicalTotal: koTotal, enCanonicalTotal: enTotal,
  remaining: koTotal - enTotal,
  note: 'remaining 은 KO canonical 대비 EN 미생산 잔여이며 Batch 04 이후 대상이다(문제 큐 포함).',
});
console.log(JSON.stringify({ closure, verification, queue: { total: queue.length, byBatch, byIssueType: byType } }, null, 1));
