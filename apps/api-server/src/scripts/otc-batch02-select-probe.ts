/**
 * OTC Batch 02 후보 선정 read-only PROBE (WO-O4O-OTC-BULK-BATCH-02-KO-READINESS-AGENT-NA-V1, Agent 나)
 *
 * DB write 0 — SELECT only. 미승격 단일성분형 OTC draft 그룹을 전개하여
 *   groupKey / ingredient·strength·form / verdict / rx / enumerated masters / noSpd / 이미 승격 여부 / caution 길이
 * 를 산출한다. 커밋 대상 아님(조사 도구).
 */
import { readFileSync } from 'node:fs';

const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const OTC = 'MFDS_DRUG_OTC';

function readPw(): string {
  const txt = readFileSync(ENV_PATH, 'utf8');
  const m = txt.match(/^DB_PASSWORD=(.*)$/m);
  if (!m) throw new Error('DB_PASSWORD not found');
  return m[1].trim();
}

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: '127.0.0.1', port: 5433,
    username: 'o4o_api', password: readPw(), database: 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();
  try {
    // per-master 전개 CTE — 제형은 name 키워드로(gotcha #1), 함량은 spec split_part(,1)
    const perMasterCte = `
      WITH d AS (
        SELECT source_identifier_value AS gk, candidate_id,
          seed_json->>'ingredient' AS ing, seed_json->>'strengthToken' AS str,
          seed_json->>'doseForm' AS form, guard_result->>'verdict' AS verdict,
          seed_json->>'runId' AS run_id
        FROM product_candidate_description_drafts
        WHERE source_label='${OTC}' AND deleted_at IS NULL
      ),
      parsed AS (
        SELECT pm.id, substring(pm.name from '\\(([^()]+)\\)\\s*$') AS ing,
          split_part(pm.specification,' / ',1) AS str,
          CASE WHEN pm.name LIKE '%연질캡슐%' THEN '연질캡슐'
               WHEN pm.name LIKE '%캡슐%' THEN '캡슐'
               WHEN pm.name LIKE '%정%' THEN '정' ELSE NULL END AS form
        FROM product_masters pm WHERE pm.regulatory_type='DRUG' AND pm.drug_category='otc'
      ),
      m AS (SELECT d.gk, d.run_id, d.verdict, p.id AS master_id FROM d JOIN parsed p ON p.ing=d.ing AND p.str=d.str AND p.form=d.form),
      mstat AS (
        SELECT m.gk, m.run_id, m.verdict, m.master_id,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=m.master_id AND s.deleted_at IS NULL AND s.status='canonical' AND s.language='ko' AND s.description_type='STORE') AS has_ko_store_canon,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=m.master_id AND s.deleted_at IS NULL AND s.status='canonical') AS has_canon_any,
          EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=m.master_id AND s.deleted_at IS NULL) AS has_any
        FROM m
      )`;

    // per-group 전개 집계 + seed/rx/caution 메타
    const rows = await ds.query(`${perMasterCte}
      , agg AS (
        SELECT gk, run_id, verdict,
          count(*) AS enum_masters,
          count(*) FILTER (WHERE has_ko_store_canon) AS ko_store_canon,
          count(*) FILTER (WHERE has_canon_any) AS any_canon,
          count(*) FILTER (WHERE NOT has_any) AS no_spd
        FROM mstat GROUP BY gk, run_id, verdict
      )
      SELECT a.*,
        (dd.seed_json->'groupScope'->>'rx')::int AS rx,
        (dd.seed_json->'groupScope'->>'masterTotal')::int AS seed_master_total,
        (dd.seed_json->'groupScope'->>'spdMasters')::int AS seed_spd_masters,
        (dd.seed_json->'groupScope'->>'anchorMasters')::int AS seed_anchor,
        dd.seed_json->>'ingredient' AS ing, dd.seed_json->>'strengthToken' AS str, dd.seed_json->>'doseForm' AS form,
        dd.candidate_id,
        length(dd.content_json->>'caution') AS caution_len,
        length(dd.content_json->>'usage') AS usage_len,
        length(dd.content_json->>'efficacy') AS efficacy_len,
        (dd.content_json ? 'efficacy' AND dd.content_json ? 'usage' AND dd.content_json ? 'caution' AND dd.content_json ? 'summaryTable') AS has4
      FROM agg a
      JOIN product_candidate_description_drafts dd
        ON dd.source_identifier_value=a.gk AND dd.source_label='${OTC}' AND dd.deleted_at IS NULL
      ORDER BY a.no_spd DESC, a.enum_masters DESC`);

    console.log('JSON_BEGIN');
    console.log(JSON.stringify(rows));
    console.log('JSON_END');
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}
main().catch((e) => { console.error('FAIL', e instanceof Error ? e.message : e); process.exit(1); });
