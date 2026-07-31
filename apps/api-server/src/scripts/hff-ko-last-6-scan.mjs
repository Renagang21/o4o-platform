/**
 * WO-O4O-HFF-KO-LAST-6-AUTHORITY-DECISION-AND-CLOSURE-V1 / SAFE 대상 정밀 스캔 (read-only).
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const SAFE = JSON.parse(fs.readFileSync(`${D}/hff-ko-last-6-safe-targets-v1.json`, 'utf8')).targets;
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const MID = /[･·∙‧・•]/g;
const dense = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(MID, '·').replace(/[\s　 ]/g, '').trim();
const leafLis = (h) => [...(h ?? '').matchAll(/<li>((?:(?!<li>|<\/li>)[\s\S])*?)<\/li>/g)]
  .map((x) => x[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
const labelsOf = (h) => [...(h ?? '').matchAll(/<b>([\s\S]*?)<\/b>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
const fnOf = (c) => (c.match(/(<h2>[^<]*기능성[^<]*<\/h2>)([\s\S]*?)(?=<h2>|<div class="sd-foot")/) ?? [])[0] ?? '';

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5503', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');
const old = new Map(), raws = new Map();
for (const r of (await c.query('SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)', [SAFE.map((t) => t.canonicalId)])).rows) old.set(r.id, r.content);
for (const r of (await c.query(`SELECT id, raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn, raw_payload::jsonb->'source'->>'BASE_STANDARD' base FROM product_candidates WHERE id = ANY($1)`, [SAFE.map((t) => t.candidateId)])).rows) raws.set(r.id, r);
await c.end();

const issues = [];
const add = (type, t, extra) => issues.push({ type, productName: t.productName, canonicalId: t.canonicalId, ...extra });

for (const t of SAFE) {
  const oldC = old.get(t.canonicalId) ?? '', newC = t.newContent;
  const src = raws.get(t.candidateId) ?? {};
  const rawDense = dense(src.fn ?? ''), baseDense = dense(src.base ?? '').replace(/[.]/g, '·');
  if (sha(oldC) !== t.oldContentHash) add('OLD_HASH_DRIFT', t);
  if (sha(newC) !== t.newContentHash) add('NEW_HASH_MISMATCH', t);

  const oldFn = fnOf(oldC), newFn = fnOf(newC);
  if (!newFn) { add('NEW_FN_MISSING', t); continue; }
  if (oldC.replace(oldFn, '') !== newC.replace(newFn, '')) add('OUTSIDE_FN_DRIFT', t);

  const derivable = (v) => {
    const m = dense(v).match(/^(.+?)(에도움을줄수있음|에필요)$/);
    return !!m && rawDense.split(MID).some((s) => s.includes(m[1])) && rawDense.includes(m[2]);
  };
  const cls = leafLis(newFn), lbs = labelsOf(newFn);
  for (const v of cls) {
    if (!rawDense.includes(dense(v)) && !derivable(v)) add('CLAUSE_NOT_VERBATIM', t, { clause: v.slice(0, 50) });
    if (/[\[\]]/.test(v) || /[①②③④⑤⑥⑦⑧⑨⑩]/.test(v)) add('MARKER_OR_BRACKET', t, { clause: v.slice(0, 50) });
    if (/[A-Za-z]{6,}/.test(v)) add('ENGLISH_IN_CLAUSE', t, { clause: v.slice(0, 50) });
    if (/[,、·:：\/]\s*$/.test(v)) add('TRAILING_DELIMITER', t, { clause: v.slice(0, 50) });
    if (dense(v).length < 6) add('CLAUSE_TOO_SHORT', t, { clause: v });
  }
  const oldLabels = labelsOf(oldFn);
  for (const v of lbs) {
    const d2 = dense(v).replace(/[.]/g, '·');
    if (!rawDense.replace(/[.]/g, '·').includes(d2) && !baseDense.includes(d2) && !oldLabels.some((L) => dense(L) === dense(v))) add('LABEL_NOT_VERBATIM', t, { label: v });
  }
  // 기존 라벨은 축소되지 않아야 한다
  for (const L of oldLabels) if (!lbs.some((v) => dense(v) === dense(L) || dense(v).includes(dense(L)))) add('LABEL_NARROWED', t, { label: L });
  // 그룹 내부 중복 (그룹 간은 정상)
  for (const g of newFn.split(/(?=<li>\s*<b>)/).filter((p) => /<li>\s*<b>/.test(p))) {
    const seen = new Set();
    for (const v of leafLis(g.slice(g.indexOf('</b>') + 4))) { const k = dense(v); if (seen.has(k)) add('DUP_IN_GROUP', t, { clause: v.slice(0, 40) }); seen.add(k); }
  }
  // 기존 절 보존
  const nd = cls.map(dense);
  for (const v of leafLis(oldFn)) {
    const k = dense(v);
    if (!k || nd.some((n) => n.includes(k) || k.includes(n))) continue;
    add('OFFICIAL_CLAUSE_LOST', t, { clause: v.slice(0, 50) });
  }
  if (/전문가|약사|상담|문의/.test(oldC) && !/전문가|약사|상담|문의/.test(newC)) add('EXPERT_NOTE_LOST', t);
  if ((newC.match(/<h2>/g) ?? []).length !== (oldC.match(/<h2>/g) ?? []).length) add('H2_COUNT_CHANGED', t);
  if (/class="sd-fn"/.test(newFn)) add('FLAT_FAMILY_REMAINS', t);
}

const byType = issues.reduce((a, r) => { a[r.type] = (a[r.type] ?? 0) + 1; return a; }, {});
const out = { scannedAt: new Date().toISOString(), readOnly: true, dbWrites: 0, targets: SAFE.length, issues: issues.length, byType, clean: issues.length === 0, detail: issues.slice(0, 30) };
fs.writeFileSync(`${D}/hff-ko-last-6-scan-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
