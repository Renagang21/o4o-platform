/**
 * WO-O4O-HFF-JA-ALL-CURRENTLY-PRODUCIBLE-7414-DIRECT-BULK-PRODUCTION-V1  §3 / §4 / §6 / §7
 *
 * HFF KO canonical → JA canonical 생성(메모리) + 렌더 검증 + Batch 03 모집단 고정.
 *   - DB 는 read-only. write 0.
 *   - KO canonical HTML 을 템플릿으로 두고 **텍스트 슬롯만** 치환한다(구조 불변 → renderer family 승계).
 *   - 모집단은 §3 그대로다: JA 부재 · KO 영구 HOLD 제외 · 현재 자산으로 build 가능한 **전량**.
 *     상한을 두지 않는다 — 과거 수치(7,414)를 맞추려고 임의 절단하지 않고, 착수 시점에 재현되는
 *     현재 생산 가능 전량을 그대로 배치로 고정한다. 미생산분을 대기 HOLD 로 남기는 방식도 쓰지 않는다(§4 금지 사유).
 *   - 저작 자산은 이 WO 에서 동결한다(신규 라운드 없음). "현재 자산·규칙 기준" 이 모집단의 정의이기 때문이다.
 *
 * 산출: data/hff-ja-b03-safe-targets-v1.json · data/hff-ja-b03-render-audit-v1.json · data/hff-ja-b03-ids-v1.json
 *       data/hff-ja-deferred-issue-queue-v1.jsonl (batch01 승계 + batch03 누적)
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { spawn } from 'node:child_process';
import { build, parityBreak, stripKeep } from './hff-ja-b01-build.mjs';
import { clearMemo } from './hff-ja-b01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const WO = 'WO-O4O-HFF-JA-ALL-CURRENTLY-PRODUCIBLE-7414-DIRECT-BULK-PRODUCTION-V1';
const BATCH = 'batch03';
/* 직전 배치가 보고한 생산 가능 후보. 상한이 아니라 **재현 대조 기준선**이다(§3). */
const BASELINE = 7414;
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');

/* ── KO canonical 모집단 (read-only) ──────────────────────────── */
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const SPLIT_NL = new RegExp(String.fromCharCode(92) + 'r?' + String.fromCharCode(92) + 'n');
const rdl = (f) => (fs.existsSync(`${D}/${f}`)
  ? fs.readFileSync(`${D}/${f}`, 'utf8').split(SPLIT_NL).filter(Boolean).map((l) => JSON.parse(l)) : []);
/* KO 영구 HOLD 는 원문 자체가 확정되지 않은 문서다 — 번역 기준본이 될 수 없으므로 제외한다(§6). */
const EXCLUDE = new Set(rdl('hff-ko-agent-09-hold-queue-v1.jsonl').map((h) => h.productMasterId).filter(Boolean));
/* Batch 01 이 남긴 문제 큐. 승계 대상이며, 이번에 정상 생산되면 그 행은 큐에서 내려간다(§6). */
const PRIOR_QUEUE = rdl('hff-ja-deferred-issue-queue-v1.jsonl');

const poolRaw = (await c.query(`
  SELECT k.master_id, k.id, k.content, pm.name AS product_name
    FROM shared_product_descriptions k
    JOIN product_masters pm ON pm.id = k.master_id
   WHERE k.deleted_at IS NULL AND k.source_type='o4o_hff_generated'
     AND k.description_type='STORE' AND k.status='canonical'
     AND coalesce(k.language,'ko')='ko'
     AND NOT EXISTS (
       SELECT 1 FROM shared_product_descriptions j
        WHERE j.master_id = k.master_id AND j.deleted_at IS NULL
          AND j.source_type='o4o_hff_generated' AND j.description_type='STORE'
          AND j.status='canonical' AND j.language='ja')
   ORDER BY k.master_id`)).rows;
