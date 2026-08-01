/**
 * WO-...-BATCH-02-REMAINING-915-...-V1 독립 검증 (read-only)
 * 기대값은 현재 매니페스트에서만 읽는다(상수 하드코딩 금지).
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { SLOT_RE, norm } from './hff-en-batch-01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const rd = (f) => JSON.parse(fs.readFileSync(`${D}/${f}`, 'utf8'));
const sha = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');

const POP = rd('hff-en-batch02-remaining915-population-v1.json').rows;
const CLS = rd('hff-en-batch02-remaining915-classification-v1.json').results;
const holdIds = new Set(CLS.filter((r) => r.holdReason).map((r) => r.productMasterId));
const expectTranslated = POP.filter((r) => !holdIds.has(r.productMasterId));

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5577', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform' });
await c.connect();
await c.query('SET default_transaction_read_only = on');

const ids = POP.map((r) => r.productMasterId);
const en = new Map(), ko = new Map();
for (let i = 0; i < ids.length; i += 500) {
  const s = ids.slice(i, i + 500);
  for (const r of (await c.query(
    `select master_id, id, content from shared_product_descriptions
      where language='en' and description_type='STORE' and status='canonical' and master_id = any($1)`, [s])).rows) en.set(r.master_id, r);
  for (const r of (await c.query(
    `select master_id, id, content from shared_product_descriptions
      where language='ko' and description_type='STORE' and status='canonical' and master_id = any($1)`, [s])).rows) ko.set(r.master_id, r);
}
await c.end();

const f = { missingEn: [], hangulInSlots: [], structureDrift: [], koHashDrift: [], holdHasEnFromThisRound: [] };
for (const row of expectTranslated) {
  const e = en.get(row.productMasterId), k = ko.get(row.productMasterId);
  if (!e) { f.missingEn.push(row.productMasterId); continue; }
  if (!k) { f.koHashDrift.push({ id: row.productMasterId, why: 'KO_MISSING' }); continue; }
  if (sha(k.content) !== row.koHash) f.koHashDrift.push({ id: row.productMasterId, why: 'KO_CHANGED_SINCE_SELECTION' });
  let bad = false;
  for (const { re } of SLOT_RE) e.content.replace(re, (w, o, inner, cl) => { if (/[가-힣]/.test(norm(inner))) bad = true; return w; });
  if (bad) f.hangulInSlots.push(row.productMasterId);
  for (const tag of ['<li>', '<h2>', 'sd-item', 'sd-tag', '<b>']) {
    if (e.content.split(tag).length !== k.content.split(tag).length) { f.structureDrift.push({ id: row.productMasterId, tag }); break; }
  }
}
const out = {
  verifiedAt: new Date().toISOString(), readOnly: true,
  population: POP.length, expectTranslated: expectTranslated.length, hold: holdIds.size,
  sumCheck: expectTranslated.length + holdIds.size === POP.length,
  failures: Object.fromEntries(Object.entries(f).map(([k2, v]) => [k2, v.length])),
  detail: Object.fromEntries(Object.entries(f).map(([k2, v]) => [k2, v.slice(0, 10)])),
  verdict: Object.values(f).every((v) => !v.length) ? 'PASS' : 'FAIL',
};
fs.writeFileSync(`${D}/hff-en-batch02-remaining915-independent-verification-v1.json`, JSON.stringify(out, null, 1), 'utf8');
console.log(JSON.stringify(out, null, 1));
