/**
 * WO-O4O-HFF-ZH-NUMBER-STRUCTURE-AMBIGUOUS-101-REPAIR-AND-APPLY-V1  §4 미해결 조각 추출
 *
 * 마커 교정 후에도 남는 문서의 미해결 원자(UNRESOLVED / NUMBER_DRIFT / 한글 잔존)를
 * 문서 수 기준으로 집계해 직접 번역 대상 목록을 만든다. read-only.
 */
import fs from 'node:fs';
import pg from 'pg';
import { build } from './hff-zh-b01-build.mjs';
import { KEEP_PROPER } from './hff-zh-b01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const SCAN = JSON.parse(fs.readFileSync(`${D}/hff-zh-nsa-scan-v1.json`, 'utf8'));
const IDS = SCAN.cases.map((x) => x.masterId);

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const rows = (await c.query(`
  SELECT master_id, content FROM shared_product_descriptions
   WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical'
     AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated'
     AND master_id = ANY($1::uuid[])`, [IDS])).rows;

const atoms = new Map();   // `kind|text` -> { kind, text, docs:Set, why }
const hangulLeft = new Map();
let clean = 0;
for (const r of rows) {
  const b = build(r.content);
  if (!b.misses.length && !b.hangul) { clean++; continue; }
  for (const m of b.misses) {
    const k = `${m.kind}|${m.text}`;
    if (!atoms.has(k)) atoms.set(k, { kind: m.kind, text: m.text, why: m.why, docs: new Set() });
    atoms.get(k).docs.add(r.master_id);
  }
  if (!b.misses.length && b.hangul) {
    const left = (b.html.replace(/<h1[^>]*>[\s\S]*?(?=<small|<\/h1>)/g, ' ').replace(/<[^>]+>/g, ' ').replace(KEEP_PROPER, ' ')
      .match(/[^\s]*[가-힣][^\s]*/g) ?? []).slice(0, 12);
    hangulLeft.set(r.master_id, left);
  }
}

const list = [...atoms.values()].map((a) => ({ kind: a.kind, why: a.why, docs: a.docs.size, text: a.text }))
  .sort((x, y) => y.docs - x.docs || x.text.localeCompare(y.text));
const out = {
  wo: SCAN.wo, generatedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  documents: rows.length, alreadyClean: clean, blockedDocuments: rows.length - clean,
  atomCount: list.length,
  byWhy: list.reduce((a, b) => { a[b.why] = (a[b.why] ?? 0) + 1; return a; }, {}),
  hangulOnlyDocs: [...hangulLeft.entries()].map(([m, left]) => ({ masterId: m, left })),
  atoms: list,
};
fs.writeFileSync(`${D}/hff-zh-nsa-atoms-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, atoms: list.slice(0, 60) }, null, 1));
await c.end();
