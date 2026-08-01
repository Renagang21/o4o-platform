/**
 * WO-O4O-HFF-EN-BATCH-02-REMAINING-915-DIRECT-TRANSLATION-AND-CLOSURE-V1 §5
 * 직접 번역 대기 915건 모집단 재현 (read-only).
 *   새 모집단을 선정하지 않는다. 최신 Batch 02 manifest 의 HOLD_PENDING_DIRECT_TRANSLATION 만 고정한다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const PORT = parseInt(process.env.PROXY_PORT ?? '5577', 10);
const CLS = JSON.parse(fs.readFileSync(`${D}/hff-en-batch02-classification-v1.json`, 'utf8'));
const POP = new Map(JSON.parse(fs.readFileSync(`${D}/hff-en-batch02-population-5000-v1.json`, 'utf8')).rows.map((r) => [r.koCanonicalId, r]));
const B01 = new Set(JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-population-v1.json`, 'utf8')).rows.map((r) => r.masterId));

const PENDING = CLS.results.filter((r) => r.status === 'HOLD_PENDING_DIRECT_TRANSLATION');
const sha = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');

const c = new pg.Client({ host: '127.0.0.1', port: PORT, user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

const ko = new Map();
const koIds = PENDING.map((r) => r.koCanonicalId);
for (let i = 0; i < koIds.length; i += 700) {
  for (const r of (await c.query('SELECT id, master_id, content, status, language FROM shared_product_descriptions WHERE id = ANY($1)', [koIds.slice(i, i + 700)])).rows) ko.set(r.id, r);
}
const en = new Map();
const mIds = PENDING.map((r) => r.productMasterId);
for (let i = 0; i < mIds.length; i += 700) {
  const q = await c.query(`SELECT master_id, id, content FROM shared_product_descriptions
     WHERE master_id = ANY($1) AND deleted_at IS NULL AND description_type='STORE' AND status='canonical' AND language='en'`,
  [mIds.slice(i, i + 700)]);
  for (const r of q.rows) en.set(r.master_id, r);
}
await c.end();

const rows = [], drop = { koMissing: 0, koStateBad: 0, masterMismatch: 0 };
const seenM = new Set(), seenK = new Set();
let dupM = 0, dupK = 0, b01Mix = 0, outOfPop = 0, koDrift = 0, enExisting = 0;
for (const r of PENDING) {
  const k = ko.get(r.koCanonicalId);
  if (!k) { drop.koMissing++; continue; }
  if (k.status !== 'canonical' || (k.language ?? 'ko') !== 'ko') drop.koStateBad++;
  if (k.master_id !== r.productMasterId) { drop.masterMismatch++; continue; }
  if (seenM.has(r.productMasterId)) dupM++; else seenM.add(r.productMasterId);
  if (seenK.has(r.koCanonicalId)) dupK++; else seenK.add(r.koCanonicalId);
  if (B01.has(r.productMasterId)) b01Mix++;
  if (!POP.has(r.koCanonicalId)) outOfPop++;
  if (sha(k.content) !== r.koHash) koDrift++;
  const cur = en.get(r.productMasterId);
  if (cur) enExisting++;
  const p = POP.get(r.koCanonicalId) ?? {};
  rows.push({
    batch: 2, productMasterId: r.productMasterId, koCanonicalId: r.koCanonicalId,
    productNameKo: r.productNameKo ?? null, rendererFamily: r.rendererFamily,
    koHash: sha(k.content), fields: p.fields ?? null,
    existingEnCanonicalId: cur?.id ?? null,
    existingEnHash: cur ? sha(cur.content) : null,
    unresolvedPhrases: r.unresolvedPhrases ?? [],
  });
}

const gates = {
  total: rows.length, expected: 915, totalOk: rows.length === 915,
  dupMasterId: dupM, dupKoCanonicalId: dupK,
  outsideBatch02Population: outOfPop, batch01Mixed: b01Mix,
  koMissing: drop.koMissing, koStateBad: drop.koStateBad, masterLinkMismatch: drop.masterMismatch,
  koHashDriftSinceClassification: koDrift,
  existingEnCanonical: enExisting,
  familyDist: rows.reduce((a, r) => ((a[r.rendererFamily] = (a[r.rendererFamily] ?? 0) + 1), a), {}),
  distinctBlockingPhrases: new Set(rows.flatMap((r) => r.unresolvedPhrases)).size,
};
const out = {
  wo: 'WO-O4O-HFF-EN-BATCH-02-REMAINING-915-DIRECT-TRANSLATION-AND-CLOSURE-V1',
  batch: 2, builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  baseCommit: '313d2f5d1', gates, rows,
};
fs.writeFileSync(`${D}/hff-en-batch02-remaining915-population-v1.json`, JSON.stringify(out, null, 1));
fs.writeFileSync(`${D}/hff-en-batch02-remaining915-translation-input-v1.jsonl`,
  rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(JSON.stringify(gates, null, 2));
