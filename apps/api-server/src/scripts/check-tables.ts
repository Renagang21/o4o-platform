/**
 * Check if required tables exist in production database
 */

import pg from 'pg';
const { Client } = pg;

const DB_CONFIG = {
  host: '34.64.96.252',
  port: 5432,
  database: 'o4o_platform',
  user: process.env.DB_USERNAME || 'o4o_api',
  password: process.env.DB_PASSWORD,
  ssl: false,
  connectionTimeoutMillis: 10000,
};

async function checkTables() {
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check for organization table
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('organization', 'users', 'migrations', 'glycopharm_products')
      ORDER BY table_name;
    `);

    console.log('📊 Found tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    if (result.rows.length === 0) {
      console.log('  (none of the checked tables exist)');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

checkTables();
