/**
 * WO-O4O-HFF-EN-INTEGRATED-ISSUE-QUEUE-663-FULL-CLEANUP-V1  §8 / §9-2
 *
 * 문제 큐 663 중 해소 가능한 행의 EN canonical 을 생성하고(메모리) 렌더 검증한다.
 *   - DB 는 read-only 로만 접근한다. write 0.
 *   - KO canonical HTML 을 템플릿으로 두고 **텍스트 슬롯만** 치환한다(구조 불변).
 *   - 슬롯 단위로 수치 보존을 강제한다. 하나라도 유실되면 그 행 전체를 버린다.
 *
 * 산출: data/hff-en-q663-safe-targets-v1.json · data/hff-en-q663-render-audit-v1.json
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { JSDOM } from 'jsdom';
import { SLOT_RE, norm } from './hff-en-batch-01-translate.mjs';
import { resolve as rsv, lostNums } from './hff-en-q663-resolver.mjs';

const D = 'apps/api-server/src/scripts/data';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const POP = JSON.parse(fs.readFileSync(`${D}/hff-en-q663-population-v1.json`, 'utf8'));

/* ── KO canonical 재조회 (read-only) ──────────────────────────── */
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const mIds = POP.rows.map((r) => r.productMasterId);
const ko = new Map(), enExists = new Set();
for (let i = 0; i < mIds.length; i += 500) {
  const q = await c.query(`
    SELECT master_id, id, content, coalesce(language,'ko') lang
      FROM shared_product_descriptions
     WHERE master_id = ANY($1) AND deleted_at IS NULL
       AND source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical'`,
  [mIds.slice(i, i + 500)]);
  for (const r of q.rows) { if (r.lang === 'en') enExists.add(r.master_id); else ko.set(r.master_id, r); }
}
await c.end();

/* ── 슬롯 치환 ────────────────────────────────────────────────── */
function build(html) {
  const misses = [];
  let out = html;
  for (const { kind, re } of SLOT_RE) {
    out = out.replace(re, (whole, open, inner, close) => {
      const t = norm(inner);
      if (!t) return whole;
      const r = rsv(kind, inner);
      if (!r) { misses.push({ kind, text: t, why: 'UNRESOLVED' }); return whole; }
      /* 해석되더라도 수치가 하나라도 사라지면 해소로 인정하지 않는다(§4-3). */
      const lost = lostNums(inner, r.en);
      if (lost.length) { misses.push({ kind, text: t, why: 'NUMBER_DRIFT', lost }); return whole; }
      return open + r.en + close;
    });
  }
  let hangul = 0;
  for (const { re } of SLOT_RE) for (const m of out.matchAll(re)) if (HANGUL.test(norm(m[2]))) hangul++;
  return { misses, hangul, html: out };
}

const targets = [], blocked = [];
for (const row of POP.rows) {
  if (row.state === 'EN_ALREADY_EXISTS' || enExists.has(row.productMasterId)) { blocked.push({ ...row, finalWhy: 'EN_ALREADY_EXISTS' }); continue; }
  const k = ko.get(row.productMasterId);
  if (!k) { blocked.push({ ...row, finalWhy: 'KO_MISSING' }); continue; }
  if (row.koHash && sha(k.content) !== row.koHash) { blocked.push({ ...row, finalWhy: 'KO_DRIFT_SINCE_POPULATION' }); continue; }
  const b = build(k.content);
  if (b.misses.length || b.hangul) { blocked.push({ ...row, finalWhy: b.misses.length ? b.misses[0].why : 'HANGUL_REMAINS', misses: b.misses }); continue; }
  targets.push({
    op: 'INSERT', productMasterId: row.productMasterId, productNameKo: row.productName,
    koCanonicalId: k.id, koHash: sha(k.content),
    newContent: b.html, newContentHash: sha(b.html),
    issueType: row.issueType, observedIssueType: row.observedIssueType ?? null,
  });
}

/* ── 구조 패리티 (KO 대비 태그 수 동일) ───────────────────────── */
const cnt = (h, re) => (h.match(re) ?? []).length;
const PARITY = [[/<li[ >]/g, 'li'], [/<h2[ >]/g, 'h2'], [/sd-item/g, 'sd-item'], [/sd-tag/g, 'sd-tag'], [/<b>/g, 'b'], [/<ul[ >]/g, 'ul'], [/<p[ >]/g, 'p']];
let parityFail = 0;
for (const t of targets) {
  const k = ko.get(t.productMasterId).content;
  for (const [re, name] of PARITY) if (cnt(k, re) !== cnt(t.newContent, re)) { parityFail++; t.parityBroken = name; }
}

