/**
 * WO-O4O-HFF-JA-NUMERIC-IZYOU-MISTRANSLATION-154-CORRECTION-V1 §3 / §4
 *
 * 수치 범위 `이상`→`異常` 오역 교정. **UPDATE 전용**이며 대상은 survey 가 확정한 목록뿐이다.
 *   - 렌더 검증(430/820/1280) PASS 후에만 UPDATE 한다.
 *   - 이중 게이트: `--apply` + HFF_JA_FIX154_APPLY_CONFIRM=YES.
 *   - 낙관적 잠금: 저장된 본문 해시가 survey 시점과 같을 때만 갱신한다.
 *   - KO·EN·ZH·ProductMaster 는 쓰지 않는다.
 *   - 문자열 일괄치환이 아니다 — KO canonical 에서 다시 생성한 본문으로 교체한다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const WO = 'WO-O4O-HFF-JA-NUMERIC-IZYOU-MISTRANSLATION-154-CORRECTION-V1';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
/* 입력 원장은 기본이 승인 baseline 이다. 재판정본으로 교정할 때는 FIX154_IN_SUFFIX 로 지정한다
   — baseline 을 덮어쓰지 않고 새로 열린 대상만 처리하기 위해서다(§9 원장 보호). */
const IN_SUF = process.env.FIX154_IN_SUFFIX ?? '-v1';
const OUT_SUF = process.env.FIX154_OUT_SUFFIX ?? '-v1';
const TARGETS = JSON.parse(fs.readFileSync(`${D}/hff-ja-fix154-targets${IN_SUF}.json`, 'utf8')).targets;
if (!TARGETS.length) { console.error('NO_TARGETS'); process.exit(1); }

/* ── 교정 전·후 대조 (§4) ─────────────────────────────────────── */
const cnt = (h, re) => (h.match(re) ?? []).length;
const NUM = /(?<![A-Za-z0-9])\d+(?:[.,]\d+)*/g;
const diff = { numAbnormalLeft: 0, ijouMissing: 0, ikaChanged: 0, numberDrift: 0, hangul: 0, functionalDrift: 0, structureDiff: 0 };
const PARITY = [[/<li[ >]/g, 'li'], [/<h2[ >]/g, 'h2'], [/sd-item/g, 'sd-item'], [/sd-tag/g, 'sd-tag'], [/<b>/g, 'b'], [/<ul[ >]/g, 'ul'], [/<p[ >]/g, 'p']];
const bad = [];
for (const t of TARGETS) {
  const o = t.oldContent, n = t.newContent;
  if (/[\d%]異常/.test(n)) { diff.numAbnormalLeft++; bad.push({ m: t.productMasterId, why: 'ABNORMAL_LEFT' }); continue; }
  /* 하한이 실제로 복원됐는가 — 오역 개수만큼 以上 이 늘어야 한다. */
  if (cnt(n, /以上/g) < cnt(o, /以上/g) + t.oldNumAbnormal) { diff.ijouMissing++; bad.push({ m: t.productMasterId, why: 'IJOU_MISSING' }); continue; }
  /* 상한은 그대로여야 한다. */
  if (cnt(n, /以下/g) !== cnt(o, /以下/g) || cnt(n, /未満/g) !== cnt(o, /未満/g)) { diff.ikaChanged++; bad.push({ m: t.productMasterId, why: 'IKA_CHANGED' }); continue; }
  /* 수치 집합 보존 — 개수까지 본다. */
  const bag = (a) => { const m = new Map(); for (const x of a) m.set(x, (m.get(x) ?? 0) + 1); return m; };
  const ob = bag((o.match(NUM) ?? [])), nb = bag((n.match(NUM) ?? []));
  let drift = false;
  for (const [k, v] of ob) if ((nb.get(k) ?? 0) < v) drift = true;
  if (drift) { diff.numberDrift++; bad.push({ m: t.productMasterId, why: 'NUMBER_DRIFT' }); continue; }
  /* 기능성 표현 수 보존 — 교정은 기능성을 건드리지 않는다. */
  if (cnt(n, /役立つ/g) !== cnt(o, /役立つ/g)) { diff.functionalDrift++; bad.push({ m: t.productMasterId, why: 'FUNCTIONAL_DRIFT' }); continue; }
  const rest = n.replace(/<h1[^>]*>[\s\S]*?(?=<small|<\/h1>)/g, ' ').replace(/<[^>]+>/g, ' ');
  if (/[가-힣]/.test(rest.replace(/[^·<>]{0,40}(?:製造|\(주\)|㈜|주식회사|유한회사)[^·<>]{0,40}/g, ' '))) { diff.hangul++; bad.push({ m: t.productMasterId, why: 'HANGUL' }); continue; }
  for (const [re, name] of PARITY) if (cnt(o, re) !== cnt(n, re)) { diff.structureDiff++; bad.push({ m: t.productMasterId, why: `STRUCT_${name}` }); break; }
}
const compareOk = Object.values(diff).every((x) => x === 0);

