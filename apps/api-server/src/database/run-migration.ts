/**
 * @deprecated This file is no longer used in production deployments.
 *
 * Production migrations now use TypeORM CLI with migration-config.ts:
 *   npx typeorm migration:run -d dist/database/migration-config.js
 *
 * Why deprecated?
 * - This script imports connection.ts which imports 60+ entities
 * - tsup bundling fails due to massive dependency chain
 * - migration-config.ts is a lightweight DataSource without entity imports
 *
 * This file is kept for local development convenience only.
 * For production, see: .github/workflows/deploy-api.yml
 */
import 'reflect-metadata';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

import { AppDataSource } from './connection.js';
import logger from '../utils/logger.js';

async function runMigration() {
  try {
    logger.info('📦 Initializing database connection...');
    await AppDataSource.initialize();
    logger.info('✅ Data source initialized successfully');

    logger.info('🔄 Running migrations...');
    const migrations = await AppDataSource.runMigrations();
    logger.info(`✅ ${migrations.length} migration(s) executed successfully`);

    await AppDataSource.destroy();
    logger.info('✅ Data source closed successfully');
  } catch (error) {
    logger.error('❌ Migration error:', error);
    process.exit(1);
  }
}

runMigration();