/**
 * WO-O4O-HFF-ZH-TRANSLATION-AMBIGUOUS-319-REPAIR-AND-APPLY-V1  §4 사전 침범 감사
 *
 * 이번 라운드 사전(z83, 141개)은 kind 를 가리지 않는 `any` 사전이다. 319건을 풀려고 넣은 항목이
 * 이미 생산된 40,599 건의 KO 원문에도 등장하면, 그 문서를 다시 렌더할 때 문장이 바뀔 수 있다.
 * 키 문자열이 기존 KO 원문에 나타나는지 전수로 본다. read-only.
 */
import fs from 'node:fs';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const KEYS = Object.keys(JSON.parse(fs.readFileSync(`${D}/hff-zh-b04-z83-translations-v1.json`, 'utf8')).any);
const HFF = `deleted_at IS NULL AND description_type='STORE' AND status='canonical' AND source_type='o4o_hff_generated'`;
const hff = (a) => HFF.replace(/(^|AND )(\w+)/g, (_, p, col) => `${p}${a}.${col}`);

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const ids = (await c.query(`SELECT master_id FROM shared_product_descriptions WHERE ${HFF} AND language='zh' ORDER BY master_id`)).rows.map((r) => r.master_id);
const hit = new Map();
let scanned = 0;
for (let i = 0; i < ids.length; i += 500) {
  const rows = (await c.query(`SELECT k.master_id, k.content ko FROM shared_product_descriptions k
     WHERE ${hff('k')} AND coalesce(k.language,'ko')='ko' AND k.master_id = ANY($1::uuid[])`, [ids.slice(i, i + 500)])).rows;
  for (const r of rows) {
    scanned++;
    for (const k of KEYS) if (r.ko.includes(k)) hit.set(k, (hit.get(k) ?? 0) + 1);
  }
}

const out = {
  wo: 'WO-O4O-HFF-ZH-TRANSLATION-AMBIGUOUS-319-REPAIR-AND-APPLY-V1',
  scope: 'z83 round dictionary overlap with already-produced ZH canonical KO sources',
  scannedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  keys: KEYS.length, documentsScanned: scanned,
  overlappingKeys: hit.size,
  overlaps: [...hit.entries()].map(([ko, docs]) => ({ ko, docs })).sort((a, b) => b.docs - a.docs),
  verdict: hit.size === 0 ? 'PASS' : 'OVERLAP_FOUND',
};
fs.writeFileSync(`${D}/hff-zh-ta-z83-overlap-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, overlaps: out.overlaps.slice(0, 30) }, null, 1));
await c.end();
