/**
 * WO-O4O-HFF-KO-FINAL-MANUAL-80-RESOLUTION-V1 / SAFE 대상 전수 정밀 스캔 (read-only, DB 미접근).
 * 적용 전에 "기능성 영역만 바뀌었는가 / 절이 전부 공식 원문인가"를 독립적으로 다시 센다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const SAFE = JSON.parse(fs.readFileSync(`${D}/hff-ko-final-manual-80-safe-targets-v1.json`, 'utf8')).targets;
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const dense = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/[･·∙‧・]/g, '·').replace(/[\s　 ]/g, '').trim();
const leafLis = (html) => [...(html ?? '').matchAll(/<li>((?:(?!<li>|<\/li>)[\s\S])*?)<\/li>/g)]
  .map((x) => x[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
const labelsOf = (html) => [
  ...[...(html ?? '').matchAll(/<b>([\s\S]*?)<\/b>/g)].map((m) => m[1]),
  ...[...(html ?? '').matchAll(/<span class="sd-tag">([\s\S]*?)<\/span>/g)].map((m) => m[1]),
].map((v) => v.replace(/<[^>]+>/g, '').trim());
const fnOf = (c) => (c.match(/(<h2>[^<]*기능성[^<]*<\/h2>)([\s\S]*?)(?=<h2>|<div class="sd-foot")/) ?? [])[0] ?? '';
const familyOf = (b) => /class="sd-fn"/.test(b) ? 'fn' : /class="sd-core"|class="sd-item"|class="sd-tag"/.test(b) ? 'core' : /class="sd-func"|class="sd-why"/.test(b) ? 'why' : 'none';

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5501', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');
const old = new Map(), raws = new Map();
for (const r of (await c.query('SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)', [SAFE.map((r) => r.canonicalId)])).rows) old.set(r.id, r.content);
for (const r of (await c.query(`SELECT id, raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn FROM product_candidates WHERE id = ANY($1)`, [SAFE.map((r) => r.candidateId)])).rows) raws.set(r.id, r.fn ?? '');
await c.end();

const issues = [];
const add = (t, r, extra) => issues.push({ type: t, productName: r.productName, canonicalId: r.canonicalId, ...extra });

for (const t of SAFE) {
  const oldC = old.get(t.canonicalId) ?? '';
  const newC = t.newContent;
  const rawDense = dense(raws.get(t.candidateId) ?? '');
  if (sha(oldC) !== t.oldContentHash) add('OLD_HASH_DRIFT', t);
  if (sha(newC) !== t.newContentHash) add('NEW_HASH_MISMATCH', t);

  const oldFn = fnOf(oldC), newFn = fnOf(newC);
  if (!newFn) { add('NEW_FN_SECTION_MISSING', t); continue; }

  // 1) 기능성 영역 밖은 한 글자도 달라지지 않아야 한다
  const oldOutside = oldC.replace(oldFn, '');
  const newOutside = newC.replace(newFn, '');
  if (oldOutside !== newOutside) add('OUTSIDE_FN_DRIFT', t, { oldLen: oldOutside.length, newLen: newOutside.length });

  // 2) renderer family 보존 (섹션 신설 건은 문서 전체 family 기준)
  const of = familyOf(oldFn || oldC), nf = familyOf(newFn);
  if (of !== nf) add('FAMILY_CHANGED', t, { from: of, to: nf });

  // 3) 절/라벨은 전부 공식 원문 verbatim
  const cls = leafLis(newFn), lbs = labelsOf(newFn);
  const labelSet = new Set(lbs.map(dense));
  for (const v of cls) {
    if (labelSet.has(dense(v))) continue;
    if (!rawDense.includes(dense(v))) add('CLAUSE_NOT_VERBATIM', t, { clause: v.slice(0, 60) });
    if (/[\[\]]/.test(v)) add('BRACKET_IN_CLAUSE', t, { clause: v.slice(0, 60) });
    if (/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]/.test(v)) add('MARKER_IN_CLAUSE', t, { clause: v.slice(0, 60) });
    if (/[A-Za-z]{6,}/.test(v)) add('ENGLISH_IN_CLAUSE', t, { clause: v.slice(0, 60) });
    if (/[,、·:：\/]\s*$/.test(v)) add('TRAILING_DELIMITER', t, { clause: v.slice(0, 60) });
    if (dense(v).length < 6) add('CLAUSE_TOO_SHORT', t, { clause: v });
    if (/^기능성\s*내용/.test(v)) add('HEADER_AS_CLAUSE', t, { clause: v.slice(0, 60) });
  }
  for (const v of lbs) if (!rawDense.includes(dense(v))) add('LABEL_NOT_VERBATIM', t, { label: v.slice(0, 60) });

  // 4) 그룹 내부 중복 금지 (그룹 간 동일 문구는 정상)
  const groups = /class="sd-core"|class="sd-item"/.test(newFn)
    ? [...newFn.matchAll(/<div class="sd-item">([\s\S]*?)<\/div>/g)].map((m) => m[1])
    : newFn.split(/(?=<li>\s*<b>)/).filter((p) => /<li>\s*<b>/.test(p));
  for (const g of (groups.length ? groups : [newFn])) {
    const seen = new Set();
    for (const v of leafLis(g)) { const k = dense(v); if (seen.has(k)) add('DUPLICATE_IN_GROUP', t, { clause: v.slice(0, 50) }); seen.add(k); }
  }

  // 5) 기존 공식 절이 사라지지 않았는가 (표기 정정·손상 제거는 결정 단계에서 이미 판정)
  // 결정 단계와 동일한 손상 판정을 쓴다. 잘린 라벨(`비타민D: (`)이나 수치 꼬리
  // (`… : 난소화성말토덱스트린 식이섬유로서`)는 원문 조각을 포함하더라도 보존 대상이 아니다.
  const corrupted = (v) => /[(:：\[]\s*$/.test(v) || /[:：][^:：]{0,40}(?:으로서|로서)$/.test(v)
    || /[\[\]]/.test(v) || /[A-Za-z]{6,}/.test(v) || /^기능성\s*내용/.test(v) || dense(v).length < 8;
  const newDense = leafLis(newFn).map(dense);
  const lcsRatio = (a, b) => {
    const x = dense(a), y = dense(b), max = Math.max(x.length, y.length, 1);
    let p = 0; while (p < x.length && p < y.length && x[p] === y[p]) p++;
    let s = 0; while (s < x.length - p && s < y.length - p && x[x.length - 1 - s] === y[y.length - 1 - s]) s++;
    return (p + s) / max;
  };
  const newAll = leafLis(newFn);
  for (const v of leafLis(oldFn)) {
    const k = dense(v);
    if (!k || newDense.some((n) => n.includes(k) || k.includes(n))) continue;
    if (!rawDense.includes(k)) continue;             // 원문에 없던 절 = 손상/외부 유래
    if (corrupted(v)) continue;
    if (newAll.some((n) => lcsRatio(v, n) >= 0.6)) continue;   // 표기 정정
    add('OFFICIAL_CLAUSE_LOST', t, { clause: v.slice(0, 60) });
  }

  // 6) 전문가 안내·다른 섹션 보존
  if (/전문가|약사|상담|문의/.test(oldC) && !/전문가|약사|상담|문의/.test(newC)) add('EXPERT_NOTE_LOST', t);
  if ((newC.match(/<h2>/g) ?? []).length < (oldC.match(/<h2>/g) ?? []).length) add('H2_LOST', t);
}

const byType = issues.reduce((a, r) => { a[r.type] = (a[r.type] ?? 0) + 1; return a; }, {});
const out = { scannedAt: new Date().toISOString(), readOnly: true, dbWrites: 0, targets: SAFE.length, issues: issues.length, byType, clean: issues.length === 0, detail: issues.slice(0, 40) };
fs.writeFileSync(`${D}/hff-ko-final-manual-80-scan-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
