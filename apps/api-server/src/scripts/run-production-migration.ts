/**
 * Production Migration Executor
 * Executes SQL migration files directly on production database
 *
 * Usage: npx tsx src/scripts/run-production-migration.ts
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;

// Production database configuration
const DB_CONFIG = {
  host: '34.64.96.252',
  port: 5432,
  database: 'o4o_platform',
  user: process.env.DB_USERNAME || 'o4o_api',
  password: process.env.DB_PASSWORD,
  ssl: false, // Cloud SQL public IP doesn't require SSL for same GCP project
  connectionTimeoutMillis: 10000,
};

async function runMigration() {
  console.log('🚀 Starting production migration...\n');

  // Validate password
  if (!DB_CONFIG.password) {
    console.error('❌ Error: DB_PASSWORD environment variable is required');
    console.error('Usage: DB_PASSWORD=your-password npx tsx src/scripts/run-production-migration.ts');
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
    const sqlFilePath = join(process.cwd(), 'migrations-sql', 'production-migration-2026-01-29-no-org-fk.sql');
    console.log(`📄 Reading SQL file: ${sqlFilePath}\n`);

    const sql = readFileSync(sqlFilePath, 'utf-8');

    // Execute SQL
    console.log('⚙️  Executing migration SQL...\n');
    console.log('─'.repeat(80));

    const result = await client.query(sql);

    console.log('─'.repeat(80));
    console.log('\n✅ Migration executed successfully!\n');

    // Display results
    if (Array.isArray(result)) {
      // Multiple statements
      result.forEach((res, index) => {
        if (res.rows && res.rows.length > 0) {
          console.log(`Result ${index + 1}:`, res.rows);
        }
      });
    } else if (result.rows && result.rows.length > 0) {
      console.log('Result:', result.rows);
    }

    console.log('\n🎉 Production migration completed successfully!');

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
runMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
