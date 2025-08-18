#!/usr/bin/env node
/**
 * Simple Database Connection Test
 * 
 * This script tests database connectivity and helps diagnose
 * "password must be a string" errors in production deployments.
 */

const { Client } = require('pg');
const path = require('path');

// Try to load environment variables
try {
  require('dotenv').config({ 
    path: path.resolve(__dirname, '../apps/api-server/.env')
  });
} catch (e) {
  console.log('Note: Could not load .env file, using environment variables');
}

console.log('🔍 Database Connection Test\n');

// Get database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: String(process.env.DB_PASSWORD || ''), // Ensure password is a string
  database: process.env.DB_NAME || 'o4o_platform'
};

console.log('Configuration:');
console.log(`- Host: ${config.host}:${config.port}`);
console.log(`- Database: ${config.database}`);
console.log(`- User: ${config.user}`);
console.log(`- Password: ${config.password ? '[SET]' : '[NOT SET]'}`);
console.log(`- Password length: ${config.password.length}`);
console.log(`- Password type: ${typeof config.password}`);

async function testConnection() {
  const client = new Client(config);
  
  try {
    console.log('\nConnecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time, current_database() as db');
    console.log('Query result:');
    console.log(`- Current time: ${result.rows[0].current_time}`);
    console.log(`- Database: ${result.rows[0].db}`);
    
    await client.end();
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    
    // Additional diagnostics for common issues
    if (error.message.includes('password must be a string')) {
      console.error('\n⚠️  Password type error detected!');
      console.error('This usually happens when DB_PASSWORD is set as a number in GitHub Secrets.');
      console.error('Solution: Ensure DB_PASSWORD is added as a string in GitHub Secrets.');
    } else if (error.message.includes('password authentication failed')) {
      console.error('\n⚠️  Authentication failed!');
      console.error('Check that the password is correct and properly escaped.');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n⚠️  Connection refused!');
      console.error('Check that PostgreSQL is running and accessible.');
    }
    
    process.exit(1);
  }
}

testConnection();