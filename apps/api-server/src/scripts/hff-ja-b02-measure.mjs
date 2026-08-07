/**
 * WO-O4O-HFF-JA-BATCH-02-10000-DIRECT-BULK-PRODUCTION-V1  §4 저작 라운드 측정
 *
 * Batch 01 이 끝난 뒤 **JA 가 아직 없는 잔여 풀 전체**에 현재 엔진·사전을 적용해
 * 무엇이 열리고 무엇이 안 열리는지만 센다. DB 는 KO 원문 캐시를 만들 때 한 번만
 * read-only 로 읽고, 이후 라운드는 전부 오프라인이다(Batch 01 과 같은 축).
 *
 * 산출: data/hff-ja-b02-measure-v1.json (진행률 + 다음 라운드 저작 대상)
 * 사용: node ...b02-measure.mjs            → 캐시가 없으면 DB 에서 만든다(PGPW 필요)
 *       JA_OFFLINE=1 node ...b02-measure.mjs → 캐시만 사용(자격증명 불필요)
 */
import fs from 'node:fs';
import { build } from './hff-ja-b01-build.mjs';
import { FAILED, dictSize, authoredRounds, clearMemo } from './hff-ja-b01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const SRC = `${CACHE}/hff-ja-b02-ko-source.jsonl`;
fs.mkdirSync(CACHE, { recursive: true });

const SPLIT_NL = new RegExp(String.fromCharCode(92) + 'r?' + String.fromCharCode(92) + 'n');

if (!fs.existsSync(SRC)) {
  if (process.env.JA_OFFLINE) { console.error('NO_CACHE'); process.exit(1); }
  const { default: pg } = await import('pg');
  const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
  await c.connect();
  await c.query('SET default_transaction_read_only = on');
  if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }
  /* 렌더 단계와 **같은 모집단 정의**를 쓴다 — 측정과 생산이 다른 집합을 보면 라운드가 헛돈다. */
  const rows = (await c.query(`
    SELECT k.master_id, k.id, k.content, pm.name
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
  await c.end();
  fs.writeFileSync(SRC, rows.map((r) => JSON.stringify({ m: r.master_id, k: r.id, n: r.name, c: r.content })).join('\n'));
}

/* KO 영구 HOLD 는 원문 자체가 확정되지 않은 문서다 — 번역 기준본이 될 수 없다(렌더와 동일 규칙). */
const HOLD = new Set((fs.existsSync(`${D}/hff-ko-agent-09-hold-queue-v1.jsonl`)
  ? fs.readFileSync(`${D}/hff-ko-agent-09-hold-queue-v1.jsonl`, 'utf8').split(SPLIT_NL).filter(Boolean).map((l) => JSON.parse(l)) : [])
  .map((h) => h.productMasterId).filter(Boolean));

const docs = fs.readFileSync(SRC, 'utf8').split(SPLIT_NL).filter(Boolean)
  .map((l) => JSON.parse(l)).filter((d) => !HOLD.has(d.m));

let ok = 0;
const missAgg = new Map();
for (const d of docs) {
  const r = build(d.c);
  if (!r.misses.length && !r.hangul && !r.simplified) { ok++; continue; }
  const seen = new Set();
  for (const x of r.misses) {
    const k = `${x.kind}\t${x.text}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const e = missAgg.get(k) ?? { kind: x.kind, text: x.text, why: x.why, lost: x.lost, docs: 0 };
    e.docs++;
    missAgg.set(k, e);
  }
}
clearMemo();

/* 정렬 기준은 줄 수가 아니라 `docs` — 몇 개 문서를 여는가가 라운드의 가치다. */
const misses = [...missAgg.values()].sort((a, b) => b.docs - a.docs);
const atoms = [...FAILED.entries()].map(([text, n]) => ({ text, n }))
  .filter((x) => x.text.length <= 160).sort((a, b) => b.n - a.n);

const out = {
  wo: 'WO-O4O-HFF-JA-BATCH-02-10000-DIRECT-BULK-PRODUCTION-V1',
  measuredAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  authoredRounds, dictSize: dictSize(),
  documents: docs.length, producible: ok, blocked: docs.length - ok,
  distinctMisses: misses.length, distinctFailedAtoms: atoms.length,
  numberDrift: misses.filter((m) => m.why === 'NUMBER_DRIFT').length,
  topMisses: misses.slice(0, 400),
  topAtoms: atoms.slice(0, 1200),
};
fs.writeFileSync(`${D}/hff-ja-b02-measure-v1.json`, JSON.stringify(out, null, 1));
fs.writeFileSync(`${CACHE}/hff-ja-b02-misses.jsonl`, misses.map((x) => JSON.stringify(x)).join('\n'));
fs.writeFileSync(`${CACHE}/hff-ja-b02-atoms.jsonl`, atoms.map((x) => JSON.stringify(x)).join('\n'));
console.log(JSON.stringify({
  authoredRounds, dictSize: out.dictSize, documents: out.documents, producible: ok, blocked: out.blocked,
  distinctMisses: misses.length, distinctFailedAtoms: atoms.length, numberDrift: out.numberDrift,
  sampleMisses: misses.slice(0, 25).map((m) => [m.docs, m.why, m.kind, m.text.slice(0, 60)]),
  sampleAtoms: atoms.slice(0, 40).map((a) => [a.n, a.text.slice(0, 60)]),
}, null, 1));
