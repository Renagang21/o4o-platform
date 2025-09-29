#!/usr/bin/env node

/**
 * Script to check the status of Dropshipping CPTs in the database
 */

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api-server/.env') });

async function checkDropshippingCPTs() {
  const client = new Client({
    host: process.env.DB_HOST || '43.202.242.215',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'o4o_admin',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform'
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // 1. Check if dropshipping CPTs exist
    console.log('📊 Checking Dropshipping CPTs status...\n');
    const dropshippingQuery = `
      SELECT slug, name, active, public, created_at, updated_at
      FROM custom_post_types 
      WHERE slug LIKE 'ds_%'
      ORDER BY created_at DESC
    `;
    
    const dropshippingResult = await client.query(dropshippingQuery);
    
    if (dropshippingResult.rows.length === 0) {
      console.log('❌ No dropshipping CPTs found in database!\n');
    } else {
      console.log(`Found ${dropshippingResult.rows.length} dropshipping CPTs:\n`);
      console.table(dropshippingResult.rows);
    }

    // 2. Check all CPTs and their active status
    console.log('\n📊 All CPTs in database:\n');
    const allCptsQuery = `
      SELECT slug, name, active, created_at
      FROM custom_post_types 
      ORDER BY created_at DESC
      LIMIT 20
    `;
    
    const allCptsResult = await client.query(allCptsQuery);
    console.table(allCptsResult.rows);

    // 3. Count active vs inactive CPTs
    console.log('\n📊 CPT Statistics:\n');
    const statsQuery = `
      SELECT 
        COUNT(*) as total_cpts,
        COUNT(CASE WHEN active = true THEN 1 END) as active_cpts,
        COUNT(CASE WHEN active = false THEN 1 END) as inactive_cpts,
        COUNT(CASE WHEN active IS NULL THEN 1 END) as null_active_cpts,
        COUNT(CASE WHEN slug LIKE 'ds_%' THEN 1 END) as dropshipping_cpts,
        COUNT(CASE WHEN slug LIKE 'ds_%' AND active = true THEN 1 END) as active_dropshipping_cpts
      FROM custom_post_types
    `;
    
    const statsResult = await client.query(statsQuery);
    console.table(statsResult.rows);

    // 4. If dropshipping CPTs exist but are inactive, offer to activate them
    const inactiveDsCpts = dropshippingResult.rows.filter(row => !row.active);
    if (inactiveDsCpts.length > 0) {
      console.log('\n⚠️  Found inactive dropshipping CPTs:', inactiveDsCpts.map(c => c.slug).join(', '));
      console.log('   Run the update script to activate them.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Database connection refused. Check your database settings.');
    }
  } finally {
    await client.end();
    console.log('\n✨ Database check completed!');
  }
}

// Run the check
checkDropshippingCPTs();