/** STAGE-1 FORENSIC (read-only) — 8B target 59 master 가 이미 produced 상태인 원인 규명.
 *  각 그룹: 현재 authored ko canonical 의 source_ref_id 가 audit draft 와 일치하는지, en 존재, created_at/updated_at 범위. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const SSOT = path.resolve(process.cwd(), 'src/scripts/data/otc-next-batch-8b-audit-v1.json');

async function main(): Promise<void> {
  const audit = JSON.parse(readFileSync(SSOT, 'utf8'));
  const groups = audit.candidates_examined.map((c: any) => ({ gk: c.groupKey, ids: [...c.target_master_ids].sort(), ref: c.authored_source_ref_id }));
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5433, username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  await ds.initialize();
  try {
    for (const g of groups) {
      const r = (await ds.query(`
        SELECT
          count(*) FILTER (WHERE language='ko' AND status='canonical' AND source_type=ANY(ARRAY['mfds_drug_otc','nutrition_combo']))::int ko_authored_canon,
          count(*) FILTER (WHERE language='ko' AND status='canonical' AND source_type=ANY(ARRAY['mfds_drug_otc','nutrition_combo']) AND source_ref_id=$2::uuid)::int ko_authored_canon_matchref,
          count(*) FILTER (WHERE language='ko' AND status='needs_review' AND source_type=ANY(ARRAY['mfds_drug_otc','nutrition_combo']))::int ko_authored_nr,
          count(*) FILTER (WHERE language='en' AND status='canonical')::int en_canon,
          count(*) FILTER (WHERE language='en' AND status='needs_review')::int en_nr,
          count(*) FILTER (WHERE source_type='mfds_easy_drug' AND status='canonical' AND language='ko')::int easy_canon,
          count(*) FILTER (WHERE source_type='mfds_easy_drug' AND status='deprecated' AND language='ko')::int easy_dep,
          min(created_at) FILTER (WHERE status='canonical' AND source_type=ANY(ARRAY['mfds_drug_otc','nutrition_combo']))::text min_created,
          max(created_at) FILTER (WHERE status='canonical' AND source_type=ANY(ARRAY['mfds_drug_otc','nutrition_combo']))::text max_created,
          max(updated_at) FILTER (WHERE status='canonical' AND source_type=ANY(ARRAY['mfds_drug_otc','nutrition_combo']))::text max_updated
        FROM shared_product_descriptions
        WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND deleted_at IS NULL`, [g.ids, g.ref]))[0];
      console.log(`${g.gk} [T=${g.ids.length}] ref=${g.ref?.slice(0, 8)}`);
      console.log(`   ko authored canon=${r.ko_authored_canon} (matchAuditRef=${r.ko_authored_canon_matchref}) nr=${r.ko_authored_nr} | en canon=${r.en_canon} nr=${r.en_nr} | easy canon=${r.easy_canon} dep=${r.easy_dep}`);
      console.log(`   authored created ${r.min_created} .. ${r.max_created} | max_updated ${r.max_updated}`);
    }
    // audit-log 관점: 최근 canonical_replaced 이벤트 (이 59 master)
    const allIds = groups.flatMap((g: any) => g.ids);
    const audits = (await ds.query(`
      SELECT to_char(max(created_at),'YYYY-MM-DD HH24:MI') last_audit, count(*)::int n
      FROM shared_product_description_audit_logs
      WHERE master_id=ANY($1::uuid[]) AND event_type='canonical_replaced' AND description_type='STORE'`, [allIds]));
    console.log('AUDIT_LOG canonical_replaced for 59 masters:', JSON.stringify(audits[0]));
  } finally { if (ds.isInitialized) await ds.destroy(); }
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
