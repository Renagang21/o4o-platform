/**
 * 523 적용 — Track A canonical UPDATE 40 + Track B (ProductMaster 5 + candidate 링크 5 + canonical 5).
 * 이중 게이트: --apply + HFF_523_APPLY_CONFIRM=YES · 단일 트랜잭션.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { buildTrackBCanonical } from './hff-ko-final-hold-523-buildb.mjs';

const APPLY = process.argv.includes('--apply');
const CONFIRM = process.env.HFF_523_APPLY_CONFIRM === 'YES';
const D = 'apps/api-server/src/scripts/data';
const OUT = `${D}/hff-ko-final-hold-523-apply-results-v1.json`;
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const nrm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const KO = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`;

const safe = JSON.parse(fs.readFileSync(`${D}/hff-ko-final-hold-523-safe-targets-v1.json`, 'utf8'));
const rb = JSON.parse(fs.readFileSync(`${D}/hff-ko-final-hold-523-rollback-v1.json`, 'utf8'));
const newA = new Map(JSON.parse(fs.readFileSync(`${D}/tmp-hff-523-newcontent.json`, 'utf8')).map((x) => [x.canonicalId, x]));
const render = JSON.parse(fs.readFileSync(`${D}/hff-ko-final-hold-523-render-audit-v1.json`, 'utf8'));
if (render.verdict !== 'PASS') throw new Error('APPLY_BLOCKED: render not PASS');

if (!APPLY) { console.log(JSON.stringify({ mode: 'dry-run', trackA: safe.trackATargets.length, trackB: safe.trackBTargets.length }, null, 2)); process.exit(0); }
if (!CONFIRM) throw new Error('APPLY_BLOCKED: HFF_523_APPLY_CONFIRM=YES 필요');

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5497', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
const snap = async () => (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) AS spd_all,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE ${KO}) AS ko_canon,
         (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') AS pm_hff`)).rows[0];
const before = await snap();
let updA = 0, pmNew = 0, linked = 0, canonNew = 0, rolledBack = false, failReason = null;
const created = { masters: [], spds: [], links: [] };
try {
  await c.query('BEGIN');
  /* Track A */
  for (const t of safe.trackATargets) {
    const nc = newA.get(t.canonicalId);
    if (!nc || nc.newContentHash !== t.newContentHash) { failReason = `A_CONTENT_MISMATCH ${t.canonicalId}`; throw new Error(failReason); }
    const q = await c.query(`
      UPDATE shared_product_descriptions SET content=$1, updated_at=now()
       WHERE id=$2 AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko'
         AND deleted_at IS NULL AND encode(sha256(convert_to(content,'UTF8')),'hex')=$3
       RETURNING id`, [nc.newContent, t.canonicalId, t.oldContentHash]);
    if (q.rowCount !== 1) { failReason = `A_ROW_FAIL ${t.canonicalId}`; throw new Error(failReason); }
    updA++;
  }
  /* Track B */
  for (const t of safe.trackBTargets) {
    const dupPm = await c.query(`SELECT id FROM product_masters WHERE mfds_permit_number=$1`, [t.statementNo]);
    if (dupPm.rowCount) { failReason = `B_MASTER_EXISTS ${t.statementNo}`; throw new Error(failReason); }
    const mid = randomUUID();
    await c.query(`
      INSERT INTO product_masters (id, barcode, regulatory_type, regulatory_name, name, manufacturer_name,
        mfds_permit_number, is_mfds_verified, status, tags, created_at, updated_at)
      VALUES ($1,NULL,'건강기능식품',$2,$2,$3,$4,true,'ACTIVE',$5::jsonb,now(),now())`,
      [mid, nrm(t.official.name), nrm(t.official.maker), t.statementNo, JSON.stringify(['import:mfds-hff', 'wo:hff-ko-final-hold-523'])]);
    created.masters.push(mid); pmNew++;
    await c.query(`UPDATE product_candidates SET matched_product_master_id=$2, candidate_status='approved_new_master', reviewed_at=now(), updated_at=now() WHERE id=$1`, [t.candidateId, mid]);
    created.links.push(t.candidateId); linked++;
    const body = buildTrackBCanonical(t.official);
    const sid = randomUUID();
    await c.query(`
      INSERT INTO shared_product_descriptions (id, master_id, content, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
      VALUES ($1,$2,$3,'o4o_hff_generated',$4,'canonical','ko','STORE',now(),now())`, [sid, mid, body, t.candidateId]);
    created.spds.push(sid); canonNew++;
    const v = await c.query(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id=$1 AND ${KO}`, [mid]);
    if (v.rows[0].c !== 1) { failReason = `B_CANONICAL_DUP ${mid}`; throw new Error(failReason); }
  }
  const mid = await snap();
  if (mid.spd_all !== before.spd_all + canonNew) { failReason = `SPD_DELTA ${before.spd_all}->${mid.spd_all}`; throw new Error(failReason); }
  if (mid.pm_hff !== before.pm_hff + pmNew) { failReason = `PM_DELTA`; throw new Error(failReason); }
  await c.query('COMMIT');
} catch (e) { try { await c.query('ROLLBACK'); rolledBack = true; } catch {} failReason = failReason ?? String(e.message || e); }
const after = await snap();
const out = { ranAt: new Date().toISOString(), wo: rb.wo, status: rolledBack ? 'ROLLED_BACK' : 'APPLIED',
  expected: { trackAUpdate: safe.trackATargets.length, productMasters: safe.trackBTargets.length, candidateLinks: safe.trackBTargets.length, newCanonicals: safe.trackBTargets.length },
  actual: { trackAUpdate: rolledBack ? 0 : updA, productMasters: rolledBack ? 0 : pmNew, candidateLinks: rolledBack ? 0 : linked, newCanonicals: rolledBack ? 0 : canonNew },
  rolledBack, failReason, countsBefore: before, countsAfter: after, created: rolledBack ? { masters: [], spds: [], links: [] } : created };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
if (!rolledBack) { rb.createdIds = created; fs.writeFileSync(`${D}/hff-ko-final-hold-523-rollback-v1.json`, JSON.stringify(rb, null, 1)); }
console.log(JSON.stringify({ ...out, created: { masters: created.masters.length, spds: created.spds.length } }, null, 2));
await c.end();
if (rolledBack) process.exit(1);
