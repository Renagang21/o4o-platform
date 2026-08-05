/**
 * WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1 — DB 상태 스냅샷 (read-only)
 *
 * rollback 시험 전후·LIVE 전후를 같은 기준으로 비교하기 위한 계수기다.
 * 잔여물(residue) 판정은 "이 스냅샷이 그대로인가" 로 한다.
 *
 * 산출: results/db-state-{label}.json (추적)
 * 사용: PGPASSWORD=... node snapshot-db-state.mjs --label before-rollback
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = parseInt(arg('--port', process.env.PROXY_PORT || '15441'), 10);
const LABEL = arg('--label', 'unlabeled');

async function main() {
  const pool = new pg.Pool({
    host: '127.0.0.1', port: PORT,
    user: process.env.PGUSER || 'o4o_api',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'o4o_platform',
    statement_timeout: 900000, max: 2,
  });
  const q = async (t, p) => {
    const c = await pool.connect();
    try { await c.query('SET default_transaction_read_only = on'); return (await c.query(t, p)).rows; }
    finally { c.release(); }
  };

  // e약은요 연결 master 로 범위를 좁힌 계수. 대상 밖 변화까지 보려고 전역 계수도 같이 센다.
  const scope = `
    WITH lk AS (
      SELECT DISTINCT pi.product_master_id AS master_id
      FROM product_identifiers pi
      JOIN product_candidates pc ON pc.normalized_identifier_value = pi.normalized_value
        AND pc.source_type='external_api' AND pc.identifier_type='MFDS_CODE'
        AND pc.raw_payload->>'sourceKind'='easy_drug_info' AND pc.deleted_at IS NULL
      WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
    )`;

  const [byLangStatus] = [await q(`${scope}
    SELECT COALESCE(language,'ko') lang, status, source_type "sourceType", count(*)::int n
    FROM shared_product_descriptions
    WHERE deleted_at IS NULL AND description_type='STORE'
      AND master_id IN (SELECT master_id FROM lk)
    GROUP BY 1,2,3 ORDER BY 1,2,3`)];

  const global = (await q(`
    SELECT count(*)::int total,
           count(*) FILTER (WHERE deleted_at IS NULL)::int alive,
           count(*) FILTER (WHERE deleted_at IS NULL AND status='canonical')::int canonical,
           count(*) FILTER (WHERE deleted_at IS NULL AND source_type='mfds_easy_drug')::int easyDrug,
           max(created_at)::text "maxCreatedAt", max(updated_at)::text "maxUpdatedAt"
    FROM shared_product_descriptions`))[0];

  const otherLang = (await q(`
    SELECT COALESCE(language,'ko') lang, count(*)::int n, md5(string_agg(md5(content), '' ORDER BY id)) "contentDigest"
    FROM shared_product_descriptions
    WHERE deleted_at IS NULL AND description_type='STORE' AND COALESCE(language,'ko') <> 'ko'
    GROUP BY 1 ORDER BY 1`));

  const masterCounts = (await q(`
    -- product_masters 에는 deleted_at 컬럼이 없다(소프트 삭제를 쓰지 않는 테이블).
    SELECT (SELECT count(*)::int FROM product_masters) "productMasters",
           (SELECT count(*)::int FROM product_identifiers WHERE deleted_at IS NULL) "productIdentifiers"`))[0];

  const out = {
    wo: 'WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1',
    label: LABEL, takenAt: new Date().toISOString(),
    scopedByLangStatus: byLangStatus,
    global, otherLanguage: otherLang, masterCounts,
    dbWrites: 0,
  };
  fs.writeFileSync(path.join(RESULTS, `db-state-${LABEL}.json`), JSON.stringify(out, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  await pool.end();
}

main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
