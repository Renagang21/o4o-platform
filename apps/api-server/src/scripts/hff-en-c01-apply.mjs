/**
 * WO-O4O-HFF-EN-C01-LABELLED-STANDARD-40896-FULL-TRANSLATION-REPAIR-V1 — 검증 + 적용
 *
 * **UPDATE 전용**. 대상은 `Labelled standard` 섹션의 잔존이 **전부** 해소되는 문서뿐이다
 * (문서 단위 all-or-nothing). 일부만 바꾸면 한 섹션 안에 영어와 한글이 섞여 남으므로,
 * 손댄 문서는 반드시 섹션 전체가 영어가 되도록 한다. 나머지는 다음 사이클로 넘긴다.
 *
 * 이중 게이트: `--apply` + HFF_EN_C01_APPLY_CONFIRM=YES
 * 낙관적 잠금: 저장된 EN 본문 해시가 survey 시점과 같을 때만 갱신
 * KO·ZH·JA·ProductMaster 는 쓰지 않는다. INSERT 0.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { translateSlot, ROUNDS } from './hff-en-c01-translate.mjs';
import { SEC, HANGUL, norm, numericLoss } from './hff-en-c01-lib.mjs';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const WO = 'WO-O4O-HFF-EN-C01-LABELLED-STANDARD-40896-FULL-TRANSLATION-REPAIR-V1';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const targets = JSON.parse(fs.readFileSync(`${CACHE}/hff-en-c01-slots.json`, 'utf8'));

const APPLY = process.argv.includes('--apply') && process.env.HFF_EN_C01_APPLY_CONFIRM === 'YES';
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5611', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
await c.connect();
const globals = async () => (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='ja' AND source_type='o4o_hff_generated') ja_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='zh' AND source_type='o4o_hff_generated') zh_canon,
    (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm_hff`)).rows[0];
const before = await globals();

const cnt = (h, re) => (h.match(re) ?? []).length;
const PARITY = [[/<div class="sd-item"/g, 'sd-item'], [/<div class="sd-spec"/g, 'sd-spec'], [/<h2[ >]/g, 'h2'],
  [/<b>/g, 'b'], [/<\/b>/g, 'b-close'], [/<div[ >]/g, 'div'], [/<\/div>/g, 'div-close'],
  [/<li[ >]/g, 'li'], [/<p[ >]/g, 'p'], [/sd-tag/g, 'sd-tag'], [/sd-cta/g, 'sd-cta'], [/sd-foot/g, 'sd-foot']];
const HYGIENE = [[/\s{2,}/, 'DOUBLE_SPACE'], [/[:：]\s*[:：]/, 'DOUBLE_COLON'], [/<div class="sd-item"[^>]*>\s*<\/div>/, 'EMPTY_SLOT'], [/\(\s*\)/, 'EMPTY_PAREN'], [/,\s*,/, 'DOUBLE_COMMA']];

/* ── 현재 본문을 읽어 교체문을 만들고 검증 ─────────────────────── */
const ids = targets.map((t) => t.enId);
const cur = new Map();
for (let i = 0; i < ids.length; i += 3000) {
  for (const r of (await c.query(`SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`, [ids.slice(i, i + 3000)])).rows) cur.set(r.id, r.content);
}

