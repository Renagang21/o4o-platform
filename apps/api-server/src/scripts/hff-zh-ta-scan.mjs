/**
 * WO-O4O-HFF-ZH-TRANSLATION-AMBIGUOUS-319-REPAIR-AND-APPLY-V1  모집단 고정 + 원인 분류
 *
 * 통합 ZH 문제 큐에서 TRANSLATION_AMBIGUOUS 319건을 재현하고, 각 문서를 현재 엔진으로
 * 다시 build() 해 실제로 막고 있는 미해결 조각과 그 사유를 뽑아 분류한다. read-only.
 */
import fs from 'node:fs';
import pg from 'pg';
import { build } from './hff-zh-b01-build.mjs';
import { KEEP_PROPER } from './hff-zh-b01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const QUEUE = fs.readFileSync(`${D}/hff-zh-deferred-issue-queue-through-final-v1.jsonl`, 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l));
const TA = QUEUE.filter((q) => q.issueType === 'TRANSLATION_AMBIGUOUS');

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
[TA.map((q) => q.productMasterId)])).rows;

const pmDup = rows.length - new Set(rows.map((r) => r.master_id)).size;
const koDup = rows.length - new Set(rows.map((r) => r.id)).size;

const cases = [];
const atoms = new Map();     // `kind|text` -> { kind, why, text, docs:Set }
const hangulLeft = new Map();
let clean = 0;
for (const r of rows) {
  const b = build(r.content);
  if (!b.misses.length && !b.hangul) { clean++; }
  for (const m of b.misses) {
    const k = `${m.kind}|${m.text}`;
    if (!atoms.has(k)) atoms.set(k, { kind: m.kind, why: m.why, text: m.text, docs: new Set() });
    atoms.get(k).docs.add(r.master_id);
  }
  if (!b.misses.length && b.hangul) {
    const left = (b.html.replace(/<h1[^>]*>[\s\S]*?(?=<small|<\/h1>)/g, ' ').replace(/<[^>]+>/g, ' ').replace(KEEP_PROPER, ' ')
      .match(/[^\s]*[가-힣][^\s]*/g) ?? []).slice(0, 12);
    hangulLeft.set(r.master_id, left);
  }
  cases.push({
    masterId: r.master_id, koId: r.id, productName: r.product_name,
    missCount: b.misses.length, whys: [...new Set(b.misses.map((m) => m.why))], hangul: !!b.hangul,
  });
}

const tally = {};
for (const x of cases) {
  const k = x.missCount ? x.whys.sort().join('+') : (x.hangul ? 'HANGUL_ONLY' : 'NOW_CLEAN');
  tally[k] = (tally[k] ?? 0) + 1;
}
const list = [...atoms.values()].map((a) => ({ kind: a.kind, why: a.why, docs: a.docs.size, text: a.text }))
  .sort((x, y) => y.docs - x.docs || x.text.localeCompare(y.text));

const out = {
  wo: 'WO-O4O-HFF-ZH-TRANSLATION-AMBIGUOUS-319-REPAIR-AND-APPLY-V1',
  scannedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  queueTotal: QUEUE.length, queueTA: TA.length,
  populationReproduced: rows.length, productMasterDup: pmDup, koCanonicalDup: koDup,
  alreadyClean: clean, blockedDocuments: rows.length - clean,
  tally, atomCount: list.length,
  byWhy: list.reduce((a, b) => { a[b.why] = (a[b.why] ?? 0) + 1; return a; }, {}),
  hangulOnlyDocs: [...hangulLeft.entries()].map(([m, left]) => ({ masterId: m, left })),
  atoms: list, cases,
};
fs.writeFileSync(`${D}/hff-zh-ta-scan-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, atoms: list.slice(0, 40), cases: cases.slice(0, 3), hangulOnlyDocs: out.hangulOnlyDocs.slice(0, 5) }, null, 1));
await c.end();