const pool = poolRaw.filter((r) => !EXCLUDE.has(r.master_id));
const excludedCount = poolRaw.length - pool.length;
const globalsBefore = (await c.query(`
  SELECT count(*) FILTER (WHERE coalesce(language,'ko')='ko') ko,
         count(*) FILTER (WHERE language='en') en,
         count(*) FILTER (WHERE language='zh') zh,
         count(*) FILTER (WHERE language='ja') ja
    FROM shared_product_descriptions
   WHERE deleted_at IS NULL AND source_type='o4o_hff_generated'
     AND description_type='STORE' AND status='canonical'`)).rows[0];
await c.end();

const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';

/* 공유 렌더러(ContentRenderer)에 정의가 없는 sd-* 클래스를 쓰는 문서는 무스타일로 렌더된다.
   공용 패키지는 이번 WO 범위 밖이므로 생산하지 않고 RENDER_FAILURE 로 큐에 남긴다(§6). */
const CSS_SRC = (fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8')
  .match(/const storeDescriptionCss = `([\s\S]*?)`;/) ?? [])[1];
if (!CSS_SRC) { console.error('STORE_DESC_CSS_NOT_FOUND'); process.exit(1); }
const DEFINED_CLS = new Set([...CSS_SRC.matchAll(/\.store-desc-content\s+\.([a-zA-Z0-9_-]+)/g)].map((m) => m[1])
  .concat([...CSS_SRC.matchAll(/\.([a-z][a-zA-Z0-9_-]*)\s*[,{]/g)].map((m) => m[1])));
const undefinedCls = (html) => [...new Set((html.match(/class="([^"]*)"/g) ?? [])
  .flatMap((m) => m.slice(7, -1).split(/\s+/)))].filter((x) => x.startsWith('sd-') && !DEFINED_CLS.has(x));

const Q = (row, issueType, text, action, retry) => ({
  batch: BATCH, productMasterId: row.master_id, koCanonicalId: row.id, productName: row.product_name,
  issueType, problematicSourceText: String(text ?? '').slice(0, 200), requiredNextAction: action, retryCondition: retry,
});

const targets = [], notProduced = [], issues = [];
const missTally = new Map();
for (const row of pool) {
  if (!row.content || !/<h2|<li/.test(row.content)) {
    issues.push(Q(row, 'KO_SOURCE_DAMAGED', row.content, 'KO canonical 본문 구조 복구 후 재시도', 'KO canonical 이 h2/li 구조를 갖춘 뒤'));
    continue;
  }
  const b = build(row.content);
  if (b.misses.length || b.hangul || b.simplified) {
    const drift = b.misses.find((m) => m.why === 'NUMBER_DRIFT');
    if (drift) {
      issues.push(Q(row, 'NUMBER_STRUCTURE_AMBIGUOUS', drift.text,
        '수치·단위 구조를 슬롯 단위로 재확인하고 번역 규칙을 보강', '해당 문구의 수치 보존이 확인된 뒤'));
    }
    /* 슬롯은 모두 옮겼는데 본문에 한글/간체자가 남는 문서 — 번역 판단이 서지 않는 구간이 있다는 뜻이다(§5). */
    if (!b.misses.length) {
      const left = (stripKeep(b.html.replace(/<h1[^>]*>[\s\S]*?(?=<small|<\/h1>)/g, ' ').replace(/<[^>]+>/g, ' ')).match(/[^\s]*[가-힣][^\s]*/g) ?? []).slice(0, 6).join(' ');
      issues.push(Q(row, 'TRANSLATION_AMBIGUOUS', left || 'simplified-chinese remains',
        '해당 구간의 일본어 대응 문구를 확정하고 번역 규칙에 반영', '남은 한국어 구간의 번역이 확정된 뒤'));
    }
    notProduced.push({ productMasterId: row.master_id, why: b.misses.length ? b.misses[0].why : (b.hangul ? 'HANGUL_REMAINS' : 'SIMPLIFIED_REMAINS') });
    for (const m of b.misses.slice(0, 4)) {
      const k = `${m.why}|${m.kind}|${m.text.slice(0, 160)}`;
      missTally.set(k, (missTally.get(k) ?? 0) + 1);
    }
    continue;
  }
  const parityBroken = parityBreak(row.content, b.html);
  if (parityBroken) {
    issues.push(Q(row, 'CANONICAL_STRUCTURE_UNSAFE', `structure parity broken: ${parityBroken}`,
      '슬롯 치환 규칙이 구조를 변형하지 않도록 수정', '구조 패리티가 일치한 뒤'));
    notProduced.push({ productMasterId: row.master_id, why: 'PARITY' });
    continue;
  }
  const undef = undefinedCls(b.html);
  if (undef.length) {
    issues.push(Q(row, 'RENDER_FAILURE', `undefined renderer class: ${undef.join(', ')}`,
      '공유 렌더러(ContentRenderer)에 해당 sd-* 클래스 스타일을 추가하거나 KO canonical 구조를 정의된 클래스로 교정한 뒤 재생산',
      '렌더러 클래스 정의가 확인된 뒤'));
    notProduced.push({ productMasterId: row.master_id, why: 'UNDEFINED_CLASS' });
    continue;
  }
  targets.push({
    op: 'INSERT', productMasterId: row.master_id, productNameKo: row.product_name,
    koCanonicalId: row.id, koHash: sha(row.content),
    newContent: b.html, newContentHash: sha(b.html),
  });
}

fs.writeFileSync(`${CACHE}/hff-ja-b03-render-blockers.json`,
  JSON.stringify([...missTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 400).map(([k, n]) => ({ n, k })), null, 1));

/* §3: 생산 가능 전량이 곧 배치다. 절단하지 않는다. */
const produced = targets.length;
const batchSize = produced;
const baselineDelta = produced - BASELINE;

/* 렌더 단계에서 KO 본문 전량을 들고 있으면 JSDOM 과 겹쳐 heap 이 터진다. 개별인정번호만 남기고 해제한다. */
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
const cnt = (h, re) => (h.match(re) ?? []).length;
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
const TASKS = `${CACHE}/hff-ja-b03-render-tasks.jsonl`;
fs.writeFileSync(TASKS, SAFE.map((t) => JSON.stringify({
  m: t.productMasterId, p: t.productNameKo, h: t.newContent, lic: licenseByMaster.get(t.productMasterId) ?? [],
})).join('\n') + (SAFE.length ? '\n' : ''));

const WIDTHS = [430, 820, 1280];
const counters = {
  structureParity: 0, pageOverflow: 0, elementOverflow: 0, clipped: 0,
  emptyH2: 0, emptyUl: 0, emptyLi: 0,
  undefinedClass: 0, rawHtml: 0, hangulVisible: 0, markerVisible: 0,
  labelLost: 0, licenseNoLost: 0, simplifiedVisible: 0,
};
const failures = [];
let renders = 0;
const CHUNK = 400, CONC = 4;
const chunks = [];
for (let i = 0; i < SAFE.length; i += CHUNK) chunks.push(i);
const runChunk = (i) => new Promise((resolve, reject) => {
  const out = `${CACHE}/hff-ja-b03-render-part-${i}.json`;
  const ch = spawn(process.execPath, ['--max-old-space-size=4096',
    'apps/api-server/src/scripts/hff-ja-b01-render-worker.mjs', TASKS, String(i), String(Math.min(i + CHUNK, SAFE.length)), out],
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
for (const i of chunks) fs.rmSync(`${CACHE}/hff-ja-b03-render-part-${i}.json`, { force: true });

const total = Object.values(counters).reduce((a, b) => a + b, 0);
const dup = targets.length - new Set(targets.map((t) => t.productMasterId)).size
          + targets.length - new Set(targets.map((t) => t.koCanonicalId)).size;

/* ── 문제 큐: batch01 승계 + batch03 누적 ─────────────────────────
   이번 배치로 생산된 제품은 큐에서 내린다 — 해결된 제품을 문제로 남기지 않는다(§6). */
const IN_BATCH = new Set(targets.map((t) => t.productMasterId));
const merged = [];
const qSeen = new Set();
for (const q of [...PRIOR_QUEUE, ...issues]) {
  if (IN_BATCH.has(q.productMasterId)) continue;
  const k = `${q.productMasterId}|${q.issueType}`;
  if (qSeen.has(k)) continue;
  qSeen.add(k);
  merged.push(q);
}
const carriedOver = merged.filter((q) => q.batch !== BATCH).length;
const resolvedFromPrior = PRIOR_QUEUE.filter((q) => IN_BATCH.has(q.productMasterId)).length;

const audit = {
  wo: WO, batch: BATCH, renderedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  globalsBefore, poolWithoutJa: poolCount, excludedFromPool: excludedCount,
  targets: targets.length, batchSize, canonicalDup: dup,
  baseline: BASELINE, baselineDelta, truncated: false,
  producedCandidates: produced, notProducedInPool: poolCount - produced,
  notProducedByWhy: notProduced.reduce((a, b) => { a[b.why] = (a[b.why] ?? 0) + 1; return a; }, {}),
  remainingProducibleAfterBatch: 0,
  /* §9 다음 단계 추정치 — 이번 배치 이후 남는 미생산 문서와, 그것을 막고 있는 서로 다른 미해결 문구 수. */
  nextRoundDocumentsNeedingTranslation: poolCount - produced,
  nextRoundDistinctBlockingPhrases: missTally.size,
  documentsRendered: SAFE.length, structureSignatures: seenSig.size,
  coverage: 'signature-exhaustive + high-risk full', widths: WIDTHS, renders,
  counters, totalIssues: total,
  verdict: total === 0 && dup === 0 && targets.length === batchSize && batchSize > 0 ? 'PASS' : 'FAIL',
  failures: failures.slice(0, 25),
  issueQueue: merged.length, issueQueueNew: merged.filter((q) => q.batch === BATCH).length,
  issueQueueCarriedOver: carriedOver, issueQueueResolvedFromPrior: resolvedFromPrior,
  issueByType: merged.reduce((a, b) => { a[b.issueType] = (a[b.issueType] ?? 0) + 1; return a; }, {}),
};
fs.writeFileSync(`${D}/hff-ja-b03-safe-targets-v1.json`, JSON.stringify({ wo: WO, generatedAt: audit.renderedAt, count: targets.length, targets }, null, 1));
fs.writeFileSync(`${D}/hff-ja-b03-render-audit-v1.json`, JSON.stringify(audit, null, 1));
/* 같은 KO·자산·규칙이면 같은 배치가 재현돼야 한다(§3) — 재현 확인용 원장. */
fs.writeFileSync(`${D}/hff-ja-b03-ids-v1.json`, JSON.stringify({
  wo: WO, generatedAt: audit.renderedAt, count: targets.length,
  idsHash: sha(targets.map((t) => t.productMasterId).join(',')),
  ids: targets.map((t) => t.productMasterId),
}, null, 1));
fs.writeFileSync(`${D}/hff-ja-deferred-issue-queue-v1.jsonl`, merged.map((x) => JSON.stringify(x)).join('\n') + (merged.length ? '\n' : ''));
fs.writeFileSync(`${D}/hff-ja-deferred-issue-queue-summary-v1.json`, JSON.stringify({
  wo: WO, generatedAt: audit.renderedAt, total: merged.length,
  byBatch: merged.reduce((a, b) => { a[b.batch] = (a[b.batch] ?? 0) + 1; return a; }, {}),
  byType: merged.reduce((a, b) => { a[b.issueType] = (a[b.issueType] ?? 0) + 1; return a; }, {}),
  uniqueProductMasters: new Set(merged.map((x) => x.productMasterId)).size,
  resolvedFromPriorBatch: resolvedFromPrior,
}, null, 1));
console.log(JSON.stringify({ ...audit, failures: audit.failures.slice(0, 8) }, null, 2));
