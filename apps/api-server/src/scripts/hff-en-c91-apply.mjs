/**
 * WO-O4O-HFF-EN-C91-FUNCTIONAL-CLAIM-LOSS-4802-FULL-REPAIR-V1 §6·§7
 *
 * 기능성 복원 **UPDATE 전용**. 대상은 repair plan 이 확정한 문서뿐이다.
 *   - 이중 게이트: `--apply` + HFF_EN_C91_APPLY_CONFIRM=YES
 *   - 낙관적 잠금: 저장된 EN 본문 해시가 survey 시점과 같을 때만 갱신
 *   - KO·ZH·JA·ProductMaster 는 쓰지 않는다. INSERT 0.
 *   - §6 검증을 **적용 전에 전량 통과**해야 한다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const WO = 'WO-O4O-HFF-EN-C91-FUNCTIONAL-CLAIM-LOSS-4802-FULL-REPAIR-V1';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const plan = JSON.parse(fs.readFileSync(`${CACHE}/hff-en-c91-plan.json`, 'utf8'));
if (!plan.length) { console.error('NO_PLAN'); process.exit(1); }

const APPLY = process.argv.includes('--apply') && process.env.HFF_EN_C91_APPLY_CONFIRM === 'YES';
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5541', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
await c.connect();

const globals = async () => (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='ja' AND source_type='o4o_hff_generated') ja_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='zh' AND source_type='o4o_hff_generated') zh_canon,
    (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm_hff`)).rows[0];
const before = await globals();

/* ── 현재 EN 본문을 읽어 교체문을 만들고 §6 검증 ───────────────── */
const ids = plan.map((p) => p.enId);
const cur = new Map();
for (let i = 0; i < ids.length; i += 2000) {
  for (const r of (await c.query(`SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`, [ids.slice(i, i + 2000)])).rows) cur.set(r.id, r.content);
}

const cnt = (h, re) => (h.match(re) ?? []).length;
const NUM = /(?<![A-Za-z0-9])\d+(?:[.,]\d+)*\s*(?:억|만|천)?\s*(?:mg|g|㎎|kg|ug|㎍|μg|mcg|IU|kcal|mL|ml|㎖|L|CFU|cfu|%)/gi;
const bag = (s) => { const m = new Map(); for (const x of (String(s).match(NUM) ?? [])) m.set(x.replace(/[,\s]/g, '').toLowerCase(), (m.get(x.replace(/[,\s]/g, '').toLowerCase()) ?? 0) + 1); return m; };
const PARITY = [[/<li[ >]/g, 'li'], [/<h2[ >]/g, 'h2'], [/sd-item/g, 'sd-item'], [/sd-tag/g, 'sd-tag'], [/<b>/g, 'b'], [/<ul[ >]/g, 'ul'], [/<p[ >]/g, 'p']];
/* 영어 위생 — 실측된 사고만. 조사·구두점 중복, 문장 경계 소실. */
const ENG_BAD = [[/;\s*;/, 'DOUBLE_SEMI'], [/\.\s*\./, 'DOUBLE_DOT'], [/\b(\w+)\s+\1\b/i, 'DOUBLE_WORD'], [/[a-z][A-Z]/, 'CONCAT'], [/;\s*\./, 'SEMI_DOT']];