const ready = [], rejected = [];
const diff = { missing: 0, enDrift: 0, notFullyResolved: 0, sliceMismatch: 0, structureDiff: 0, hangulLeft: 0, numericLoss: 0, hygiene: 0, otherAreaChanged: 0, sectionMissing: 0 };
const numericSamples = [], hygieneSamples = [];
for (const t of targets) {
  const old = cur.get(t.enId);
  if (old === undefined) { diff.missing++; rejected.push({ m: t.productMasterId, why: 'MISSING' }); continue; }
  if (sha(old) !== t.enHash) { diff.enDrift++; rejected.push({ m: t.productMasterId, why: 'EN_DRIFT' }); continue; }
  /* 문서 단위 all-or-nothing */
  const outs = t.hits.map((h) => ({ h, r: translateSlot(h.inner) }));
  if (outs.some((x) => !x.r.ok)) { diff.notFullyResolved++; continue; }
  /* 뒤에서부터 오프셋 치환 */
  let next = old, bad = false;
  for (const { h, r } of [...outs].sort((a, b) => b.h.start - a.h.start)) {
    if (old.slice(h.start, h.end) !== h.inner) { bad = true; break; }
    next = next.slice(0, h.start) + r.en + next.slice(h.end);
  }
  if (bad) { diff.sliceMismatch++; rejected.push({ m: t.productMasterId, why: 'SLICE_MISMATCH' }); continue; }
  /* 구조 보존 */
  let sd = false;
  for (const [re] of PARITY) if (cnt(old, re) !== cnt(next, re)) sd = true;
  if (sd) { diff.structureDiff++; rejected.push({ m: t.productMasterId, why: 'STRUCTURE_DIFF' }); continue; }
  /* 섹션 안에 한글이 남지 않아야 한다 */
  const secNew = SEC.exec(next);
  if (!secNew) { diff.sectionMissing++; rejected.push({ m: t.productMasterId, why: 'SECTION_MISSING' }); continue; }
  if (HANGUL.test(secNew[1])) { diff.hangulLeft++; rejected.push({ m: t.productMasterId, why: 'HANGUL_LEFT' }); continue; }
  /* 수치 보존 — 슬롯 단위로 본다 */
  let nl = null;
  for (const { h, r } of outs) { const l = numericLoss(h.inner, r.en); if (l) { nl = { ko: h.inner, en: r.en, lost: l }; break; } }
  if (nl) { diff.numericLoss++; if (numericSamples.length < 8) numericSamples.push(nl); rejected.push({ m: t.productMasterId, why: 'NUMERIC_LOSS' }); continue; }
  /* 영어 위생 — **차등 비교**. 원문에도 있던 들여쓰기 공백 등을 결함으로 세면 안 된다. */
  const secOld = SEC.exec(old);
  const hy = HYGIENE.find(([re, name]) => cnt(secNew[1], new RegExp(re.source, 'g')) > cnt(secOld ? secOld[1] : '', new RegExp(re.source, 'g')));
  if (hy) { diff.hygiene++; if (hygieneSamples.length < 8) hygieneSamples.push({ why: hy[1], sec: norm(secNew[1]).slice(0, 200) }); rejected.push({ m: t.productMasterId, why: `HYGIENE_${hy[1]}` }); continue; }
  /* 대상 밖 영역 불변 — 섹션을 통째로 지운 나머지가 같아야 한다 */
  const strip = (s) => s.replace(SEC, '<SECTION/>');
  if (strip(old) !== strip(next)) { diff.otherAreaChanged++; rejected.push({ m: t.productMasterId, why: 'OTHER_AREA_CHANGED' }); continue; }
  ready.push({ enId: t.enId, m: t.productMasterId, old, next, oldHash: t.enHash, slots: outs.length });
}

fs.writeFileSync(`${D}/hff-en-c01-rollback-v1.json`, JSON.stringify({
  wo: WO, preparedAt: new Date().toISOString(),
  rollback: 'UPDATE 전용. 되돌리기는 rows 의 oldHash 로 식별되는 행에 원본 섹션을 다시 써 넣는 것이다.',
  rounds: ROUNDS, before, rows: ready.map((r) => ({ enId: r.enId, productMasterId: r.m, oldHash: r.oldHash })),
}, null, 1));

const head = {
  wo: WO, at: new Date().toISOString(), rounds: ROUNDS,
  candidateDocuments: targets.length, ready: ready.length, rejected: rejected.length,
  rejectedByWhy: diff, numericSamples, hygieneSamples, before,
};
if (!APPLY) {
  fs.writeFileSync(`${D}/hff-en-c01-apply-result-v1.json`, JSON.stringify({ ...head, mode: 'DRY_RUN' }, null, 1));
  fs.writeFileSync(`${CACHE}/hff-en-c01-render-input.jsonl`, ready.slice(0, 700).map((r) => JSON.stringify({ m: r.m, p: '', h: r.next, lic: [] })).join('\n') + '\n');
  fs.writeFileSync(`${CACHE}/hff-en-c01-render-base.jsonl`, ready.slice(0, 700).map((r) => JSON.stringify({ m: r.m, p: '', h: r.old, lic: [] })).join('\n') + '\n');
  console.log(JSON.stringify({ ...head, mode: 'DRY_RUN' }, null, 1));
  await c.end(); process.exit(0);
}

const startedAt = new Date().toISOString();
const updated = [], skipped = [], failed = [];
for (let i = 0; i < ready.length; i += 500) {
  const chunk = ready.slice(i, i + 500);
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
  process.stderr.write(`\rapplied ${updated.length}`);
}
process.stderr.write('\n');
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
};
fs.writeFileSync(`${D}/hff-en-c01-apply-result-v1.json`, JSON.stringify(out, null, 1));
fs.writeFileSync(`${CACHE}/hff-en-c01-updated-ids.json`, JSON.stringify(updated));
console.log(JSON.stringify(out, null, 1));
await c.end();
