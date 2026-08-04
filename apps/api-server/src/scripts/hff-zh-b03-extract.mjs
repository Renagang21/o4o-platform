/**
 * WO-O4O-HFF-ZH-BATCH-03-10000-DIRECT-BULK-PRODUCTION-V1  §3
 *
 * Batch 03 모집단의 KO canonical 슬롯 문구 추출 (read-only).
 *   - 모집단 조건: KO STORE canonical 존재 · ZH STORE canonical 부재
 *     (Batch 01 대상 10,000 은 ZH 가 이미 있으므로 자동 제외)
 *   - 기존 중국어 문제 큐(Batch 01) 제외 · KO 영구 HOLD 제외
 *   - 슬롯 정의는 HFF ZH 트랙 계약(ZH_SLOTS)을 그대로 쓴다.
 *
 * 산출: data/hff-zh-b03-phrases-v1.json (저장소) · <CACHE>/hff-zh-b03-docslots.jsonl (캐시)
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { ZH_SLOTS } from './hff-zh-b01-build.mjs';
import { norm } from './hff-zh-b01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const CACHE = process.env.ZH_CACHE ?? 'apps/api-server/src/scripts/.cache';
fs.mkdirSync(CACHE, { recursive: true });
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const rdl = (f) => (fs.existsSync(`${D}/${f}`)
  ? fs.readFileSync(`${D}/${f}`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

/* 제외 집합 — 기존 중국어 문제 큐 + KO 영구 HOLD. */
const excluded = new Set();
const priorQueue = rdl('hff-zh-deferred-issue-queue-through-batch02-v1.jsonl');
/* sd-fn RENDER_FAILURE 는 렌더러 복원 후 재검증 대상이므로 모집단에 되돌린다(§6). */
const retry = new Set(priorQueue.filter((q) => q.issueType === 'RENDER_FAILURE').map((q) => q.productMasterId));
for (const q of priorQueue) if (q.productMasterId && !retry.has(q.productMasterId)) excluded.add(q.productMasterId);
const zhQueueCount = excluded.size;
for (const h of rdl('hff-ko-agent-09-hold-queue-v1.jsonl')) if (h.productMasterId) excluded.add(h.productMasterId);

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
     AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions zh
        WHERE zh.master_id=ko.master_id AND zh.deleted_at IS NULL AND zh.description_type='STORE'
          AND zh.status='canonical' AND zh.language='zh')
   ORDER BY ko.master_id`)).rows;
await c.end();

const poolRaw = rows.length;
const pool = rows.filter((r) => !excluded.has(r.master_id));

const idOf = new Map(); const phrases = []; const lines = [];
for (const r of pool) {
  const ids = [];
  for (const { kind, re } of ZH_SLOTS) {
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
fs.writeFileSync(`${CACHE}/hff-zh-b03-docslots.jsonl`, lines.join('\n'));

const byKind = {};
for (const p of phrases) byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
const sorted = [...phrases].sort((a, b) => b.docFreq - a.docFreq);
fs.writeFileSync(`${D}/hff-zh-b03-phrases-v1.json`, JSON.stringify({
  wo: 'WO-O4O-HFF-ZH-BATCH-03-10000-DIRECT-BULK-PRODUCTION-V1',
  extractedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  poolWithoutZh: poolRaw, excludedZhIssueQueue: zhQueueCount, excludedTotal: poolRaw - pool.length,
  documents: pool.length, distinctPhrases: phrases.length, byKind,
  phrases: sorted.map((p) => ({ i: p.i, kind: p.kind, docFreq: p.docFreq, text: p.text })),
}, null, 1));
console.log(JSON.stringify({
  poolWithoutZh: poolRaw, excludedTotal: poolRaw - pool.length, documents: pool.length,
  distinctPhrases: phrases.length, byKind,
  top: sorted.slice(0, 5).map((p) => [p.kind, p.docFreq, p.text.slice(0, 40)]),
}, null, 1));
