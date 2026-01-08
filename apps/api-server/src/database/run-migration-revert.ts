/**
 * @deprecated This file is no longer used in production deployments.
 *
 * For reverting migrations in production, use TypeORM CLI:
 *   npx typeorm migration:revert -d dist/database/migration-config.js
 *
 * This file is kept for local development convenience only.
 * See: run-migration.ts for more details on why this is deprecated.
 */
import 'reflect-metadata';
import { AppDataSource } from './connection.js';
import logger from '../utils/logger.js';

async function revertMigration() {
  try {
    logger.info('📦 Initializing database connection...');
    await AppDataSource.initialize();
    logger.info('✅ Data source initialized successfully');

    logger.info('🔄 Reverting last migration...');
    await AppDataSource.undoLastMigration();
    logger.info('✅ Migration reverted successfully');

    await AppDataSource.destroy();
    logger.info('✅ Data source closed successfully');
  } catch (error) {
    logger.error('❌ Migration revert error:', error);
    process.exit(1);
  }
}

revertMigration();
