/**
 * LIVE apply 사전 조사 (read-only, write 0).
 * shared_product_descriptions 의 실제 컬럼·제약·현행 status/language 분포를 확인한다.
 * 사용: PGUSER=.. PGPASSWORD=.. node live-schema-probe.mjs [--port 15461]
 */
import pg from 'pg';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = parseInt(arg('--port', '15461'), 10);

const client = new pg.Client({
  host: '127.0.0.1', port: PORT, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: 'o4o_platform',
});
await client.connect();
await client.query('SET default_transaction_read_only = on');

const q = async (sql, params) => (await client.query(sql, params)).rows;

const columns = await q(`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'shared_product_descriptions'
  ORDER BY ordinal_position`);

const constraints = await q(`
  SELECT c.conname, pg_get_constraintdef(c.oid) AS def
  FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'shared_product_descriptions'
  ORDER BY c.conname`);

const indexes = await q(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'shared_product_descriptions' ORDER BY indexname`);

const dist = await q(`
  SELECT COALESCE(language,'(null)') AS lang, description_type, status, (deleted_at IS NULL) AS alive, count(*)::int AS n
  FROM shared_product_descriptions
  GROUP BY 1,2,3,4 ORDER BY n DESC LIMIT 60`);

const storeEn = await q(`
  SELECT status, (deleted_at IS NULL) AS alive, count(*)::int AS n
  FROM shared_product_descriptions
  WHERE description_type = 'STORE' AND language = 'en'
  GROUP BY 1,2 ORDER BY n DESC`);

const enumStatus = await q(`
  SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
  WHERE t.typname IN (
    SELECT udt_name FROM information_schema.columns
    WHERE table_name='shared_product_descriptions' AND column_name IN ('status','language','description_type','source_type'))
  ORDER BY t.typname, e.enumsortorder`);

await client.end();
console.log(JSON.stringify({ columns, constraints, indexes, distribution: dist, storeEn, enumStatus, dbWrites: 0 }, null, 2));
