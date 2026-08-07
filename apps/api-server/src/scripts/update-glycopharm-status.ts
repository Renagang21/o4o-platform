/**
 * Update Glycopharm Product Status
 * Executes SQL migration to update glycopharm_products status to 'active'
 *
 * WO-GLYCOPHARM-B2B-PRODUCT-SEED-LINKING-V1 (Task T3)
 *
 * Usage: DB_PASSWORD=your-password npx tsx src/scripts/update-glycopharm-status.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const { Client } = pg;

// 운영 DB 접근은 Cloud SQL Auth Proxy 를 경유한다 (직접 host 지정 금지).
const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5442),
  database: process.env.DB_NAME || 'o4o_platform',
  user: process.env.DB_USERNAME || 'o4o_api',
  password: process.env.DB_PASSWORD,
  ssl: false,
  connectionTimeoutMillis: 10000,
};

async function updateProductStatus() {
  console.log('🚀 Starting Glycopharm product status update...\n');

  // Validate password
  if (!DB_CONFIG.password) {
    console.error('❌ Error: DB_PASSWORD environment variable is required');
    console.error('Usage: DB_PASSWORD=your-password npx tsx src/scripts/update-glycopharm-status.ts');
    process.exit(1);
  }

  const client = new Client(DB_CONFIG);

  try {
    // Connect to database
    console.log('📡 Connecting to production database...');
    console.log(`   Host: ${DB_CONFIG.host}`);
    console.log(`   Database: ${DB_CONFIG.database}\n`);

    await client.connect();
    console.log('✅ Connected to database\n');

    // Read SQL file
    const sqlFilePath = join(process.cwd(), 'migrations-sql', 'update-glycopharm-product-status.sql');
    console.log(`📄 Reading SQL file: ${sqlFilePath}\n`);

    const sql = readFileSync(sqlFilePath, 'utf-8');

    // Execute SQL
    console.log('⚙️  Executing migration SQL...\n');
    console.log('─'.repeat(80));

    await client.query(sql);

    console.log('─'.repeat(80));
    console.log('\n✅ Migration executed successfully!\n');

    console.log('\n🎉 Product status update completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n📡 Database connection closed');
  }
}

// Run migration
updateProductStatus().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
