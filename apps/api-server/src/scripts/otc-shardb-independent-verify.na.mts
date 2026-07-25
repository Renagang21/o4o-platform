// READ-ONLY independent post-apply verification for shard B (agent-na). DB write 0.
// WO-O4O-OTC-ORAL-COMBO-FINAL-SHARD-B-NA-V7. Runs AFTER main executes KO+EN apply.
// Checks: KO canonical==master(210) · authored source_ref anchor · audit==master · canonicalDup 0 ·
//         target-outside write 0 · EN canonical==master · KO/EN byte-stable(re-run no-op signal) · easy demoted.
// ENV: DB_HOST=127.0.0.1 DB_PORT=5434 (Cloud SQL proxy). Uses .env DB_PASSWORD.
import 'dotenv/config';
import fs from 'node:fs';
import crypto from 'node:crypto';
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const fpToUuid = (fp: string): string => { const h = md5('otc-combo-leaflet:' + fp); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`; };

const cfg = JSON.parse(fs.readFileSync('src/scripts/data/otc-oral-combo-leaflet-config-shardB.na-v9.json', 'utf8'));
const groups = cfg.groups as Record<string, any>;
const allMasters: string[] = [];
const bySourceRef: { sourceRef: string; sourceType: string; masters: string[] }[] = [];
for (const [fp, g] of Object.entries(groups)) {
  bySourceRef.push({ sourceRef: fpToUuid(fp), sourceType: g.sourceType, masters: g.target_master_ids });
  allMasters.push(...g.target_master_ids);
}
const EXP = allMasters.length;

async function main() {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5434', 10), username: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 120000 } });
  await ds.initialize();
  const R: any = { wo: 'WO-O4O-OTC-ORAL-COMBO-FINAL-SHARD-B-NA-V7', expectedMasters: EXP, checks: {}, verdict: 'INIT' };
  try {
    // 1. KO authored canonical count on this anchor set
    const koCanon = (await ds.query(
      `SELECT count(DISTINCT master_id)::int n FROM shared_product_descriptions
       WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko'
       AND status='canonical' AND source_type IN ('mfds_drug_otc','mfds_drug_otc_nutrition_combo') AND deleted_at IS NULL`, [allMasters]))[0].n;
    R.checks.koAuthoredCanonical = koCanon;
    // 2. KO canonical==exactly 1 per master AND dup 0
    const dup = (await ds.query(
      `SELECT count(*)::int n FROM (SELECT master_id FROM shared_product_descriptions
       WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL
       GROUP BY master_id HAVING count(*)>1) t`, [allMasters]))[0].n;
    R.checks.koCanonicalDup = dup;
    // 3. easy demoted count (deprecated)
    const dep = (await ds.query(
      `SELECT count(DISTINCT master_id)::int n FROM shared_product_descriptions
       WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND source_type='mfds_easy_drug' AND status='deprecated' AND deleted_at IS NULL`, [allMasters]))[0].n;
    R.checks.easyDeprecated = dep;
    // 4. audit logs == master
    const audit = (await ds.query(
      `SELECT count(*)::int n FROM shared_product_description_audit_logs
       WHERE master_id=ANY($1::uuid[]) AND event_type='canonical_replaced' AND description_type='STORE' AND language='ko'`, [allMasters]))[0].n;
    R.checks.auditKo = audit;
    // 5. EN canonical == master, dup 0
    const enCanon = (await ds.query(
      `SELECT count(DISTINCT master_id)::int n FROM shared_product_descriptions
       WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL`, [allMasters]))[0].n;
    const enDup = (await ds.query(
      `SELECT count(*)::int n FROM (SELECT master_id FROM shared_product_descriptions
       WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL
       GROUP BY master_id HAVING count(*)>1) t`, [allMasters]))[0].n;
    R.checks.enCanonical = enCanon; R.checks.enCanonicalDup = enDup;
    // 6. target-outside: any write with our source_refs on masters NOT in target set
    const refs = bySourceRef.map(b => b.sourceRef);
    const outside = (await ds.query(
      `SELECT count(*)::int n FROM shared_product_descriptions
       WHERE source_ref_id = ANY($1::uuid[]) AND deleted_at IS NULL AND NOT (master_id = ANY($2::uuid[]))`, [refs, allMasters]))[0].n;
    R.checks.targetOutsideWrite = outside;
    // 7. per-fp KO byte-stability: distinct content hashes per anchor should be 1 each (uniform group)
    let fpContentKinds = 0;
    for (const b of bySourceRef) {
      const kinds = (await ds.query(
        `SELECT count(DISTINCT md5(content))::int n FROM shared_product_descriptions
         WHERE source_ref_id=$1::uuid AND source_type=$2 AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL`, [b.sourceRef, b.sourceType]))[0].n;
      if (kinds > 1) fpContentKinds++;
    }
    R.checks.koGroupsWithMultipleContentHashes = fpContentKinds;

    const pass = koCanon === EXP && dup === 0 && dep === EXP && audit === EXP && enCanon === EXP && enDup === 0 && outside === 0 && fpContentKinds === 0;
    R.verdict = pass ? 'GREEN' : 'RED';
  } finally { await ds.destroy(); }
  fs.writeFileSync('src/scripts/data/otc-shardb-independent-verify.na.result.json', JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
  if (R.verdict !== 'GREEN') process.exit(1);
}
main().catch(e => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