/* ── 렌더 검증 (배치05 계약과 동일) ───────────────────────────── */
const sig = (h) => {
  const tags = (h.match(/<(h1|h2|ul|ol|li|div|span|p|b)/g) ?? []).join('');
  const cls = [...new Set((h.match(/class="([^"]+)"/g) ?? []))].sort().join('|');
  return `${tags.length}|${cnt(h, /<li>/g)}|${cnt(h, /<h2>/g)}|${cls}`;
};
const seenSig = new Set();
const SAFE = targets.filter((t) => {
  const high = /\d{4}-\d+/.test(t.newContent) || (t.newContent.match(/sd-tag|<b>/g) ?? []).length >= 6;
  const k = sig(t.newContent);
  if (high) return true;
  if (seenSig.has(k)) return false;
  seenSig.add(k); return true;
});
const CSS = (fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8')
  .match(/const storeDescriptionCss = `([\s\S]*?)`;/) ?? [])[1];
if (!CSS) { console.error('STORE_DESC_CSS_NOT_FOUND'); process.exit(1); }
const DEFINED = new Set([...CSS.matchAll(/\.store-desc-content\s+\.([a-zA-Z0-9_-]+)/g)].map((m) => m[1])
  .concat([...CSS.matchAll(/\.([a-z][a-zA-Z0-9_-]*)\s*[,{]/g)].map((m) => m[1])));

const WIDTHS = [430, 820, 1280];
const counters = {
  structureParity: parityFail,
  pageOverflow: 0, elementOverflow: 0, clipped: 0,
  emptyH2: 0, emptyUl: 0, emptyLi: 0,
  undefinedClass: 0, rawHtml: 0, hangulVisible: 0, markerVisible: 0,
  labelLost: 0, licenseNoLost: 0,
};
const failures = [];
let renders = 0;

for (const t of SAFE) {
  for (const w of WIDTHS) {
    const dom = new JSDOM(
      `<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;width:${w}px}${CSS}</style></head>`
      + `<body><div class="store-desc-content">${t.newContent}</div></body></html>`, { pretendToBeVisual: true });
    const { window } = dom, doc = window.document;
    renders++;

    for (const h2 of doc.querySelectorAll('h2')) if (!h2.textContent.trim()) counters.emptyH2++;
    for (const ul of doc.querySelectorAll('ul')) if (!ul.querySelector('li')) counters.emptyUl++;
    for (const li of doc.querySelectorAll('li')) {
      if (li.querySelector('ul')) continue;
      const txt = li.textContent.trim();
      if (!txt) { counters.emptyLi++; failures.push({ p: t.productNameKo, w, why: 'EMPTY_LI' }); continue; }
      if (HANGUL.test(txt)) { counters.hangulVisible++; failures.push({ p: t.productNameKo, w, why: 'HANGUL', txt: txt.slice(0, 40) }); }
      if (/[①②③④⑤⑥⑦⑧⑨⑩]/.test(txt)) { counters.markerVisible++; failures.push({ p: t.productNameKo, w, why: 'MARKER' }); }
      if (/&lt;|&gt;|<[a-z]/i.test(li.innerHTML.replace(/<\/?(b|span|em|strong)>/g, ''))) counters.rawHtml++;
    }
    for (const el of doc.querySelectorAll('.store-desc-content *')) {
      for (const cls of el.classList ?? []) if (cls.startsWith('sd-') && !DEFINED.has(cls)) { counters.undefinedClass++; failures.push({ p: t.productNameKo, w, why: `UNDEFINED_CLASS:${cls}` }); }
      const cs = window.getComputedStyle(el);
      if (/px$/.test(cs.width) && parseInt(cs.width, 10) > w) { counters.elementOverflow++; failures.push({ p: t.productNameKo, w, why: 'ELEMENT_OVERFLOW' }); }
      if (cs.whiteSpace === 'nowrap' && cs.overflow === 'hidden') counters.clipped++;
    }
    for (const b of doc.querySelectorAll('b, .sd-tag')) {
      if (HANGUL.test(b.textContent)) { counters.labelLost++; failures.push({ p: t.productNameKo, w, why: 'LABEL_HANGUL', txt: b.textContent.slice(0, 40) }); }
    }
    /* 개별인정번호 보존 — KO 원본에 있던 번호가 EN 에도 남아야 한다. */
    for (const no of (ko.get(t.productMasterId).content.match(/제?\s?\d{4}-\d+\s?호?/g) ?? []).map((s) => (s.match(/\d{4}-\d+/) ?? [''])[0])) {
      if (no && !doc.body.textContent.includes(no)) { counters.licenseNoLost++; failures.push({ p: t.productNameKo, m: t.productMasterId, w, why: 'LICENSE_NO_LOST', no }); }
    }
    window.close();
  }
}

const total = Object.values(counters).reduce((a, b) => a + b, 0);
const audit = {
  wo: 'WO-O4O-HFF-EN-INTEGRATED-ISSUE-QUEUE-663-FULL-CLEANUP-V1',
  renderedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  queueTotal: POP.rows.length, targets: targets.length, blocked: blocked.length,
  documentsRendered: SAFE.length, structureSignatures: seenSig.size,
  coverage: 'signature-exhaustive + high-risk full', widths: WIDTHS, renders,
  counters, totalIssues: total, verdict: total === 0 ? 'PASS' : 'FAIL',
  failures: failures.slice(0, 25),
  blockedByWhy: blocked.reduce((a, b) => { a[b.finalWhy] = (a[b.finalWhy] ?? 0) + 1; return a; }, {}),
};
fs.writeFileSync(`${D}/hff-en-q663-safe-targets-v1.json`, JSON.stringify({ wo: audit.wo, generatedAt: audit.renderedAt, count: targets.length, targets }, null, 1));
fs.writeFileSync(`${D}/hff-en-q663-blocked-v1.json`, JSON.stringify({ wo: audit.wo, count: blocked.length, rows: blocked }, null, 1));
fs.writeFileSync(`${D}/hff-en-q663-render-audit-v1.json`, JSON.stringify(audit, null, 1));
console.log(JSON.stringify({ ...audit, failures: audit.failures.slice(0, 8) }, null, 2));