/* ── 렌더 검증 (430 · 820 · 1280) ─────────────────────────────── */
const TASKS = `${CACHE}/hff-ja-fix154-render-tasks.jsonl`;
fs.mkdirSync(CACHE, { recursive: true });
fs.writeFileSync(TASKS, TARGETS.map((t) => JSON.stringify({
  m: t.productMasterId, p: '', h: t.newContent,
  lic: [...new Set((t.newContent.match(/\d{4}-\d+/g) ?? []))],
})).join('\n') + '\n');
const counters = { structureParity: 0, pageOverflow: 0, elementOverflow: 0, clipped: 0, emptyH2: 0, emptyUl: 0, emptyLi: 0, undefinedClass: 0, rawHtml: 0, hangulVisible: 0, markerVisible: 0, labelLost: 0, licenseNoLost: 0, simplifiedVisible: 0 };
let renders = 0;
const failures = [];
await new Promise((resolve, reject) => {
  const out = `${CACHE}/hff-ja-fix154-render-part.json`;
  const ch = spawn(process.execPath, ['--max-old-space-size=4096',
    'apps/api-server/src/scripts/hff-ja-b01-render-worker.mjs', TASKS, '0', String(TARGETS.length), out],
  { stdio: ['ignore', 'inherit', 'inherit'] });
  ch.on('exit', (code) => {
    if (code !== 0) return reject(new Error(`render exit ${code}`));
    const part = JSON.parse(fs.readFileSync(out, 'utf8'));
    renders = part.renders;
    for (const k of Object.keys(counters)) counters[k] += part.counters[k] ?? 0;
    for (const f of part.failures) if (failures.length < 20) failures.push(f);
    fs.rmSync(out, { force: true });
    resolve();
  });
});
const renderTotal = Object.values(counters).reduce((a, b) => a + b, 0);
const renderPass = renderTotal === 0;

const APPLY = process.argv.includes('--apply') && process.env.HFF_JA_FIX154_APPLY_CONFIRM === 'YES';
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5481', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
const globals = async () => (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='zh' AND source_type='o4o_hff_generated') zh_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='ja' AND source_type='o4o_hff_generated') ja_canon,
    (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm_hff`)).rows[0];
const before = await globals();

fs.writeFileSync(`${D}/hff-ja-fix154-rollback${OUT_SUF}.json`, JSON.stringify({
  wo: WO, preparedAt: new Date().toISOString(),
  rollback: 'UPDATE 전용. 되돌리기는 아래 rows 의 oldContent 를 같은 id 에 다시 써 넣는 것이다.',
  before, rows: TARGETS.map((t) => ({ rowId: t.rowId, productMasterId: t.productMasterId, oldContentHash: t.oldContentHash, oldContent: t.oldContent })),
}, null, 1));

const head = {
  wo: WO, comparedAt: new Date().toISOString(), targets: TARGETS.length,
  compare: diff, compareOk, badSample: bad.slice(0, 10),
  render: { documents: TARGETS.length, widths: [430, 820, 1280], renders, counters, totalIssues: renderTotal, verdict: renderPass ? 'PASS' : 'FAIL', failures: failures.slice(0, 8) },
  before,
};
if (!compareOk || !renderPass) {
  fs.writeFileSync(`${D}/hff-ja-fix154-apply-result${OUT_SUF}.json`, JSON.stringify({ ...head, mode: 'STOP' }, null, 1));
  console.log(JSON.stringify({ ...head, mode: 'STOP' }, null, 2));
  await c.end(); process.exit(2);
}
if (!APPLY) {
  console.log(JSON.stringify({ ...head, mode: 'DRY_RUN' }, null, 2));
  await c.end(); process.exit(0);
}

const startedAt = new Date().toISOString();
const updated = [], skipped = [], failed = [];
const SHARD = 200;
for (let i = 0; i < TARGETS.length; i += SHARD) {
  const chunk = TARGETS.slice(i, i + SHARD);
  try {
    await c.query('BEGIN');
    for (const t of chunk) {
      /* 낙관적 잠금 — survey 이후 본문이 바뀌었으면 건너뛴다. */
      const r = await c.query(`
        UPDATE shared_product_descriptions SET content=$1, updated_at=now()
         WHERE id=$2 AND master_id=$3 AND language='ja' AND description_type='STORE'
           AND status='canonical' AND source_type='o4o_hff_generated' AND deleted_at IS NULL
           AND encode(sha256(convert_to(content,'UTF8')),'hex') = $4
         RETURNING id`,
      [t.newContent, t.rowId, t.productMasterId, t.oldContentHash]);
      /* UPDATE ... RETURNING 은 [rows, count] 형태가 아니라 result 객체다 — rowCount 로 본다. */
      if (r.rowCount === 1) updated.push({ id: t.rowId, m: t.productMasterId, hash: sha(t.newContent) });
      else skipped.push({ m: t.productMasterId, why: 'CONTENT_DRIFT' });
    }
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    failed.push({ shard: i, error: String(e.message ?? e) });
  }
}
const after = await globals();
const out = {
  ...head, startedAt, appliedAt: new Date().toISOString(), mode: 'APPLY',
  expectedUpdate: TARGETS.length, actualUpdate: updated.length,
  expectedInsert: 0, actualInsert: after.ja_canon - before.ja_canon,
  skipped: skipped.length, failedShards: failed.length,
  after,
  koUnchanged: before.ko_canon === after.ko_canon,
  enUnchanged: before.en_canon === after.en_canon,
  zhUnchanged: before.zh_canon === after.zh_canon,
  pmUnchanged: before.pm_hff === after.pm_hff,
  jaCountUnchanged: before.ja_canon === after.ja_canon,
  expectedEqualsActual: updated.length === TARGETS.length && skipped.length === 0 && failed.length === 0
    && before.ja_canon === after.ja_canon,
  skippedSample: skipped.slice(0, 10), failed,
  updatedIds: updated.map((x) => x.id),
};
fs.writeFileSync(`${D}/hff-ja-fix154-apply-result${OUT_SUF}.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, updatedIds: undefined }, null, 2));
await c.end();
