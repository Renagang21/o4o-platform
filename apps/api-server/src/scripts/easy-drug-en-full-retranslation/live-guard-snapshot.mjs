/**
 * WO-...-LIVE-APPLY-AND-PUBLIC-VERIFY-V1 §14 변경 금지 대상 스냅샷 (read-only, DB write 0).
 *
 * KO / ZH / 그 외 언어 · ProductMaster · ProductIdentifier · 스키마(migration) 가
 * 이번 적용 전후로 **한 바이트도 달라지지 않았음**을 증명하기 위한 지문을 남긴다.
 * 지문은 행 수가 아니라 `md5(string_agg(id || md5(content)))` 라 내용 변경도 잡는다.
 *
 * 사용: run-with-db.ps1 -Script live-guard-snapshot.mjs -ScriptArgs @('--port','15471','--tag','before')
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { RESULTS } from './tm-lib.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = parseInt(arg('--port', '15471'), 10);
const TAG = arg('--tag', 'before');

const client = new pg.Client({ host: '127.0.0.1', port: PORT, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: 'o4o_platform' });
await client.connect();
await client.query('SET default_transaction_read_only = on');
const q = async (sql, p) => (await client.query(sql, p)).rows;

// 언어·타입·상태별 분포
const distribution = await q(`
  SELECT COALESCE(language,'(null)') lang, description_type dt, status, (deleted_at IS NULL) alive, count(*)::int n
  FROM shared_product_descriptions GROUP BY 1,2,3,4 ORDER BY 1,2,3,4`);

// 언어별 내용 지문 — EN 을 제외한 모든 언어는 이번 작업에서 불변이어야 한다.
const fingerprints = await q(`
  SELECT COALESCE(language,'(null)') lang,
         count(*)::int n,
         md5(string_agg(id::text || ':' || md5(content) || ':' || status, ',' ORDER BY id)) fp
  FROM shared_product_descriptions
  WHERE deleted_at IS NULL
  GROUP BY 1 ORDER BY 1`);

const productMasters = await q(`SELECT count(*)::int n FROM product_masters`);
const productIdentifiers = await q(`SELECT count(*)::int n FROM product_identifiers`);
// migration 이력 테이블 이름은 환경마다 다르다(typeorm_metadata / migrations / _migrations…). 있는 것만 읽는다.
const migTable = (await q(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_name IN ('migrations','typeorm_migrations','_migrations') LIMIT 1`))[0]?.table_name ?? null;
const migrations = migTable
  ? { table: migTable, ...(await q(`SELECT count(*)::int n, max(timestamp)::text "maxTs" FROM ${migTable}`))[0] }
  : { table: null, n: null, maxTs: null };
const columns = await q(`
  SELECT md5(string_agg(column_name || ':' || data_type || ':' || is_nullable, ',' ORDER BY ordinal_position)) fp
  FROM information_schema.columns WHERE table_name = 'shared_product_descriptions'`);

await client.end();

const out = {
  wo: 'WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-LIVE-APPLY-AND-PUBLIC-VERIFY-V1',
  step: `guard-snapshot(${TAG})`,
  distribution,
  fingerprints,
  productMasters: productMasters[0].n,
  productIdentifiers: productIdentifiers[0].n,
  migrations,
  schemaFingerprint: columns[0].fp,
  dbWrites: 0,
};
fs.writeFileSync(path.join(RESULTS, `live-guard-snapshot-${TAG}.json`), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ...out, distribution: `[${distribution.length} rows]` }, null, 2));
