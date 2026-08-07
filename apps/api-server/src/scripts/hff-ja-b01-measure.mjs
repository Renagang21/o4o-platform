/**
 * WO-O4O-HFF-JA-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1  §5 저작 라운드 측정
 *
 * 동결된 Batch 01 모집단에 현재 엔진·사전을 적용해 **무엇이 아직 안 열리는지** 만 센다.
 * DB 는 KO 원문 캐시를 만들 때 한 번만 read-only 로 읽고, 이후 라운드는 전부 오프라인이다.
 *
 * 산출: data/hff-ja-b01-measure-v1.json (진행률 + 다음 라운드 저작 대상)
 * 사용: node ...measure.mjs            → 캐시가 없으면 DB 에서 만든다(PGPW 필요)
 *       JA_OFFLINE=1 node ...measure.mjs → 캐시만 사용(자격증명 불필요)
 */
import fs from 'node:fs';
import { build } from './hff-ja-b01-build.mjs';
import { FAILED, dictSize, authoredRounds, clearMemo } from './hff-ja-b01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
const SRC = `${CACHE}/hff-ja-b01-ko-source.jsonl`;
fs.mkdirSync(CACHE, { recursive: true });

if (!fs.existsSync(SRC)) {
  if (process.env.JA_OFFLINE) { console.error('NO_CACHE'); process.exit(1); }
  const { default: pg } = await import('pg');
  const ids = JSON.parse(fs.readFileSync(`${D}/hff-ja-b01-ids-v1.json`, 'utf8')).ids;
  const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
  await c.connect();
  await c.query('SET default_transaction_read_only = on');
  if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }
  const rows = (await c.query(`
    SELECT ko.master_id, ko.id, ko.content, pm.name
      FROM shared_product_descriptions ko JOIN product_masters pm ON pm.id = ko.master_id
     WHERE ko.master_id = ANY($1::uuid[]) AND ko.deleted_at IS NULL AND ko.description_type='STORE'
       AND ko.status='canonical' AND coalesce(ko.language,'ko')='ko' AND ko.source_type='o4o_hff_generated'
     ORDER BY ko.master_id`, [ids])).rows;
  await c.end();
  if (rows.length !== ids.length) { console.error(`POPULATION_DRIFT expected=${ids.length} actual=${rows.length}`); process.exit(1); }
  fs.writeFileSync(SRC, rows.map((r) => JSON.stringify({ m: r.master_id, k: r.id, n: r.name, c: r.content })).join('\n'));
}

const docs = fs.readFileSync(SRC, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

let ok = 0;
const missAgg = new Map();   // kind\ttext -> {kind,text,why,docs,lost}
const failDocs = [];
for (const d of docs) {
  const r = build(d.c);
  if (!r.misses.length && !r.hangul && !r.simplified) { ok++; continue; }
  failDocs.push({ m: d.m, hangul: r.hangul, simplified: r.simplified, misses: r.misses.length });
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

const misses = [...missAgg.values()].sort((a, b) => b.docs - a.docs);
/* 조립 실패의 **최소 단위**. 슬롯 전체를 저작하는 것보다 이쪽을 채우는 편이 재사용된다. */
const atoms = [...FAILED.entries()].map(([text, n]) => ({ text, n }))
  .filter((x) => x.text.length <= 160).sort((a, b) => b.n - a.n);

const out = {
  wo: 'WO-O4O-HFF-JA-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1',
  measuredAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  authoredRounds, dictSize: dictSize(),
  documents: docs.length, producible: ok, blocked: docs.length - ok,
  distinctMisses: misses.length, distinctFailedAtoms: atoms.length,
  numberDrift: misses.filter((m) => m.why === 'NUMBER_DRIFT').length,
  topMisses: misses.slice(0, 400),
  topAtoms: atoms.slice(0, 1200),
};
fs.writeFileSync(`${D}/hff-ja-b01-measure-v1.json`, JSON.stringify(out, null, 1));
/* 저작 입력 전량. data/ 는 요약만 두고, 라운드 작업용 원장은 캐시에 둔다. */
fs.writeFileSync(`${CACHE}/hff-ja-b01-misses.jsonl`, misses.map((x) => JSON.stringify(x)).join('\n'));
fs.writeFileSync(`${CACHE}/hff-ja-b01-atoms.jsonl`, atoms.map((x) => JSON.stringify(x)).join('\n'));
console.log(JSON.stringify({
  authoredRounds, dictSize: out.dictSize, documents: out.documents, producible: ok, blocked: out.blocked,
  distinctMisses: out.distinctMisses, distinctFailedAtoms: out.distinctFailedAtoms, numberDrift: out.numberDrift,
  sampleMisses: misses.slice(0, 25).map((m) => [m.docs, m.why, m.kind, m.text.slice(0, 70)]),
  sampleAtoms: atoms.slice(0, 40).map((a) => [a.n, a.text.slice(0, 70)]),
}, null, 1));
