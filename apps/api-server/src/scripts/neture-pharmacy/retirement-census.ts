/** Read-only disposition evidence. No deletion, backfill, credentials or row contents are emitted. */
import { Client } from 'pg';
const client = new Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false });
const quote = (s: string) => '"' + s.replaceAll('"', '""') + '"';
const keys = ['k-cosmetics', 'k-cosmetics-event-offer', 'pharmacy-hub', 'pharmacy-hub-event-offer'];
await client.connect();
try {
  await client.query('BEGIN READ ONLY');
  const tables = (await client.query(`SELECT table_schema, table_name FROM information_schema.tables
    WHERE table_type='BASE TABLE' AND (table_schema='cosmetics' OR (table_schema='public' AND (table_name LIKE 'cosmetics_%' OR table_name LIKE 'pharmacy_hub_%')))
    ORDER BY table_schema, table_name`)).rows;
  const counts = [];
  for (const t of tables) {
    const n = (await client.query(`SELECT COUNT(*)::int AS count FROM ${quote(t.table_schema)}.${quote(t.table_name)}`)).rows[0].count;
    counts.push({ schema: t.table_schema, table: t.table_name, count: n });
  }
  const columns = (await client.query(`SELECT table_schema, table_name, column_name FROM information_schema.columns
    WHERE table_schema='public' AND column_name IN ('service_key','service_code','serviceKey','serviceCode') AND data_type IN ('text','character varying') ORDER BY table_name, column_name`)).rows;
  const shared = [];
  for (const t of columns) {
    const rows = (await client.query(`SELECT ${quote(t.column_name)} AS service, COUNT(*)::int AS count FROM ${quote(t.table_schema)}.${quote(t.table_name)}
      WHERE ${quote(t.column_name)} = ANY($1::text[]) GROUP BY ${quote(t.column_name)}`, [keys])).rows;
    if (rows.length) shared.push({ table: t.table_name, column: t.column_name, counts: rows });
  }
  const dependencies = (await client.query(`SELECT conname, conrelid::regclass::text AS referencing_table, confrelid::regclass::text AS referenced_table
    FROM pg_constraint WHERE contype='f' AND (confrelid::regclass::text LIKE '%cosmetics%' OR conrelid::regclass::text LIKE '%cosmetics%' OR confrelid::regclass::text LIKE '%pharmacy_hub%' OR conrelid::regclass::text LIKE '%pharmacy_hub%') ORDER BY conname`)).rows;
  console.log(JSON.stringify({ mode: 'read-only', counts, shared, dependencies, disposition: 'Review ownership, B2B history, printed QR and AUTH test-data targets before any separately approved deletion.' }, null, 2));
  await client.query('ROLLBACK');
} finally { await client.end(); }
