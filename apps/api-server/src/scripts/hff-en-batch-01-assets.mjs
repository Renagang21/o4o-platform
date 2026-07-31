/**
 * WO-O4O-HFF-EN-BULK-PRODUCTION-BATCH-01-5000-V1 / 승인 번역 자산 추출 (read-only).
 *
 * 기존 STORE/en canonical 은 이미 승인되어 운영 중인 영어 설명서다.
 * 같은 master 의 ko/en 쌍에서 **구조가 동일한 위치의 절**을 맞춰 KO→EN 사전을 만든다.
 * 이 사전이 Batch 01 번역의 1차 근거이며, 사전에 없는 절은 임의 번역하지 않고 HOLD 한다.
 */
import fs from 'node:fs';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const norm = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/[･·∙‧・•]/g, '·').replace(/\s+/g, ' ').trim();
const key = (s) => norm(s).replace(/\s/g, '');
const leafLis = (h) => [...(h ?? '').matchAll(/<li>((?:(?!<li>|<\/li>)[\s\S])*?)<\/li>/g)].map((x) => norm(x[1])).filter(Boolean);
const labelsOf = (h) => [
  ...[...(h ?? '').matchAll(/<b>([\s\S]*?)<\/b>/g)].map((m) => m[1]),
  ...[...(h ?? '').matchAll(/<span class="sd-tag">([\s\S]*?)<\/span>/g)].map((m) => m[1]),
].map(norm).filter(Boolean);
const familyOf = (b) => /class="sd-fn"/.test(b ?? '') ? 'fn'
  : /class="sd-core"|class="sd-item"|class="sd-tag"/.test(b ?? '') ? 'core'
  : /class="sd-func"|class="sd-why"/.test(b ?? '') ? 'why' : 'plain';

// 문서를 <h2> 단위 섹션으로 분해
function sections(content) {
  const out = [];
  const re = /<h2>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2>|<div class="sd-foot"|$)/g;
  let m;
  while ((m = re.exec(content))) out.push({ heading: norm(m[1]), body: m[2] });
  return out;
}
const heroOf = (c) => norm((c.match(/<h1>([\s\S]*?)<\/h1>/) ?? [])[1] ?? '');
const introOf = (c) => norm((c.match(/<p class="sd-intro">([\s\S]*?)<\/p>/) ?? [])[1] ?? '');
const footOf = (c) => norm((c.match(/<div class="sd-foot">([\s\S]*?)<\/div>/) ?? [])[1] ?? '');
const badgesOf = (c) => [...(c.matchAll(/<span class="sd-badge[^"]*">([\s\S]*?)<\/span>/g))].map((m) => norm(m[1]));
const metaOf = (c) => [...(c.matchAll(/<p class="sd-meta">([\s\S]*?)<\/p>/g))].map((m) => norm(m[1]));

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5507', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

const pairs = (await c.query(`
  SELECT ko.master_id, ko.id ko_id, ko.content ko, en.id en_id, en.content en
  FROM shared_product_descriptions ko
  JOIN shared_product_descriptions en
    ON en.master_id = ko.master_id AND en.description_type='STORE' AND en.status='canonical'
   AND en.language='en' AND en.source_type='o4o_hff_generated' AND en.deleted_at IS NULL
  WHERE ko.description_type='STORE' AND ko.status='canonical' AND coalesce(ko.language,'ko')='ko'
    AND ko.source_type='o4o_hff_generated' AND ko.deleted_at IS NULL`)).rows;
await c.end();

const clause = new Map();   // koKey -> Map(en -> count)
const label = new Map();
const heading = new Map();
const foot = new Map();
const badge = new Map();
const intro = new Map();
const meta = new Map();
const bump = (map, k, v) => {
  if (!k || !v) return;
  if (!map.has(k)) map.set(k, new Map());
  const m = map.get(k);
  m.set(v, (m.get(v) ?? 0) + 1);
};

let aligned = 0, skippedShape = 0;
const familyPair = {};
for (const p of pairs) {
  const ks = sections(p.ko), es = sections(p.en);
  const kf = familyOf(p.ko), ef = familyOf(p.en);
  familyPair[`${kf}->${ef}`] = (familyPair[`${kf}->${ef}`] ?? 0) + 1;
  bump(foot, key(footOf(p.ko)), footOf(p.en));
  bump(intro, key(introOf(p.ko)), introOf(p.en));
  const kb = badgesOf(p.ko), eb = badgesOf(p.en);
  if (kb.length === eb.length) kb.forEach((v, i) => bump(badge, key(v), eb[i]));
  const km = metaOf(p.ko), em = metaOf(p.en);
  if (km.length === em.length) km.forEach((v, i) => bump(meta, key(v), em[i]));

  if (ks.length !== es.length) { skippedShape++; continue; }
  let ok = true;
  for (let i = 0; i < ks.length; i++) {
    const kl = leafLis(ks[i].body), el = leafLis(es[i].body);
    const kL = labelsOf(ks[i].body), eL = labelsOf(es[i].body);
    if (kl.length !== el.length || kL.length !== eL.length) { ok = false; break; }
  }
  if (!ok) { skippedShape++; continue; }
  aligned++;
  for (let i = 0; i < ks.length; i++) {
    bump(heading, key(ks[i].heading), es[i].heading);
    const kl = leafLis(ks[i].body), el = leafLis(es[i].body);
    kl.forEach((v, j) => bump(clause, key(v), el[j]));
    const kL = labelsOf(ks[i].body), eL = labelsOf(es[i].body);
    kL.forEach((v, j) => bump(label, key(v), eL[j]));
  }
}

// 다수결 + 신뢰도. 경합이 심하면 사전에서 제외한다.
function resolve(map, minRatio = 0.9) {
  const dict = {}, conflicts = [];
  for (const [k, m] of map) {
    const entries = [...m.entries()].sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((a, e) => a + e[1], 0);
    const [top, n] = entries[0];
    if (n / total >= minRatio) dict[k] = { en: top, n, total };
    else conflicts.push({ k, options: entries.slice(0, 3), total });
  }
  return { dict, conflicts };
}
const R = {
  clause: resolve(clause), label: resolve(label), heading: resolve(heading, 0.8),
  foot: resolve(foot, 0.8), badge: resolve(badge, 0.8), intro: resolve(intro, 0.95), meta: resolve(meta, 0.95),
};

const stats = {
  builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  koEnPairs: pairs.length, structurallyAligned: aligned, skippedShapeMismatch: skippedShape,
  familyPair,
  dictSizes: Object.fromEntries(Object.entries(R).map(([k, v]) => [k, Object.keys(v.dict).length])),
  conflicts: Object.fromEntries(Object.entries(R).map(([k, v]) => [k, v.conflicts.length])),
  topConflicts: R.clause.conflicts.slice(0, 5),
};
fs.writeFileSync(`${D}/hff-en-batch-01-translation-assets-v1.json`, JSON.stringify({
  ...stats,
  dict: Object.fromEntries(Object.entries(R).map(([k, v]) => [k, Object.fromEntries(Object.entries(v.dict).map(([kk, vv]) => [kk, vv.en]))])),
  evidence: Object.fromEntries(Object.entries(R).map(([k, v]) => [k, Object.fromEntries(Object.entries(v.dict).map(([kk, vv]) => [kk, `${vv.n}/${vv.total}`]))])),
}, null, 1));
console.log(JSON.stringify(stats, null, 2));