const ready = [], rejected = [];
const diff = { missingSource: 0, contentDrift: 0, replaceFail: 0, numericDrift: 0, structureDiff: 0, hangul: 0, engBad: 0, claimNotAdded: 0 };
for (const p of plan) {
  const old = cur.get(p.enId);
  if (old === undefined) { diff.missingSource++; rejected.push({ m: p.productMasterId, why: 'MISSING' }); continue; }
  if (sha(old) !== p.enHash) { diff.contentDrift++; rejected.push({ m: p.productMasterId, why: 'EN_DRIFT' }); continue; }
  /* 슬롯을 **인덱스와 오프셋**으로 특정해 치환한다. 정규화 텍스트로 literal replace 하면
     슬롯 안에 인라인 태그(`<b>`)가 있을 때 원문과 일치하지 않아 실패한다(실측 920건). */
  const SLOT_RE = /<li[^>]*>([\s\S]*?)<\/li>|<div class="sd-item"[^>]*>([\s\S]*?)<\/div>/g;
  const spans = [];
  for (const m of old.matchAll(SLOT_RE)) {
    const inner = m[1] ?? m[2] ?? '';
    const start = m.index + m[0].indexOf(inner);
    spans.push({ inner, start, end: start + inner.length });
  }
  let next = old, failed = false;
  /* 뒤에서부터 치환해야 앞 오프셋이 밀리지 않는다. */
  for (const e of [...p.edits].sort((a, b) => b.slot - a.slot)) {
    const sp = spans[e.slot];
    if (!sp) { failed = true; break; }
    /* 인라인 태그가 있는 슬롯은 텍스트만 안전히 갈아끼울 수 없다 — 후속 처리로 남긴다. */
    if (/</.test(sp.inner)) { failed = true; break; }
    if (sp.inner.replace(/\s+/g, ' ').trim() !== e.from) { failed = true; break; }
    next = next.slice(0, sp.start) + e.to + next.slice(sp.end);
  }
  if (failed) { diff.replaceFail++; rejected.push({ m: p.productMasterId, why: 'REPLACE_FAIL' }); continue; }
  /* 수치 보존 */
  const ob = bag(old), nb = bag(next); let nd = false;
  for (const [k, v] of ob) if ((nb.get(k) ?? 0) < v) nd = true;
  if (nd) { diff.numericDrift++; rejected.push({ m: p.productMasterId, why: 'NUMERIC_DRIFT' }); continue; }
  /* 구조 보존 */
  let sd = false;
  for (const [re] of PARITY) if (cnt(old, re) !== cnt(next, re)) sd = true;
  if (sd) { diff.structureDiff++; rejected.push({ m: p.productMasterId, why: 'STRUCTURE_DIFF' }); continue; }
  /* 한글 증가 금지 */
  if (cnt(next, /[가-힣]/g) > cnt(old, /[가-힣]/g)) { diff.hangul++; rejected.push({ m: p.productMasterId, why: 'HANGUL_INCREASE' }); continue; }
  /* 영어 위생 — 교체 구간만 본다 */
  const bad = p.edits.map((e) => ENG_BAD.find(([re]) => re.test(e.to))).find(Boolean);
  if (bad) { diff.engBad++; rejected.push({ m: p.productMasterId, why: `ENG_${bad[1]}` }); continue; }
  /* 절이 실제로 늘었는가 */
  if (cnt(next, /;/g) <= cnt(old, /;/g)) { diff.claimNotAdded++; rejected.push({ m: p.productMasterId, why: 'CLAIM_NOT_ADDED' }); continue; }
  ready.push({ enId: p.enId, m: p.productMasterId, old, next, oldHash: p.enHash });
}

fs.writeFileSync(`${D}/hff-en-c91-rollback-v1.json`, JSON.stringify({
  wo: WO, preparedAt: new Date().toISOString(),
  rollback: 'UPDATE 전용. 되돌리기는 아래 rows 의 old 를 같은 enId 에 다시 써 넣는 것이다.',
  before, rows: ready.map((r) => ({ enId: r.enId, productMasterId: r.m, oldHash: r.oldHash, old: r.old })),
}, null, 1));

const head = { wo: WO, at: new Date().toISOString(), planned: plan.length, ready: ready.length, rejected: rejected.length, rejectedByWhy: diff, before };
if (!APPLY) {
  fs.writeFileSync(`${D}/hff-en-c91-apply-result-v1.json`, JSON.stringify({ ...head, mode: 'DRY_RUN' }, null, 1));
  console.log(JSON.stringify({ ...head, mode: 'DRY_RUN', rejectedSample: rejected.slice(0, 8) }, null, 2));
  await c.end(); process.exit(0);
}

const startedAt = new Date().toISOString();
const updated = [], skipped = [], failed = [];
for (let i = 0; i < ready.length; i += 300) {
  const chunk = ready.slice(i, i + 300);
  try {
    await c.query('BEGIN');
    for (const r of chunk) {
      const q = await c.query(`
        UPDATE shared_product_descriptions SET content=$1, updated_at=now()
         WHERE id=$2 AND language='en' AND description_type='STORE' AND status='canonical'
           AND source_type='o4o_hff_generated' AND deleted_at IS NULL
           AND encode(sha256(convert_to(content,'UTF8')),'hex') = $3 RETURNING id`,
      [r.next, r.enId, r.oldHash]);
      if (q.rowCount === 1) updated.push(r.enId); else skipped.push({ m: r.m, why: 'CONTENT_DRIFT' });
    }
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK'); failed.push({ shard: i, error: String(e.message ?? e) }); }
}
const after = await globals();
const out = {
  ...head, startedAt, appliedAt: new Date().toISOString(), mode: 'APPLY',
  expectedUpdate: ready.length, actualUpdate: updated.length,
  expectedInsert: 0, actualInsert: after.en_canon - before.en_canon,
  skipped: skipped.length, failedShards: failed.length, after,
  koUnchanged: before.ko_canon === after.ko_canon, jaUnchanged: before.ja_canon === after.ja_canon,
  zhUnchanged: before.zh_canon === after.zh_canon, pmUnchanged: before.pm_hff === after.pm_hff,
  enCountUnchanged: before.en_canon === after.en_canon,
  expectedEqualsActual: updated.length === ready.length && !skipped.length && !failed.length && before.en_canon === after.en_canon,
  updatedIds: updated,
};
fs.writeFileSync(`${D}/hff-en-c91-apply-result-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, updatedIds: undefined }, null, 2));
await c.end();
