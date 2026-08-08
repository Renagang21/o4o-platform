/**
 * WO-O4O-HFF-EN-C01-… — 색 점박이 표현 교정 (사후 교정 패스)
 *
 * 1차 적용에서 `하얀색 점박이가 있는 노란 하얀색의 분말` 이
 * `A white yellow white speckled powder` 로 나갔다 — 점박이의 색과 바탕색이 한 덩어리로
 * 뭉개져 색이 셋으로 읽힌다(실측 314 문서). 엔진을 고친 뒤 **그 문서만** 되돌려 고친다.
 *
 * 단계:
 *   `--plan`  : 지금 DB 에 들어간 문구(구 엔진 출력)를 기록한다. **엔진 수정 전에** 돌린다.
 *   (엔진 수정)
 *   `--apply` : 기록해 둔 문구를 새 문구로 바꾼다. 정확히 1회 등장할 때만 교체한다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { translateSlot } from './hff-en-c01-translate.mjs';
import { SEC, HANGUL, norm } from './hff-en-c01-lib.mjs';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const WO = 'WO-O4O-HFF-EN-C01-LABELLED-STANDARD-40896-FULL-TRANSLATION-REPAIR-V1';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const PLAN = process.env.C01_FIX_PLAN ?? `${CACHE}/hff-en-c01-speckle-plan.json`;
const RESULT = process.env.C01_FIX_RESULT ?? 'hff-en-c01-speckle-result-v1.json';
/** 교정 대상 슬롯 필터. `ALL` 이면 적용된 문서의 모든 슬롯을 다시 계산한다. */
const PATTERN = process.env.C01_FIX_PATTERN === 'ALL' ? /(?:)/ : /[가-힣]색\s*점박이/;

const targets = JSON.parse(fs.readFileSync(`${CACHE}/hff-en-c01-slots.json`, 'utf8'));
const updated = new Set(JSON.parse(fs.readFileSync(`${CACHE}/hff-en-c01-updated-ids.json`, 'utf8')));

if (process.argv.includes('--plan')) {
  const plan = [];
  for (const t of targets) {
    if (!updated.has(t.enId)) continue;
    const hits = t.hits.filter((h) => PATTERN.test(h.inner));
    if (!hits.length) continue;
    const items = [];
    for (const h of hits) { const r = translateSlot(h.inner); if (r.ok) items.push({ ko: h.inner, oldEn: r.en }); }
    if (items.length) plan.push({ enId: t.enId, productMasterId: t.productMasterId, items });
  }
  fs.writeFileSync(PLAN, JSON.stringify(plan, null, 1));
  console.log(JSON.stringify({ mode: 'PLAN', documents: plan.length, slots: plan.reduce((a, x) => a + x.items.length, 0) }, null, 1));
  process.exit(0);
}

const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
const APPLY = process.argv.includes('--apply') && process.env.HFF_EN_C01_APPLY_CONFIRM === 'YES';
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5621', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
await c.connect();
const ids = plan.map((p) => p.enId);
const cur = new Map();
for (let i = 0; i < ids.length; i += 2000) {
  for (const r of (await c.query(`SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`, [ids.slice(i, i + 2000)])).rows) cur.set(r.id, r.content);
}


/**
 * 기록해 둔 문구를 못 찾을 때 쓰는 닻 교체.
 * 점박이 표현은 섹션 안에서 `speckled` 를 포함한 `sd-item` 이 **정확히 하나**일 때만 바꾼다.
 * 그 밖의 경우는 손대지 않는다(null 반환 → 그 문서는 거부).
 */
function anchorReplace(content, ko, newEn) {
  if (!/점박이/.test(ko)) return null;
  const m = SEC.exec(content);
  if (!m) return null;
  const items = [...m[1].matchAll(/<div class="sd-item"[^>]*>([\s\S]*?)<\/div>/g)].filter((x) => /speckled/.test(x[1]));
  if (items.length !== 1) return null;
  const inner = items[0][1];
  if (content.split(inner).length - 1 !== 1) return null;
  return content.replace(inner, newEn);
}

