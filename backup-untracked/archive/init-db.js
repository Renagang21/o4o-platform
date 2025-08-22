#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function initDatabase() {
  console.log('🚀 Initializing O4O Platform Database...\n');

  try {
    // Check if PostgreSQL is running
    console.log('1. Checking PostgreSQL status...');
    try {
      await execPromise('pg_isready');
      console.log('✅ PostgreSQL is running\n');
    } catch (error) {
      console.error('❌ PostgreSQL is not running. Please start PostgreSQL first.');
      console.log('   Mac: brew services start postgresql');
      console.log('   Linux: sudo systemctl start postgresql\n');
      process.exit(1);
    }

    // Create database
    console.log('2. Creating database "o4o_platform"...');
    try {
      await execPromise('createdb o4o_platform');
      console.log('✅ Database created successfully\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Database already exists\n');
      } else {
        console.error('❌ Failed to create database:', error.message);
        process.exit(1);
      }
    }

    // Test connection
    console.log('3. Testing database connection...');
    const dbUrl = 'postgresql://postgres:password@localhost:5432/o4o_platform';
    try {
      await execPromise(`psql "${dbUrl}" -c "SELECT 1"`);
      console.log('✅ Database connection successful\n');
    } catch (error) {
      console.error('❌ Database connection failed. Please check your PostgreSQL configuration.');
      console.log('   You may need to update the password in .env file\n');
    }

    console.log('🎉 Database initialization complete!');
    console.log('\nNext steps:');
    console.log('1. cd apps/api-server');
    console.log('2. npm run migration:run');
    console.log('3. cd ../.. && npm run dev\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

initDatabase();