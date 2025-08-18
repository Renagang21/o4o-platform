#!/usr/bin/env ts-node
/**
 * Test Database Connection Script
 * 
 * This script tests the database connection configuration,
 * specifically focusing on password handling to prevent "password must be a string" errors.
 */

import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// // console.log('🔍 Database Connection Test\n');
// // console.log('Environment:', process.env.NODE_ENV || 'development');
// // console.log('Config file:', envPath);
// // console.log('---');

// Get database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'o4o_platform'
};

// Diagnostic information
// // console.log('\n📊 Database Configuration:');
// // console.log(`Host: ${dbConfig.host}`);
// // console.log(`Port: ${dbConfig.port}`);
// // console.log(`Username: ${dbConfig.user}`);
// // console.log(`Database: ${dbConfig.database}`);

// Password diagnostics
// // console.log('\n🔐 Password Diagnostics:');
// // console.log(`DB_PASSWORD environment variable exists: ${process.env.DB_PASSWORD !== undefined}`);
// // console.log(`DB_PASSWORD type: ${typeof process.env.DB_PASSWORD}`);
// // console.log(`DB_PASSWORD length: ${process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0}`);

// Test raw environment variable
if (process.env.DB_PASSWORD !== undefined) {
  // // console.log(`DB_PASSWORD is numeric: ${/^\d+$/.test(process.env.DB_PASSWORD)}`);
  // // console.log(`DB_PASSWORD starts with quote: ${process.env.DB_PASSWORD.startsWith('"') || process.env.DB_PASSWORD.startsWith("'")}`);
  // // console.log(`DB_PASSWORD ends with quote: ${process.env.DB_PASSWORD.endsWith('"') || process.env.DB_PASSWORD.endsWith("'")}`);
}

// Test password conversion
// // console.log('\n🔄 Password Conversion Test:');
const originalPassword = process.env.DB_PASSWORD;
const stringPassword = String(process.env.DB_PASSWORD || '');
// // console.log(`Original password type: ${typeof originalPassword}`);
// // console.log(`Converted password type: ${typeof stringPassword}`);
// // console.log(`Passwords are identical: ${originalPassword === stringPassword}`);

// Test database connection
// // console.log('\n🔌 Testing Database Connection...\n');

async function testConnection() {
  // Test 1: Using original password
  // // console.log('Test 1: Using original password (process.env.DB_PASSWORD)');
  const client1 = new Client({
    ...dbConfig,
    password: process.env.DB_PASSWORD
  });

  try {
    await client1.connect();
    // // console.log('✅ Connection successful with original password');
    await client1.end();
  } catch (error: unknown) {
    // // console.log('❌ Connection failed with original password');
    // // console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Test 2: Using String() converted password
  // // console.log('\nTest 2: Using String() converted password');
  const client2 = new Client({
    ...dbConfig,
    password: String(process.env.DB_PASSWORD || '')
  });

  try {
    await client2.connect();
    // // console.log('✅ Connection successful with String() converted password');
    
    // Run a simple query
    const result = await client2.query('SELECT current_database(), current_user, version()');
    // // console.log('\n📋 Database Info:');
    // // console.log(`Database: ${result.rows[0].current_database}`);
    // // console.log(`User: ${result.rows[0].current_user}`);
    // // console.log(`Version: ${result.rows[0].version.split(',')[0]}`);
    
    await client2.end();
  } catch (error: unknown) {
    // // console.log('❌ Connection failed with String() converted password');
    // // console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Test 3: TypeORM-style configuration
  // // console.log('\nTest 3: Testing TypeORM-style configuration');
  try {
    const { DataSource } = await import('typeorm');
    
    const testDataSource = new DataSource({
      type: 'postgres',
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.user,
      password: String(process.env.DB_PASSWORD || ''),
      database: dbConfig.database,
      synchronize: false,
      logging: false
    });

    await testDataSource.initialize();
    // // console.log('✅ TypeORM DataSource initialized successfully');
    
    await testDataSource.destroy();
  } catch (error: unknown) {
    // // console.log('❌ TypeORM DataSource initialization failed');
    // // console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Run tests
testConnection().then(() => {
  // // console.log('\n✨ Database connection tests completed');
}).catch((error) => {
  console.error('\n💥 Test script error:', error);
  process.exit(1);
});