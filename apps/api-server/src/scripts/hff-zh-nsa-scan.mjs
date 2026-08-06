/**
 * WO-O4O-HFF-ZH-NUMBER-STRUCTURE-AMBIGUOUS-101-REPAIR-AND-APPLY-V1  §3 모집단 고정 + §4 원인 분류
 *
 * 통합 ZH 문제 큐에서 NUMBER_STRUCTURE_AMBIGUOUS 101건을 재현하고, 각 문서를 현재 엔진으로
 * 다시 build() 해 실제 걸리는 수치 토큰과 그 문맥을 뽑아 원인 유형별로 분류한다. read-only.
 */
import fs from 'node:fs';
import pg from 'pg';
import { build } from './hff-zh-b01-build.mjs';
import { lostNums } from './hff-zh-b01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const QUEUE = fs.readFileSync(`${D}/hff-zh-deferred-issue-queue-through-final-v1.jsonl`, 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l));
const NSA = QUEUE.filter((q) => q.issueType === 'NUMBER_STRUCTURE_AMBIGUOUS');

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

/* KO canonical 존재 · ZH canonical 부재 로 모집단을 DB 에서 재현한다. */
const rows = (await c.query(`
  SELECT k.id, k.master_id, k.content, pm.name product_name
    FROM shared_product_descriptions k
    JOIN product_masters pm ON pm.id = k.master_id
   WHERE k.deleted_at IS NULL AND k.description_type='STORE' AND k.status='canonical'
     AND coalesce(k.language,'ko')='ko' AND k.source_type='o4o_hff_generated'
     AND k.master_id = ANY($1::uuid[])
     AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions z
                      WHERE z.deleted_at IS NULL AND z.master_id=k.master_id AND z.description_type='STORE'
                        AND z.status='canonical' AND z.language='zh' AND z.source_type='o4o_hff_generated')`,
[NSA.map((q) => q.productMasterId)])).rows;

const pmDup = rows.length - new Set(rows.map((r) => r.master_id)).size;
const koDup = rows.length - new Set(rows.map((r) => r.id)).size;

const cases = [];
for (const r of rows) {
  const b = build(r.content);
  const drifts = b.misses.filter((m) => m.why === 'NUMBER_DRIFT');
  const other = b.misses.filter((m) => m.why !== 'NUMBER_DRIFT');
  cases.push({
    masterId: r.master_id, koId: r.id, productName: r.product_name,
    drifts: drifts.map((m) => ({ kind: m.kind, ko: m.text, zh: m.zh ?? null, lost: m.lost ?? null })),
    otherWhy: [...new Set(other.map((m) => m.why))],
    otherCount: other.length,
    hangul: !!b.hangul,
  });
}

const tally = {};
for (const x of cases) {
  const k = x.drifts.length ? 'NUMBER_DRIFT' : (x.otherWhy[0] ?? (x.hangul ? 'HANGUL_ONLY' : 'NOW_CLEAN'));
  tally[k] = (tally[k] ?? 0) + 1;
}
/* 유실 토큰 자체의 분포 — 교정 우선순위를 정하는 근거다. */
const lostTally = {};
for (const x of cases) for (const d of x.drifts) for (const t of d.lost ?? []) lostTally[t] = (lostTally[t] ?? 0) + 1;

const out = {
  wo: 'WO-O4O-HFF-ZH-NUMBER-STRUCTURE-AMBIGUOUS-101-REPAIR-AND-APPLY-V1',
  scannedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  queueTotal: QUEUE.length, queueNSA: NSA.length,
  populationReproduced: rows.length, productMasterDup: pmDup, koCanonicalDup: koDup,
  tally, lostTokenTop: Object.entries(lostTally).sort((a, b) => b[1] - a[1]).slice(0, 40),
  cases,
};
fs.writeFileSync(`${D}/hff-zh-nsa-scan-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, cases: cases.slice(0, 6) }, null, 2));
await c.end();
