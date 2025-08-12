#!/usr/bin/env ts-node
"use strict";
/**
 * Test Database Connection Script
 *
 * This script tests the database connection configuration,
 * specifically focusing on password handling to prevent "password must be a string" errors.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const pg_1 = require("pg");
// Load environment variables
const envPath = path_1.default.resolve(__dirname, '../../.env');
dotenv_1.default.config({ path: envPath });
console.log('🔍 Database Connection Test\n');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Config file:', envPath);
console.log('---');
// Get database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform'
};
// Diagnostic information
console.log('\n📊 Database Configuration:');
console.log(`Host: ${dbConfig.host}`);
console.log(`Port: ${dbConfig.port}`);
console.log(`Username: ${dbConfig.user}`);
console.log(`Database: ${dbConfig.database}`);
// Password diagnostics
console.log('\n🔐 Password Diagnostics:');
console.log(`DB_PASSWORD environment variable exists: ${process.env.DB_PASSWORD !== undefined}`);
console.log(`DB_PASSWORD type: ${typeof process.env.DB_PASSWORD}`);
console.log(`DB_PASSWORD length: ${process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0}`);
// Test raw environment variable
if (process.env.DB_PASSWORD !== undefined) {
    console.log(`DB_PASSWORD is numeric: ${/^\d+$/.test(process.env.DB_PASSWORD)}`);
    console.log(`DB_PASSWORD starts with quote: ${process.env.DB_PASSWORD.startsWith('"') || process.env.DB_PASSWORD.startsWith("'")}`);
    console.log(`DB_PASSWORD ends with quote: ${process.env.DB_PASSWORD.endsWith('"') || process.env.DB_PASSWORD.endsWith("'")}`);
}
// Test password conversion
console.log('\n🔄 Password Conversion Test:');
const originalPassword = process.env.DB_PASSWORD;
const stringPassword = String(process.env.DB_PASSWORD || '');
console.log(`Original password type: ${typeof originalPassword}`);
console.log(`Converted password type: ${typeof stringPassword}`);
console.log(`Passwords are identical: ${originalPassword === stringPassword}`);
// Test database connection
console.log('\n🔌 Testing Database Connection...\n');
async function testConnection() {
    // Test 1: Using original password
    console.log('Test 1: Using original password (process.env.DB_PASSWORD)');
    const client1 = new pg_1.Client({
        ...dbConfig,
        password: process.env.DB_PASSWORD
    });
    try {
        await client1.connect();
        console.log('✅ Connection successful with original password');
        await client1.end();
    }
    catch (error) {
        console.log('❌ Connection failed with original password');
        console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    // Test 2: Using String() converted password
    console.log('\nTest 2: Using String() converted password');
    const client2 = new pg_1.Client({
        ...dbConfig,
        password: String(process.env.DB_PASSWORD || '')
    });
    try {
        await client2.connect();
        console.log('✅ Connection successful with String() converted password');
        // Run a simple query
        const result = await client2.query('SELECT current_database(), current_user, version()');
        console.log('\n📋 Database Info:');
        console.log(`Database: ${result.rows[0].current_database}`);
        console.log(`User: ${result.rows[0].current_user}`);
        console.log(`Version: ${result.rows[0].version.split(',')[0]}`);
        await client2.end();
    }
    catch (error) {
        console.log('❌ Connection failed with String() converted password');
        console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    // Test 3: TypeORM-style configuration
    console.log('\nTest 3: Testing TypeORM-style configuration');
    try {
        const { DataSource } = await Promise.resolve().then(() => __importStar(require('typeorm')));
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
        console.log('✅ TypeORM DataSource initialized successfully');
        await testDataSource.destroy();
    }
    catch (error) {
        console.log('❌ TypeORM DataSource initialization failed');
        console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}
// Run tests
testConnection().then(() => {
    console.log('\n✨ Database connection tests completed');
}).catch((error) => {
    console.error('\n💥 Test script error:', error);
    process.exit(1);
});
//# sourceMappingURL=test-db-connection.js.map