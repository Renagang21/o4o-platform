#!/usr/bin/env node
/**
 * Fix user_roles table schema
 * TypeORM @ManyToMany expects user_id and role_id columns
 */

import pg from 'pg';
const { Client } = pg;

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'o4o_api',
  password: process.env.DB_PASSWORD || 'O4oPlatform2025!',
  database: process.env.DB_NAME || 'o4o_platform',
};

console.log('🔗 Connecting to database...');
console.log(`   Host: ${config.host}:${config.port}`);
console.log(`   Database: ${config.database}`);

const client = new Client(config);

async function run() {
  await client.connect();
  console.log('✅ Connected to database');

  // Check current schema
  const checkResult = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'user_roles'
    ORDER BY ordinal_position
  `);

  console.log('\n📋 Current user_roles schema:');
  if (checkResult.rows.length === 0) {
    console.log('   Table does not exist');
  } else {
    checkResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });
  }

  // Check if schema needs fixing
  const hasUserId = checkResult.rows.some(r => r.column_name === 'user_id');
  const hasRoleId = checkResult.rows.some(r => r.column_name === 'role_id');

  if (hasUserId && hasRoleId && checkResult.rows.length === 2) {
    console.log('\n✅ Schema is already correct!');
    await client.end();
    return;
  }

  console.log('\n🔧 Fixing user_roles table...');

  // Drop and recreate with correct schema
  await client.query(`
    DROP TABLE IF EXISTS "user_roles" CASCADE;

    CREATE TABLE "user_roles" (
      "user_id" uuid NOT NULL,
      "role_id" uuid NOT NULL,
      CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id"),
      CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
    );

    CREATE INDEX "IDX_user_roles_user_id" ON "user_roles" ("user_id");
    CREATE INDEX "IDX_user_roles_role_id" ON "user_roles" ("role_id");
  `);

  console.log('✅ user_roles table fixed!');

  // Verify
  const verifyResult = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'user_roles'
    ORDER BY ordinal_position
  `);

  console.log('\n📋 New user_roles schema:');
  verifyResult.rows.forEach(row => {
    console.log(`   - ${row.column_name}: ${row.data_type}`);
  });

  await client.end();
  console.log('\n✅ Done!');
}

run().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
