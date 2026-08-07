/**
 * WO-O4O-HFF-JA-REMAINING-16162-PHRASE-AUTHORING-STRUCTURED-COMPRESSION-AND-CONTINUOUS-SHARDS-V1 §3
 *
 * 잔여 전량(13,504) 중 **현재 자산으로 열린 문서**를 JA canonical 로 만들고 렌더 검증한다.
 *   - DB 는 read-only. write 0.
 *   - KO canonical HTML 을 템플릿으로 두고 텍스트 슬롯만 치환한다(구조 불변 → renderer family 승계).
 *   - 이번 WO 는 자산을 **동결하지 않는다**. 저작이 진행될수록 열리는 문서가 늘어나므로
 *     "이번 실행 시점에 열린 전량"이 배치다. 상한을 두지 않는다.
 *   - b03 까지 없던 **조립 사고 게이트**(hff-ja-b04-gate)를 통과해야 생산한다.
 *     수치·한글 검사를 통과하면서 뜻이 망가지는 사고가 실측됐기 때문이다.
 *
 * 산출: data/hff-ja-b04-safe-targets-v1.json · data/hff-ja-b04-render-audit-v1.json · data/hff-ja-b04-ids-v1.json
 *       data/hff-ja-deferred-issue-queue-v1.jsonl (기존 승계 + batch04 누적)
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { build, parityBreak, stripKeep } from './hff-ja-b01-build.mjs';
import { clearMemo } from './hff-ja-b01-translate.mjs';
import { scanDocument } from './hff-ja-b04-gate.mjs';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const WO = 'WO-O4O-HFF-JA-REMAINING-16162-PHRASE-AUTHORING-STRUCTURED-COMPRESSION-AND-CONTINUOUS-SHARDS-V1';
const BATCH = 'batch04';
const SRC = `${CACHE}/hff-ja-b04-ko-source.jsonl`;
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const SPLIT_NL = new RegExp(String.fromCharCode(92) + 'r?' + String.fromCharCode(92) + 'n');
const rdl = (f) => (fs.existsSync(`${D}/${f}`)
  ? fs.readFileSync(`${D}/${f}`, 'utf8').split(SPLIT_NL).filter(Boolean).map((l) => JSON.parse(l)) : []);

/* 모집단은 측정과 **같은 캐시**를 쓴다 — 측정과 생산이 다른 집합을 보면 배치가 어긋난다.
   캐시는 hff-ja-b04-measure.mjs 가 DB read-only 로 만든 잔여 전량이다. */
if (!fs.existsSync(SRC)) { console.error('NO_KO_SOURCE_CACHE — run hff-ja-b04-measure.mjs first'); process.exit(1); }
const pool = fs.readFileSync(SRC, 'utf8').split(SPLIT_NL).filter(Boolean).map((l) => JSON.parse(l));
const PRIOR_QUEUE = rdl('hff-ja-deferred-issue-queue-v1.jsonl');

/* 공유 렌더러에 정의가 없는 sd-* 클래스를 쓰는 문서는 무스타일로 렌더된다 → 생산하지 않는다. */
const CSS_SRC = (fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8')
  .match(/const storeDescriptionCss = `([\s\S]*?)`;/) ?? [])[1];
