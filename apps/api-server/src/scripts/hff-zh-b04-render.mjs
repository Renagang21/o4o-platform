/**
 * WO-O4O-HFF-ZH-BATCH-04-10000-DIRECT-BULK-PRODUCTION-V1  §3 / §7
 *
 * HFF KO canonical → ZH canonical 생성(메모리) + 렌더 검증 + 모집단 10,000 고정.
 *   - DB 는 read-only. write 0.
 *   - KO canonical HTML 을 템플릿으로 두고 **텍스트 슬롯만** 치환한다(구조 불변 → renderer family 승계).
 *   - 슬롯 단위 수치 보존 강제. 하나라도 유실되면 그 문서 전체를 제외한다(§5).
 *   - 선정은 master_id 오름차순 결정적. 동일 사전·동일 KO 이면 항상 같은 10,000 이 재현된다(§3).
 *
 * 산출: data/hff-zh-b04-safe-targets-v1.json · data/hff-zh-b04-render-audit-v1.json
 *       data/hff-zh-deferred-issue-queue-through-batch04-v1.jsonl (+ -summary-v1.json)
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { spawn } from 'node:child_process';
import { build, parityBreak, HANGUL, stripKeep } from './hff-zh-b01-build.mjs';
import { clearMemo } from './hff-zh-b01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const WO = 'WO-O4O-HFF-ZH-BATCH-04-10000-DIRECT-BULK-PRODUCTION-V1';
const TARGET = 10000;
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');

/* ── KO canonical 모집단 (read-only) ──────────────────────────── */
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const SPLIT_NL = new RegExp(String.fromCharCode(92) + 'r?' + String.fromCharCode(92) + 'n');
const rdl = (f) => (fs.existsSync(`${D}/${f}`)
  ? fs.readFileSync(`${D}/${f}`, 'utf8').split(SPLIT_NL).filter(Boolean).map((l) => JSON.parse(l)) : []);
/* Batch 02 까지의 통합 문제 큐와 KO 영구 HOLD 는 이번 모집단에서 제외한다(§3).
   단 sd-fn RENDER_FAILURE 는 렌더러 복원 후 재검증 대상이므로 모집단에 되돌린다(§6). */
const PRIOR_QUEUE = rdl('hff-zh-deferred-issue-queue-through-batch03-v1.jsonl');
const RETRY = new Set(PRIOR_QUEUE.filter((q) => q.issueType === 'RENDER_FAILURE').map((q) => q.productMasterId));
const EXCLUDE = new Set(PRIOR_QUEUE.map((q) => q.productMasterId).filter((m) => m && !RETRY.has(m)));
for (const h of rdl('hff-ko-agent-09-hold-queue-v1.jsonl')) if (h.productMasterId) EXCLUDE.add(h.productMasterId);

const poolRaw = (await c.query(`
  SELECT k.master_id, k.id, k.content, pm.name AS product_name
    FROM shared_product_descriptions k
    JOIN product_masters pm ON pm.id = k.master_id
   WHERE k.deleted_at IS NULL AND k.source_type='o4o_hff_generated'
     AND k.description_type='STORE' AND k.status='canonical'
     AND coalesce(k.language,'ko')='ko'
     AND NOT EXISTS (
       SELECT 1 FROM shared_product_descriptions z
        WHERE z.master_id = k.master_id AND z.deleted_at IS NULL
          AND z.source_type='o4o_hff_generated' AND z.description_type='STORE'
          AND z.status='canonical' AND z.language='zh')
   ORDER BY k.master_id`)).rows;
const pool = poolRaw.filter((r) => !EXCLUDE.has(r.master_id));
const excludedCount = poolRaw.length - pool.length;
const globalsBefore = (await c.query(`
  SELECT count(*) FILTER (WHERE coalesce(language,'ko')='ko') ko,
         count(*) FILTER (WHERE language='en') en,
         count(*) FILTER (WHERE language='zh') zh
    FROM shared_product_descriptions
   WHERE deleted_at IS NULL AND source_type='o4o_hff_generated'
     AND description_type='STORE' AND status='canonical'`)).rows[0];
await c.end();

const CACHE = process.env.ZH_CACHE ?? 'apps/api-server/src/scripts/.cache';
fs.writeFileSync(`${CACHE}/hff-zh-b04-pool.jsonl`,
  pool.map((r) => JSON.stringify({ m: r.master_id, i: r.id, n: r.product_name, c: r.content })).join('\n') + '\n');