const ready = [], rejected = [];
const diff = { missing: 0, oldNotFound: 0, oldNotUnique: 0, retranslateFailed: 0, noChange: 0, anchored: 0, hangulLeft: 0, structureDiff: 0, otherAreaChanged: 0 };
const samples = [];
const cnt = (h, re) => (h.match(re) ?? []).length;
for (const p of plan) {
  const old = cur.get(p.enId);
  if (old === undefined) { diff.missing++; continue; }
  let next = old, bad = '', changedItems = 0;
  for (const it of p.items) {
    const r = translateSlot(it.ko);
    if (!r.ok) { bad = 'retranslateFailed'; break; }
    /* 안 바뀐 슬롯은 그냥 넘어간다 — 문서 안의 다른 슬롯 교정까지 막으면 안 된다. */
    if (r.en === it.oldEn) continue;
    let occ = next.split(it.oldEn).length - 1;
    if (occ > 1) { bad = 'oldNotUnique'; break; }
    if (occ === 1) { next = next.replace(it.oldEn, r.en); }
    else {
      /* 기록해 둔 문구가 없다 — 그 사이 엔진이 더 바뀐 경우다.
         점박이 표현은 `speckled` 를 닻으로 삼아 **섹션 안에 하나뿐일 때만** 교체한다. */
      const anchored = anchorReplace(next, it.ko, r.en);
      if (!anchored) { bad = 'oldNotFound'; break; }
      next = anchored; diff.anchored++;
    }
    changedItems++;
    if (samples.length < 6) samples.push({ ko: norm(it.ko), from: it.oldEn, to: r.en });
  }
  if (bad) { diff[bad]++; rejected.push({ m: p.productMasterId, why: bad }); continue; }
  if (!changedItems) { diff.noChange++; continue; }
  const secNew = SEC.exec(next);
  if (!secNew || HANGUL.test(secNew[1])) { diff.hangulLeft++; rejected.push({ m: p.productMasterId, why: 'HANGUL' }); continue; }
  if (cnt(old, /<div class="sd-item"/g) !== cnt(next, /<div class="sd-item"/g) || cnt(old, /<b>/g) !== cnt(next, /<b>/g)) { diff.structureDiff++; rejected.push({ m: p.productMasterId, why: 'STRUCTURE' }); continue; }
  const strip = (s) => s.replace(SEC, '<SECTION/>');
  if (strip(old) !== strip(next)) { diff.otherAreaChanged++; rejected.push({ m: p.productMasterId, why: 'OTHER_AREA' }); continue; }
  ready.push({ enId: p.enId, m: p.productMasterId, next, oldHash: sha(old) });
}

const head = { wo: WO, at: new Date().toISOString(), planned: plan.length, ready: ready.length, rejected: rejected.length, rejectedByWhy: diff, samples };
if (!APPLY) {
  fs.writeFileSync(`${D}/${RESULT}`, JSON.stringify({ ...head, mode: 'DRY_RUN' }, null, 1));
  console.log(JSON.stringify({ ...head, mode: 'DRY_RUN' }, null, 1));
  await c.end(); process.exit(0);
}
const updatedIds = [], skipped = [], failed = [];
for (let i = 0; i < ready.length; i += 300) {
  try {
    await c.query('BEGIN');
    for (const r of ready.slice(i, i + 300)) {
      const q = await c.query(`UPDATE shared_product_descriptions SET content=$1, updated_at=now()
         WHERE id=$2 AND language='en' AND description_type='STORE' AND status='canonical'
           AND source_type='o4o_hff_generated' AND deleted_at IS NULL
           AND encode(sha256(convert_to(content,'UTF8')),'hex') = $3 RETURNING id`, [r.next, r.enId, r.oldHash]);
      if (q.rowCount === 1) updatedIds.push(r.enId); else skipped.push(r.m);
    }
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK'); failed.push({ shard: i, error: String(e.message ?? e) }); }
}
const out = { ...head, mode: 'APPLY', expectedUpdate: ready.length, actualUpdate: updatedIds.length, skipped: skipped.length, failedShards: failed.length, expectedEqualsActual: updatedIds.length === ready.length && !skipped.length && !failed.length };
fs.writeFileSync(`${D}/${RESULT}`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await c.end();
