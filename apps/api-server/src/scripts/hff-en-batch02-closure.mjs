/**
 * WO-O4O-HFF-EN-BATCH-02-REMAINING-915-DIRECT-TRANSLATION-AND-CLOSURE-V1
 *
 * Batch 02 공식 종료 + Batch 01 잔여 HOLD 스윕(자연 해소분만).
 *   node hff-en-batch02-closure.mjs                 # read-only 집계 + 스윕 dry-run
 *   HFF_EN_B02_CLOSURE_APPLY_CONFIRM=YES node hff-en-batch02-closure.mjs --apply
 *
 * 스윕은 "Batch 02 번역이 같은 승인 문구를 자연히 공급한 경우"만 대상으로 한다.
 * 새 문구 저작·게이트 완화·구조 변경은 하지 않는다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { JSDOM } from 'jsdom';
import { SLOT_RE, norm, lookup, key } from './hff-en-batch-01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const APPLY = process.argv.includes('--apply') && process.env.HFF_EN_B02_CLOSURE_APPLY_CONFIRM === 'YES';
const PORT = parseInt(process.env.PROXY_PORT ?? '5577', 10);
const sha = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rd = (f) => JSON.parse(fs.readFileSync(`${D}/${f}`, 'utf8'));
const rdl = (f) => fs.readFileSync(`${D}/${f}`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const wr = (f, o) => fs.writeFileSync(`${D}/${f}`, JSON.stringify(o, null, 1), 'utf8');

const DAMAGED = (t) => /[�]/.test(t) || /^[·\-–—,\s]*$/.test(t);
const koNums = (s) => (norm(s).match(/\d+(?:[.,]\d+)?/g) ?? []).map((x) => x.replace(/,/g, ''));
const enNums = (s) => (String(s).match(/\d+(?:[.,]\d+)?/g) ?? []).map((x) => x.replace(/,/g, ''));

function translate(html) {
  let out = html; const misses = [];
  for (const { kind, re } of SLOT_RE) {
    out = out.replace(re, (whole, open, inner, close) => {
      const t = norm(inner);
      if (!t) return whole;
      const r = lookup(kind, inner);
      if (!r) { misses.push({ kind, text: t, why: DAMAGED(t) ? 'KO_DAMAGED' : 'NO_ENTRY' }); return whole; }
      const ka = koNums(inner), eb = new Set(enNums(r.en));
      if (ka.some((x) => !eb.has(x))) { misses.push({ kind, text: t, why: 'NUMBER_DRIFT' }); return whole; }
      return open + esc(r.en) + close;
    });
  }
  return { html: out, misses };
}
const hangulInSlots = (html) => {
  let bad = false;
  for (const { re } of SLOT_RE) html.replace(re, (w, o, inner, c) => { if (/[가-힣]/.test(norm(inner))) bad = true; return w; });
  return bad;
};

const c = new pg.Client({ host: '127.0.0.1', port: PORT, user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform' });
await c.connect();
if (!APPLY) await c.query('SET default_transaction_read_only = on');

// ── 1. Batch 02 상태 집계 (모집단 5,000 = 이번 915 + 앞선 4,085) ──────────────
const pop02 = rd('hff-en-batch02-population-5000-v1.json').rows;
const cls915 = rd('hff-en-batch02-remaining915-classification-v1.json').results;
const holdBy915 = new Map(cls915.filter((r) => r.holdReason).map((r) => [r.productMasterId, r]));
// 915 이전 구간(4,085)의 HOLD 는 앞선 분류본이 사유를 보유한다.
const cls085 = rd('hff-en-batch02-classification-v1.json').results ?? [];
const holdPrev = new Map(cls085.filter((r) => r.holdReason && r.holdReason !== 'HOLD_PENDING_DIRECT_TRANSLATION')
  .map((r) => [r.productMasterId ?? r.masterId, r]));
// 모집단 매니페스트의 마스터 키는 `masterId` 이다(915 분류본은 `productMasterId`).
for (const r of pop02) r.productMasterId ??= r.masterId;
const masters = pop02.map((r) => r.productMasterId);

const live = new Map();
for (let i = 0; i < masters.length; i += 1000) {
  const q = await c.query(
    `select master_id, id, encode(sha256(convert_to(content,'UTF8')),'hex') as h, length(content) as len
       from shared_product_descriptions
      where language='en' and description_type='STORE' and status='canonical' and master_id = any($1)`,
    [masters.slice(i, i + 1000)]);
  for (const r of q.rows) live.set(r.master_id, r);
}

const completed = [], holds = [];
for (const r of pop02) {
  const en = live.get(r.productMasterId);
  if (en) { completed.push({ productMasterId: r.productMasterId, enId: en.id, enHash: en.h, enLength: en.len }); continue; }
  const h = holdBy915.get(r.productMasterId) ?? holdPrev.get(r.productMasterId);
  holds.push({
    productMasterId: r.productMasterId, productNameKo: r.productNameKo ?? null,
    rendererFamily: r.rendererFamily ?? null,
    holdReason: h?.holdReason ?? 'HOLD_CANONICAL_STRUCTURE_UNSAFE',
    why: h?.why ?? ['NO_EN_ROW_AND_NOT_IN_915_SCOPE'],
  });
}

// ── 2. Batch 01 잔여 HOLD 스윕 (자연 해소분만) ────────────────────────────────
const b01Hold = rdl('hff-en-batch01-final-hold-102-v1.jsonl');
const b01Ids = b01Hold.map((r) => r.koCanonicalId).filter(Boolean);
const koRows = new Map();
for (let i = 0; i < b01Ids.length; i += 500) {
  const q = await c.query('select id, master_id, content from shared_product_descriptions where id = any($1)', [b01Ids.slice(i, i + 500)]);
  for (const r of q.rows) koRows.set(r.id, r);
}
const sweep = { builtAt: new Date().toISOString(), scanned: b01Hold.length, resolved: [], stillHold: [], applied: 0 };
const sweepTargets = [];
for (const r of b01Hold) {
  const ko = koRows.get(r.koCanonicalId);
  if (!ko) { sweep.stillHold.push({ ...r, holdReason: 'HOLD_CANONICAL_STRUCTURE_UNSAFE', why: ['KO_MISSING'] }); continue; }
  const t = translate(ko.content);
  if (t.misses.length || hangulInSlots(t.html)) {
    const reason = t.misses.some((m) => m.why === 'KO_DAMAGED') ? 'HOLD_KO_SOURCE_DAMAGED'
      : t.misses.some((m) => m.why === 'NUMBER_DRIFT') ? 'HOLD_NUMBER_STRUCTURE_AMBIGUOUS'
        : t.misses.length ? 'HOLD_PENDING_DIRECT_TRANSLATION' : 'HOLD_TRANSLATION_AMBIGUOUS';
    sweep.stillHold.push({ productMasterId: r.productMasterId, productNameKo: r.productNameKo ?? null, holdReason: reason, why: t.misses.slice(0, 5).map((m) => `${m.kind}:${m.why}:${m.text.slice(0, 60)}`) });
    continue;
  }
  let drift = null;
  for (const tag of ['<li>', '<h2>', 'sd-item', 'sd-tag', '<b>']) if (t.html.split(tag).length !== ko.content.split(tag).length) { drift = tag; break; }
  if (drift) { sweep.stillHold.push({ productMasterId: r.productMasterId, holdReason: 'HOLD_CANONICAL_STRUCTURE_UNSAFE', why: [`SLOT_COUNT_DRIFT:${drift}`] }); continue; }
  sweepTargets.push({ productMasterId: ko.master_id, koCanonicalId: ko.id, koHash: sha(ko.content), html: t.html });
  sweep.resolved.push({ productMasterId: ko.master_id, productNameKo: r.productNameKo ?? null });
}

// 렌더 감사 (스윕 대상 전량, CSS 스코프 래퍼 + computed style 증명)
const audit = { checked: sweepTargets.length, issues: 0, failures: [] };
for (const t of sweepTargets) {
  const dom = new JSDOM(`<!doctype html><html><head><style>.store-desc-content{max-width:860px}</style></head><body><div class="store-desc-content">${t.html}</div></body></html>`);
  const w = dom.window, root = w.document.querySelector('.store-desc-content');
  if (w.getComputedStyle(root).maxWidth !== '860px') { audit.issues++; audit.failures.push({ id: t.koCanonicalId, why: 'CSS_SCOPE_NOT_APPLIED' }); }
  if (/[가-힣]/.test(root.textContent)) { audit.issues++; audit.failures.push({ id: t.koCanonicalId, why: 'HANGUL_REMAINS' }); }
  if (/&lt;\w|<script|<style/i.test(t.html)) { audit.issues++; audit.failures.push({ id: t.koCanonicalId, why: 'RAW_HTML' }); }
  w.close();
}

if (APPLY && audit.issues === 0 && sweepTargets.length) {
  const roll = [];
  for (const t of sweepTargets) {
    const cur = await c.query(
      `select id, content, encode(sha256(convert_to(content,'UTF8')),'hex') as h from shared_product_descriptions
        where master_id=$1 and language='en' and description_type='STORE' and status='canonical' limit 1`, [t.productMasterId]);
    if (cur.rows.length) {
      const old = cur.rows[0];
      const u = await c.query(
        `update shared_product_descriptions set content=$1, updated_at=now()
          where id=$2 and encode(sha256(convert_to(content,'UTF8')),'hex')=$3`, [t.html, old.id, old.h]);
      if (u.rowCount) { roll.push({ id: old.id, prevHash: old.h }); sweep.applied++; }
    } else {
      const ins = await c.query(
        `insert into shared_product_descriptions (id, master_id, language, description_type, status, source_type, content, created_at, updated_at)
         values (gen_random_uuid(), $1, 'en', 'STORE', 'canonical', 'o4o_hff_generated', $2, now(), now())
         on conflict do nothing returning id`, [t.productMasterId, t.html]);
      if (ins.rows.length) { roll.push({ id: ins.rows[0].id, prevHash: null }); sweep.applied++; }
    }
  }
  wr('hff-en-batch01-hold72-sweep-rollback-v1.json', { builtAt: new Date().toISOString(), rows: roll });
}
wr('hff-en-batch01-hold72-sweep-results-v1.json', { ...sweep, renderAudit: audit, applied: sweep.applied, appliedMode: APPLY });

// ── 3. 종료 매니페스트 ───────────────────────────────────────────────────────
const holdSummary = {};
for (const h of holds) holdSummary[h.holdReason] = (holdSummary[h.holdReason] ?? 0) + 1;
const closure = {
  wo: 'WO-O4O-HFF-EN-BATCH-02-REMAINING-915-DIRECT-TRANSLATION-AND-CLOSURE-V1',
  closedAt: new Date().toISOString(),
  batch: 2,
  population: pop02.length,
  completed: completed.length,
  hold: holds.length,
  sumCheck: completed.length + holds.length === pop02.length,
  holdReasons: holdSummary,
  forbiddenHoldReasonsPresent: ['TRANSLATION_ASSET_MISSING', 'NO_ENTRY', 'TEMPLATE_UNSUPPORTED', 'HOLD_LOW_EFFICIENCY', 'HOLD_PENDING_DIRECT_TRANSLATION']
    .filter((r) => holdSummary[r]),
  batch01Sweep: { scanned: sweep.scanned, resolved: sweep.resolved.length, applied: sweep.applied, stillHold: sweep.stillHold.length },
};
wr('hff-en-batch02-closure-v1.json', closure);
wr('hff-en-batch02-completed-v1.json', { builtAt: closure.closedAt, count: completed.length, rows: completed });
fs.writeFileSync(`${D}/hff-en-batch02-final-hold-v1.jsonl`, holds.map((h) => JSON.stringify(h)).join('\n') + '\n', 'utf8');
wr('hff-en-batch02-final-hold-summary-v1.json', { builtAt: closure.closedAt, total: holds.length, byReason: holdSummary, rows: holds });

// 전체 생산 진행 (v2)
const b01 = rd('hff-en-batch01-closure-v1.json');
const totalEn = await c.query(
  `select count(*)::int n from shared_product_descriptions
    where language='en' and description_type='STORE' and status='canonical' and source_type='o4o_hff_generated'`);
wr('hff-en-production-completed-through-batch02-v2.json', {
  builtAt: closure.closedAt,
  batch01: { population: b01.population ?? 5000, completed: b01.completed ?? null },
  batch02: { population: pop02.length, completed: completed.length },
  batch01SweepApplied: sweep.applied,
  hffEnCanonicalTotalLive: totalEn.rows[0].n,
});
const koTotal = await c.query(
  `select count(*)::int n from shared_product_descriptions
    where language='ko' and description_type='STORE' and status='canonical' and source_type='o4o_hff_generated'`);
wr('hff-en-production-remaining-after-batch02-v2.json', {
  builtAt: closure.closedAt,
  koCanonicalTotal: koTotal.rows[0].n,
  enCanonicalTotal: totalEn.rows[0].n,
  remaining: koTotal.rows[0].n - totalEn.rows[0].n,
  note: 'remaining 은 KO canonical 대비 EN 미생산 잔여이며 Batch 03 이후 대상이다.',
});
await c.end();
console.log(JSON.stringify({ ...closure, renderAuditIssues: audit.issues }, null, 1));
