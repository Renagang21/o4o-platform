/**
 * WO-O4O-HFF-EN-BATCH-01-CLOSURE-AND-BATCH-02-5000-DIRECT-BULK-PRODUCTION-V1 §6
 * Batch 01 공식 closure manifest (read-only).
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const PORT = parseInt(process.env.PROXY_PORT ?? '5561', 10);
const CLS = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-hold-4209-classification-v1.json`, 'utf8'));
// Batch 01 = 초기 791(기존 EN 기능성 복원) + 4,209(HOLD 재생산 모집단)
const POP = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-hold-4209-population-v1.json`, 'utf8'));

const c = new pg.Client({ host: '127.0.0.1', port: PORT, user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

const h = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');

// 1) 4,209 재생산 모집단의 현재 EN 보유 여부를 DB 에서 직접 확인한다.
const ids = CLS.results.map((r) => r.productMasterId);
const enById = new Map();
for (let i = 0; i < ids.length; i += 700) {
  const r = await c.query(
    `SELECT master_id, id, content FROM shared_product_descriptions
      WHERE master_id = ANY($1) AND description_type='STORE' AND status='canonical' AND language='en'`,
    [ids.slice(i, i + 700)]);
  for (const x of r.rows) enById.set(x.master_id, x);
}
// 2) KO canonical 불변 확인
const koIds = CLS.results.map((r) => r.koCanonicalId);
const koById = new Map();
for (let i = 0; i < koIds.length; i += 700) {
  const r = await c.query('SELECT id, content, status, language FROM shared_product_descriptions WHERE id = ANY($1)', [koIds.slice(i, i + 700)]);
  for (const x of r.rows) koById.set(x.id, x);
}
await c.end();

const REASON = {
  TRANSLATION_ASSET_MISSING: 'HOLD_LOW_EFFICIENCY_UNIQUE_PHRASES',
  HOLD_KO_SOURCE_DAMAGED: 'HOLD_KO_SOURCE_DAMAGED',
  HOLD_NUMBER_STRUCTURE_AMBIGUOUS: 'HOLD_NUMBER_STRUCTURE_AMBIGUOUS',
  TRANSLATION_AMBIGUOUS: 'HOLD_TRANSLATION_AMBIGUOUS',
};

const holds = [], byReason = {}, byStatus = {};
let koDrift = 0, koMissing = 0, enPresent = 0;
for (const r of CLS.results) {
  byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  const ko = koById.get(r.koCanonicalId);
  if (!ko) koMissing++;
  else if (h(ko.content) !== r.koHash || ko.status !== 'canonical' || ko.language !== 'ko') koDrift++;
  if (enById.has(r.productMasterId)) enPresent++;
  if (r.status.startsWith('HOLD')) {
    const reason = REASON[r.holdReason] ?? r.holdReason ?? 'HOLD_UNCLASSIFIED';
    byReason[reason] = (byReason[reason] ?? 0) + 1;
    holds.push({
      batch: 1, productMasterId: r.productMasterId, koCanonicalId: r.koCanonicalId,
      productNameKo: r.productNameKo, koHash: r.koHash, holdReason: reason,
      unresolvedPhrases: r.unresolvedPhrases ?? [], sweepEligible: reason === 'HOLD_LOW_EFFICIENCY_UNIQUE_PHRASES',
    });
  }
}

const completedPre = POP.preCompleted ?? POP.completedBeforeHold ?? 791;
const completed = completedPre + (byStatus.CREATED_NEW_EN ?? 0) + (byStatus.RESOLVED_NO_CHANGE ?? 0);
const holdTotal = holds.length;
const closure = {
  wo: 'WO-O4O-HFF-EN-BATCH-01-CLOSURE-AND-BATCH-02-5000-DIRECT-BULK-PRODUCTION-V1',
  batch: 1, baseCommit: 'd4f407f04',
  total: 5000, completedPre, reproductionPopulation: CLS.results.length,
  byStatus, completed, holdTotal, failedSystem: byStatus.FAILED_SYSTEM ?? 0,
  statusSum: completed + holdTotal,
  statusSumOk: completed + holdTotal === 5000,
  byReason,
  koIntegrity: { checked: CLS.results.length, missing: koMissing, drift: koDrift, ok: koMissing === 0 && koDrift === 0 },
  enPresentForReproductionPopulation: enPresent,
  completionRate: +(completed / 5000 * 100).toFixed(2),
  sweepEligibleHold: holds.filter((x) => x.sweepEligible).length,
};
fs.writeFileSync(`${D}/hff-en-batch01-closure-v1.json`, JSON.stringify(closure, null, 2));
fs.writeFileSync(`${D}/hff-en-batch01-final-hold-102-v1.jsonl`, holds.map((x) => JSON.stringify(x)).join('\n') + '\n');
fs.writeFileSync(`${D}/hff-en-batch01-final-hold-102-summary-v1.json`, JSON.stringify({
  total: holdTotal, byReason,
  sweepEligible: holds.filter((x) => x.sweepEligible).length,
  permanentUnlessNewEvidence: holdTotal - holds.filter((x) => x.sweepEligible).length,
}, null, 2));
console.log(JSON.stringify(closure, null, 2));