/* ── 구조 패리티 ──────────────────────────────────────────────── */
const cnt = (h, re) => (h.match(re) ?? []).length;

/* 공유 렌더러(ContentRenderer)에 정의가 없는 sd-* 클래스를 쓰는 문서는 무스타일로 렌더된다.
   공용 패키지는 이번 WO 범위 밖이므로 해당 문서는 생산하지 않고 RENDER_FAILURE 로 큐에 남긴다(§6·§7). */
const CSS_SRC = (fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8')
  .match(/const storeDescriptionCss = `([\s\S]*?)`;/) ?? [])[1];
if (!CSS_SRC) { console.error('STORE_DESC_CSS_NOT_FOUND'); process.exit(1); }
const DEFINED_CLS = new Set([...CSS_SRC.matchAll(/\.store-desc-content\s+\.([a-zA-Z0-9_-]+)/g)].map((m) => m[1])
  .concat([...CSS_SRC.matchAll(/\.([a-z][a-zA-Z0-9_-]*)\s*[,{]/g)].map((m) => m[1])));
const undefinedCls = (html) => [...new Set((html.match(/class="([^"]*)"/g) ?? [])
  .flatMap((m) => m.slice(7, -1).split(/\s+/)))].filter((c) => c.startsWith('sd-') && !DEFINED_CLS.has(c));

const targets = [], notProduced = [], issues = [];
const missTally = new Map();
for (const row of pool) {
  if (!row.content || !/<h2|<li/.test(row.content)) {
    issues.push({ batch: 'batch04', productMasterId: row.master_id, koCanonicalId: row.id, productName: row.product_name,
      issueType: 'KO_SOURCE_DAMAGED', problematicSourceText: String(row.content ?? '').slice(0, 200),
      requiredNextAction: 'KO canonical 본문 구조 복구 후 재시도', retryCondition: 'KO canonical 이 h2/li 구조를 갖춘 뒤' });
    continue;
  }
  const b = build(row.content);
  if (b.misses.length || b.hangul) {
    const drift = b.misses.find((m) => m.why === 'NUMBER_DRIFT');
    if (drift) {
      issues.push({ batch: 'batch04', productMasterId: row.master_id, koCanonicalId: row.id, productName: row.product_name,
        issueType: 'NUMBER_STRUCTURE_AMBIGUOUS', problematicSourceText: drift.text.slice(0, 200),
        requiredNextAction: '수치·단위 구조를 슬롯 단위로 재확인하고 번역 규칙을 보강', retryCondition: '해당 문구의 수치 보존이 확인된 뒤' });
    }
    /* 슬롯은 모두 옮겼는데 본문에 한글이 남는 문서 — 번역 판단이 서지 않는 구간이 있다는 뜻이다(§6). */
    if (!b.misses.length) {
      const left = (stripKeep(b.html.replace(/<h1[^>]*>[\s\S]*?(?=<small|<\/h1>)/g, ' ').replace(/<[^>]+>/g, ' ')).match(/[^\s]*[가-힣][^\s]*/g) ?? []).slice(0, 6).join(' ');
      issues.push({ batch: 'batch04', productMasterId: row.master_id, koCanonicalId: row.id, productName: row.product_name,
        issueType: 'TRANSLATION_AMBIGUOUS', problematicSourceText: left.slice(0, 200),
        requiredNextAction: '해당 구간의 중국어 대응 문구를 확정하고 번역 규칙에 반영', retryCondition: '남은 한국어 구간의 번역이 확정된 뒤' });
    }
    notProduced.push({ productMasterId: row.master_id, why: b.misses.length ? b.misses[0].why : 'HANGUL_REMAINS' });
    for (const m of b.misses.slice(0, 4)) {
      const k = `${m.why}|${m.kind}|${m.text.slice(0, 160)}`;
      missTally.set(k, (missTally.get(k) ?? 0) + 1);
    }
    if (!b.misses.length) missTally.set(`HANGUL_REMAINS|${row.master_id}`, 1);
    continue;
  }
  const parityBroken = parityBreak(row.content, b.html);
  if (parityBroken) {
    issues.push({ batch: 'batch04', productMasterId: row.master_id, koCanonicalId: row.id, productName: row.product_name,
      issueType: 'CANONICAL_STRUCTURE_UNSAFE', problematicSourceText: `structure parity broken: ${parityBroken}`,
      requiredNextAction: '슬롯 치환 규칙이 구조를 변형하지 않도록 수정', retryCondition: '구조 패리티가 일치한 뒤' });
    notProduced.push({ productMasterId: row.master_id, why: 'PARITY' });
    continue;
  }
  const undef = undefinedCls(b.html);
  if (undef.length) {
    issues.push({ batch: 'batch04', productMasterId: row.master_id, koCanonicalId: row.id, productName: row.product_name,
      issueType: 'RENDER_FAILURE', problematicSourceText: `undefined renderer class: ${undef.join(', ')}`,
      requiredNextAction: '공유 렌더러(ContentRenderer)에 해당 sd-* 클래스 스타일을 추가하거나 KO canonical 구조를 정의된 클래스로 교정한 뒤 재생산',
      retryCondition: '렌더러 클래스 정의가 확인된 뒤' });
    notProduced.push({ productMasterId: row.master_id, why: 'UNDEFINED_CLASS' });
    continue;
  }
  targets.push({
    op: 'INSERT', productMasterId: row.master_id, productNameKo: row.product_name,
    koCanonicalId: row.id, koHash: sha(row.content),
    newContent: b.html, newContentHash: sha(b.html),
  });
}

fs.writeFileSync(`${CACHE}/hff-zh-b04-render-blockers.json`,
  JSON.stringify([...missTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 400).map(([k, n]) => ({ n, k })), null, 1));
if (targets.length < TARGET) {
  console.error(JSON.stringify({ verdict: 'STOP', reason: 'POPULATION_NOT_EXACTLY_10000', got: targets.length }, null, 1));
  process.exit(2);
}
const produced = targets.length;
targets.length = TARGET;
/* 렌더 단계에서 KO 본문 40,918건을 통째로 들고 있으면 JSDOM 과 겹쳐 heap 이 터진다.
   실제로 필요한 것은 개별인정번호뿐이므로 번호만 남기고 pool 을 해제한다. */
const licenseByMaster = new Map(targets.map((t) => [t.productMasterId, []]));
for (const r of pool) {
  const arr = licenseByMaster.get(r.master_id);
  if (!arr) continue;
  for (const s of r.content.match(/제?\s?\d{4}-\d+\s?호?/g) ?? []) {
    const no = (s.match(/\d{4}-\d+/) ?? [''])[0];
    if (no) arr.push(no);
  }
}
const poolCount = pool.length;
pool.length = 0;
clearMemo();
global.gc?.();

/* ── 렌더 검증 (430 · 820 · 1280) ─────────────────────────────── */
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
/* 렌더는 워커 프로세스가 수행한다 — JSDOM 잔여 메모리를 프로세스 종료로 회수한다. */
const TASKS = `${CACHE}/hff-zh-b04-render-tasks.jsonl`;
fs.writeFileSync(TASKS, SAFE.map((t) => JSON.stringify({
  m: t.productMasterId, p: t.productNameKo, h: t.newContent, lic: licenseByMaster.get(t.productMasterId) ?? [],
})).join('\n') + (SAFE.length ? '\n' : ''));

const WIDTHS = [430, 820, 1280];
const counters = {
  structureParity: 0, pageOverflow: 0, elementOverflow: 0, clipped: 0,
  emptyH2: 0, emptyUl: 0, emptyLi: 0,
  undefinedClass: 0, rawHtml: 0, hangulVisible: 0, markerVisible: 0,
  labelLost: 0, licenseNoLost: 0,
};
const failures = [];
let renders = 0;
const CHUNK = 400, CONC = 4;
const chunks = [];
for (let i = 0; i < SAFE.length; i += CHUNK) chunks.push(i);
const runChunk = (i) => new Promise((resolve, reject) => {
  const out = `${CACHE}/hff-zh-b04-render-part-${i}.json`;
  const ch = spawn(process.execPath, ['--max-old-space-size=4096',
    'apps/api-server/src/scripts/hff-zh-b01-render-worker.mjs', TASKS, String(i), String(Math.min(i + CHUNK, SAFE.length)), out],
  { stdio: ['ignore', 'inherit', 'inherit'] });
  ch.on('exit', (code) => (code === 0 ? resolve(JSON.parse(fs.readFileSync(out, 'utf8'))) : reject(new Error(`chunk ${i} exit ${code}`))));
});
let done = 0;
const queue = chunks.slice();
const worker = async () => {
  for (let i = queue.shift(); i !== undefined; i = queue.shift()) {
    const part = await runChunk(i);
    renders += part.renders;
    for (const k of Object.keys(counters)) counters[k] += part.counters[k] ?? 0;
    for (const f of part.failures) if (failures.length < 60) failures.push(f);
    done += part.docs;
    process.stderr.write(`rendered ${done}/${SAFE.length}\n`);
  }
};
try { await Promise.all(Array.from({ length: CONC }, worker)); }
catch (e) { console.error(JSON.stringify({ verdict: 'STOP', reason: 'RENDER_FAILURE', detail: String(e.message) }, null, 1)); process.exit(3); }
for (const i of chunks) fs.rmSync(`${CACHE}/hff-zh-b04-render-part-${i}.json`, { force: true });

const total = Object.values(counters).reduce((a, b) => a + b, 0);
const dup = targets.length - new Set(targets.map((t) => t.productMasterId)).size
          + targets.length - new Set(targets.map((t) => t.koCanonicalId)).size;
/* 재검증 대상(sd-fn RENDER_FAILURE)이 이번 배치에서 실제로 생산되면 기존 큐 항목을 해소한다.
   생산되지 않았으면 그대로 유지한다(§6). */
const PRODUCED_SET = new Set(targets.map((t) => t.productMasterId));
const retryResolved = [...RETRY].filter((m) => PRODUCED_SET.has(m));
const resolved = new Set(retryResolved);
const audit = {
  wo: WO, renderedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  globalsBefore, poolWithoutZh: poolCount, excludedFromPool: excludedCount, priorQueueCarried: PRIOR_QUEUE.length, targets: targets.length, canonicalDup: dup,
  producedCandidates: produced, notProducedInBatch: poolCount - produced,
  notProducedByWhy: notProduced.reduce((a, b) => { a[b.why] = (a[b.why] ?? 0) + 1; return a; }, {}),
  documentsRendered: SAFE.length, structureSignatures: seenSig.size,
  coverage: 'signature-exhaustive + high-risk full', widths: WIDTHS, renders,
  counters, totalIssues: total,
  verdict: total === 0 && dup === 0 && targets.length === TARGET ? 'PASS' : 'FAIL',
  failures: failures.slice(0, 25),
  issueQueue: issues.length, retryCandidates: RETRY.size, retryResolved: retryResolved.length,
  issueByType: issues.reduce((a, b) => { a[b.issueType] = (a[b.issueType] ?? 0) + 1; return a; }, {}),
};
fs.writeFileSync(`${D}/hff-zh-b04-safe-targets-v1.json`, JSON.stringify({ wo: WO, generatedAt: audit.renderedAt, count: targets.length, targets }, null, 1));
fs.writeFileSync(`${D}/hff-zh-b04-render-audit-v1.json`, JSON.stringify(audit, null, 1));
const mergedQueue =[...PRIOR_QUEUE.filter((q) => !resolved.has(q.productMasterId)), ...issues];
fs.writeFileSync(`${D}/hff-zh-deferred-issue-queue-through-batch04-v1.jsonl`, mergedQueue.map((x) => JSON.stringify(x)).join('\n') + (mergedQueue.length ? '\n' : ''));
fs.writeFileSync(`${D}/hff-zh-deferred-issue-queue-through-batch04-summary-v1.json`, JSON.stringify({
  wo: WO, generatedAt: audit.renderedAt, total: mergedQueue.length, carriedForward: PRIOR_QUEUE.length - resolved.size,
  resolvedFromPriorQueue: resolved.size, addedByBatch03: issues.length,
  byType: mergedQueue.reduce((a, b) => { a[b.issueType] = (a[b.issueType] ?? 0) + 1; return a; }, {}),
  uniqueProductMasters: new Set(mergedQueue.map((x) => x.productMasterId)).size,
}, null, 1));
console.log(JSON.stringify({ ...audit, failures: audit.failures.slice(0, 8) }, null, 2));
