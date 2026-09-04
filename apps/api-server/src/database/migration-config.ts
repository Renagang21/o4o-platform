/**
 * Migration-specific DataSource Configuration
 *
 * This is a lightweight DataSource for running migrations only.
 * It does NOT import any entities - migrations execute raw SQL.
 *
 * Usage (TypeORM CLI):
 *   npx typeorm migration:run -d dist/database/migration-config.js
 *
 * Why separate from connection.ts?
 * - connection.ts imports 60+ entities for app runtime
 * - Migrations only need DB connection + migration files
 * - Separating reduces complexity and improves reliability
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const DB_HOST = process.env.DB_HOST;
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

// Cloud SQL Unix Socket detection
const isCloudSQLSocket = DB_HOST?.startsWith('/cloudsql/');

// Build connection config
const connectionConfig = isCloudSQLSocket
  ? {
      type: 'postgres' as const,
      host: DB_HOST,
      username: DB_USERNAME,
      password: DB_PASSWORD,
      database: DB_NAME,
    }
  : {
      type: 'postgres' as const,
      host: DB_HOST,
      port: DB_PORT,
      username: DB_USERNAME,
      password: DB_PASSWORD,
      database: DB_NAME,
    };

// Migration DataSource - NO entities, only migrations
// TypeORM CLI requires ONLY ONE export of DataSource instance
export default new DataSource({
  ...connectionConfig,

  // NO entities - migrations execute raw SQL
  entities: [],

  // Migration files location
  // Production: dist/database/migrations/*.js (compiled)
  // Development: src/database/migrations/*.ts (source)
  migrations: NODE_ENV === 'production'
    ? [join(__dirname, 'migrations', '*.js')]
    : [join(__dirname, 'migrations', '*.ts')],

  migrationsTableName: 'typeorm_migrations',

  // Logging for debugging
  logging: ['query', 'error', 'schema', 'migration'],

  // No synchronize - we use migrations
  synchronize: false,
});
