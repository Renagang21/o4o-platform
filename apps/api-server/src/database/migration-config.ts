/**
 * Migration-specific DataSource Configuration (TypeORM CLI)
 *
 * Lightweight DataSource for the TypeORM CLI only (migration:revert). It does NOT import
 * entities and it loads NO glob: the migration list is the explicit incremental manifest
 * (src/database/incremental/manifest.ts). Historical migrations are never loaded here.
 *
 * Applying migrations goes through src/migrate.ts (deploy job) — not this file.
 * (WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1)
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { INCREMENTAL_MIGRATIONS } from './incremental/manifest.js';

const DB_HOST = process.env.DB_HOST;
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USERNAME = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

// Cloud SQL Unix Socket detection
const isCloudSQLSocket = DB_HOST?.startsWith('/cloudsql/');

const connectionConfig = isCloudSQLSocket
  ? { type: 'postgres' as const, host: DB_HOST, username: DB_USERNAME, password: DB_PASSWORD, database: DB_NAME }
  : { type: 'postgres' as const, host: DB_HOST, port: DB_PORT, username: DB_USERNAME, password: DB_PASSWORD, database: DB_NAME };

// TypeORM CLI requires ONLY ONE export of DataSource instance
export default new DataSource({
  ...connectionConfig,
  entities: [],
  migrations: [...INCREMENTAL_MIGRATIONS],
  migrationsTableName: 'typeorm_migrations',
  logging: ['error', 'schema', 'migration'],
  synchronize: false,
});
