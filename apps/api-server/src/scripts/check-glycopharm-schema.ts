/**
 * Check glycopharm_products table schema
 */

import pg from 'pg';
const { Client } = pg;

// 자격증명은 환경변수로만 주입한다. fallback 리터럴을 두지 않는다 (CLAUDE.md §15).
const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  ssl: false,
};

for (const key of ['DB_HOST', 'DB_NAME', 'DB_USERNAME', 'DB_PASSWORD'] as const) {
  if (!process.env[key]) {
    console.error(`❌ ${key} 환경변수가 필요합니다.`);
    process.exit(1);
  }
}

async function checkSchema() {
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('✅ Connected\n');

    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'glycopharm_products'
      ORDER BY ordinal_position;
    `);

    console.log('📊 glycopharm_products columns:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(30)} ${row.data_type.padEnd(20)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

checkSchema();