if (!CSS_SRC) { console.error('STORE_DESC_CSS_NOT_FOUND'); process.exit(1); }
const DEFINED_CLS = new Set([...CSS_SRC.matchAll(/\.store-desc-content\s+\.([a-zA-Z0-9_-]+)/g)].map((m) => m[1])
  .concat([...CSS_SRC.matchAll(/\.([a-z][a-zA-Z0-9_-]*)\s*[,{]/g)].map((m) => m[1])));
const undefinedCls = (html) => [...new Set((html.match(/class="([^"]*)"/g) ?? [])
  .flatMap((m) => m.slice(7, -1).split(/\s+/)))].filter((x) => x.startsWith('sd-') && !DEFINED_CLS.has(x));

const Q = (row, issueType, text, action, retry) => ({
  batch: BATCH, productMasterId: row.m, koCanonicalId: row.k, productName: row.n,
  issueType, problematicSourceText: String(text ?? '').slice(0, 200), requiredNextAction: action, retryCondition: retry,
});

const targets = [], notProduced = [], issues = [];
const missTally = new Map();
for (const row of pool) {
  if (!row.c || !/<h2|<li/.test(row.c)) {
    issues.push(Q(row, 'KO_SOURCE_DAMAGED', row.c, 'KO canonical 본문 구조 복구 후 재시도', 'KO canonical 이 h2/li 구조를 갖춘 뒤'));
    continue;
  }
  const b = build(row.c);
  if (b.misses.length || b.hangul || b.simplified) {
    const drift = b.misses.find((m) => m.why === 'NUMBER_DRIFT');
    if (drift) {
      issues.push(Q(row, 'NUMBER_STRUCTURE_AMBIGUOUS', drift.text,
        '수치·단위 구조를 슬롯 단위로 재확인하고 번역 규칙을 보강', '해당 문구의 수치 보존이 확인된 뒤'));
    }
    notProduced.push({ productMasterId: row.m, why: b.misses.length ? b.misses[0].why : (b.hangul ? 'HANGUL_REMAINS' : 'SIMPLIFIED_REMAINS') });
    for (const m of b.misses) {
      const k = `${m.why}|${m.kind}|${m.text.slice(0, 160)}`;
      missTally.set(k, (missTally.get(k) ?? 0) + 1);
    }
    continue;
  }
  const parityBroken = parityBreak(row.c, b.html);
  if (parityBroken) {
    issues.push(Q(row, 'CANONICAL_STRUCTURE_UNSAFE', `structure parity broken: ${parityBroken}`,
      '슬롯 치환 규칙이 구조를 변형하지 않도록 수정', '구조 패리티가 일치한 뒤'));
    notProduced.push({ productMasterId: row.m, why: 'PARITY' });
    continue;
  }
  /* 조립 사고 게이트 — 수치·한글 검사를 통과하면서 뜻이 망가진 문서를 여기서 막는다. */
  const gate = scanDocument(row.c, b.html);
  if (gate) {
    issues.push(Q(row, 'TRANSLATION_AMBIGUOUS', `assembly defect: ${gate}`,
      '해당 구간의 조립 규칙 또는 사전 항목을 분리 저작해 조사·수식 중복과 문장 경계 소실을 제거',
      '조립 사고 게이트를 통과한 뒤'));
    notProduced.push({ productMasterId: row.m, why: `GATE_${gate}` });
    continue;
  }
  const undef = undefinedCls(b.html);
  if (undef.length) {
    issues.push(Q(row, 'RENDER_FAILURE', `undefined renderer class: ${undef.join(', ')}`,
      '공유 렌더러(ContentRenderer)에 해당 sd-* 클래스 스타일을 추가하거나 KO canonical 구조를 정의된 클래스로 교정한 뒤 재생산',
      '렌더러 클래스 정의가 확인된 뒤'));
    notProduced.push({ productMasterId: row.m, why: 'UNDEFINED_CLASS' });
    continue;
  }
  targets.push({
    op: 'INSERT', productMasterId: row.m, productNameKo: row.n,
    koCanonicalId: row.k, koHash: sha(row.c),
    newContent: b.html, newContentHash: sha(b.html),
  });
}

fs.writeFileSync(`${CACHE}/hff-ja-b04-render-blockers.json`,
  JSON.stringify([...missTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 600).map(([k, n]) => ({ n, k })), null, 1));

const produced = targets.length;
const licenseByMaster = new Map(targets.map((t) => [t.productMasterId, []]));
for (const r of pool) {
  const arr = licenseByMaster.get(r.m);
  if (!arr) continue;
  for (const s of r.c.match(/제?\s?\d{4}-\d+\s?호?/g) ?? []) {
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
const TASKS = `${CACHE}/hff-ja-b04-render-tasks.jsonl`;
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
  const out = `${CACHE}/hff-ja-b04-render-part-${i}.json`;
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
for (const i of chunks) fs.rmSync(`${CACHE}/hff-ja-b04-render-part-${i}.json`, { force: true });

const total = Object.values(counters).reduce((a, b) => a + b, 0);
const dup = targets.length - new Set(targets.map((t) => t.productMasterId)).size
          + targets.length - new Set(targets.map((t) => t.koCanonicalId)).size;

/* 문제 큐: 기존 승계 + batch04 누적. 이번 배치로 생산된 제품은 큐에서 내린다. */
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
const resolvedFromPrior = PRIOR_QUEUE.filter((q) => IN_BATCH.has(q.productMasterId)).length;

const audit = {
  wo: WO, batch: BATCH, renderedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  poolWithoutJa: poolCount,
  targets: targets.length, batchSize: targets.length, canonicalDup: dup, truncated: false,
  producedCandidates: produced, notProducedInPool: poolCount - produced,
  notProducedByWhy: notProduced.reduce((a, b) => { a[b.why] = (a[b.why] ?? 0) + 1; return a; }, {}),
  remainingAfterBatch: poolCount - produced,
  nextRoundDistinctBlockingPhrases: missTally.size,
  documentsRendered: SAFE.length, structureSignatures: seenSig.size,
  coverage: 'signature-exhaustive + high-risk full', widths: WIDTHS, renders,
  counters, totalIssues: total,
  verdict: total === 0 && dup === 0 && targets.length > 0 ? 'PASS' : 'FAIL',
  failures: failures.slice(0, 25),
  issueQueue: merged.length, issueQueueNew: merged.filter((q) => q.batch === BATCH).length,
  issueQueueResolvedFromPrior: resolvedFromPrior,
  issueByType: merged.reduce((a, b) => { a[b.issueType] = (a[b.issueType] ?? 0) + 1; return a; }, {}),
};
fs.writeFileSync(`${D}/hff-ja-b04-safe-targets-v1.json`, JSON.stringify({ wo: WO, generatedAt: audit.renderedAt, count: targets.length, targets }, null, 1));
fs.writeFileSync(`${D}/hff-ja-b04-render-audit-v1.json`, JSON.stringify(audit, null, 1));
fs.writeFileSync(`${D}/hff-ja-b04-ids-v1.json`, JSON.stringify({
  wo: WO, generatedAt: audit.renderedAt, count: targets.length,
  idsHash: sha(targets.map((t) => t.productMasterId).join(',')),
  ids: targets.map((t) => t.productMasterId),
}, null, 1));
fs.writeFileSync(`${D}/hff-ja-deferred-issue-queue-v1.jsonl`, merged.map((x) => JSON.stringify(x)).join('\n') + (merged.length ? '\n' : ''));
console.log(JSON.stringify({ ...audit, failures: audit.failures.slice(0, 8) }, null, 2));
