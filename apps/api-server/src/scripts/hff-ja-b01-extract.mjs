/**
 * WO-O4O-HFF-JA-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1  §4 모집단 고정 + 슬롯 문구 추출 (read-only)
 *
 * 모집단: KO STORE canonical 존재 · 일본어 STORE canonical 부재 · 기존 일본어 문제 큐 제외.
 * 정렬은 `master_id` 오름차순(결정적)이며, 상위 10,000 을 Batch 01 로 **동결**한다.
 * 후보가 10,000 미만이면 임의 보충 없이 실제 정상 후보 전량으로 전환하고 그 사실을 산출물에 남긴다.
 *
 * 산출: data/hff-ja-b01-ids-v1.json (동결 대상) · data/hff-ja-b01-phrases-v1.json (문구 코퍼스)
 *       <CACHE>/hff-ja-b01-docslots.jsonl (문서×문구 인덱스)
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { JA_SLOTS, norm } from './hff-ja-b01-slots.mjs';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.JA_CACHE ?? 'apps/api-server/src/scripts/.cache';
fs.mkdirSync(CACHE, { recursive: true });
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const rdl = (f) => (fs.existsSync(`${D}/${f}`)
  ? fs.readFileSync(`${D}/${f}`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const BATCH_SIZE = parseInt(process.env.JA_BATCH_SIZE ?? '10000', 10);

/* 기존 일본어 누적 문제 큐 제외 (첫 배치에서는 비어 있다). */
const priorQueue = rdl('hff-ja-deferred-issue-queue-v1.jsonl');
const excluded = new Set(priorQueue.map((q) => q.productMasterId).filter(Boolean));

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const rows = (await c.query(`
  SELECT ko.master_id, ko.id, ko.content, pm.name
    FROM shared_product_descriptions ko
    JOIN product_masters pm ON pm.id = ko.master_id
   WHERE ko.deleted_at IS NULL AND ko.description_type='STORE' AND ko.status='canonical'
     AND coalesce(ko.language,'ko')='ko' AND ko.source_type='o4o_hff_generated'
     AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions ja
        WHERE ja.master_id=ko.master_id AND ja.deleted_at IS NULL AND ja.description_type='STORE'
          AND ja.status='canonical' AND ja.language='ja')
   ORDER BY ko.master_id`)).rows;
await c.end();

const poolRaw = rows.length;
const pool = rows.filter((r) => !excluded.has(r.master_id));
const batch = pool.slice(0, BATCH_SIZE);
const shortfall = batch.length < BATCH_SIZE;

/* 중복 방어 — 모집단 계약(ProductMaster 중복 0 / koCanonicalId 중복 0). */
const mDup = batch.length - new Set(batch.map((r) => r.master_id)).size;
const kDup = batch.length - new Set(batch.map((r) => r.id)).size;
if (mDup || kDup) { console.error(`POPULATION_DUP master=${mDup} ko=${kDup}`); process.exit(1); }

fs.writeFileSync(`${D}/hff-ja-b01-ids-v1.json`, JSON.stringify({
  wo: 'WO-O4O-HFF-JA-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1',
  frozenAt: new Date().toISOString(), order: 'master_id ASC', batchSize: BATCH_SIZE,
  poolWithoutJa: poolRaw, excludedIssueQueue: excluded.size, documents: batch.length, shortfall,
  ids: batch.map((r) => r.master_id),
}, null, 1));

const idOf = new Map(); const phrases = []; const lines = [];
for (const r of batch) {
  const ids = [];
  for (const { kind, re } of JA_SLOTS) {
    for (const m of r.content.matchAll(re)) {
      const t = norm(m[2]);
      if (!t) continue;
      const k = `${kind} ${t}`;
      let i = idOf.get(k);
      if (i === undefined) { i = phrases.length; idOf.set(k, i); phrases.push({ i, kind, text: t, docFreq: 0, freq: 0 }); }
      phrases[i].freq++;
      ids.push(i);
    }
  }
  const uniq = [...new Set(ids)];
  for (const i of uniq) phrases[i].docFreq++;
  lines.push(JSON.stringify({ m: r.master_id, k: r.id, h: sha(r.content), n: r.name, p: uniq }));
}
fs.writeFileSync(`${CACHE}/hff-ja-b01-docslots.jsonl`, lines.join('\n'));

const byKind = {};
for (const p of phrases) byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
const sorted = [...phrases].sort((a, b) => b.docFreq - a.docFreq);
/* 누적 문서 커버리지 — 상위 몇 문구를 확정하면 몇 문서가 열리는지(저작 라운드 규모 산정). */
const cum = []; let seen = 0;
for (const step of [200, 500, 1000, 2000, 3000, 5000, 8000, 12000, 20000]) {
  seen = sorted.slice(0, step).reduce((a, p) => a + p.docFreq, 0);
  cum.push({ topPhrases: step, slotOccurrencesCovered: seen });
}
fs.writeFileSync(`${D}/hff-ja-b01-phrases-v1.json`, JSON.stringify({
  wo: 'WO-O4O-HFF-JA-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1',
  extractedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  poolWithoutJa: poolRaw, excludedIssueQueue: excluded.size, documents: batch.length, shortfall,
  distinctPhrases: phrases.length, byKind, coverage: cum,
  phrases: sorted.map((p) => ({ i: p.i, kind: p.kind, docFreq: p.docFreq, text: p.text })),
}, null, 1));
console.log(JSON.stringify({
  poolWithoutJa: poolRaw, documents: batch.length, shortfall,
  distinctPhrases: phrases.length, byKind, coverage: cum,
  top: sorted.slice(0, 8).map((p) => [p.kind, p.docFreq, p.text.slice(0, 50)]),
}, null, 1));
