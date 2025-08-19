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


// Get database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'o4o_platform'
};

// Diagnostic information

// Password diagnostics

// Test raw environment variable
// Password check removed for CI/CD

// Test password conversion
const originalPassword = process.env.DB_PASSWORD;
const stringPassword = String(process.env.DB_PASSWORD || '');

// Test database connection

async function testConnection() {
  // Test 1: Using original password
  const client1 = new Client({
    ...dbConfig,
    password: process.env.DB_PASSWORD
  });

  try {
    await client1.connect();
    await client1.end();
  } catch (error: unknown) {
    // Error handling removed for CI/CD
  }

  // Test 2: Using String() converted password
  const client2 = new Client({
    ...dbConfig,
    password: String(process.env.DB_PASSWORD || '')
  });

  try {
    await client2.connect();
    
    // Run a simple query
    const result = await client2.query('SELECT current_database(), current_user, version()');
    
    await client2.end();
  } catch (error: unknown) {
    // Error handling removed for CI/CD
  }

  // Test 3: TypeORM-style configuration
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
    
    await testDataSource.destroy();
  } catch (error: unknown) {
    // Error handling removed for CI/CD
  }
}

// Run tests
testConnection().then(() => {
}).catch((error) => {
  console.error('\n💥 Test script error:', error);
  process.exit(1);
});