/**
 * Check glycopharm_products table schema
 */

import pg from 'pg';
const { Client } = pg;

const DB_CONFIG = {
  host: '34.64.96.252',
  port: 5432,
  database: 'o4o_platform',
  user: 'o4o_api',
  password: 'seoChuran1!',
  ssl: false,
};

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
