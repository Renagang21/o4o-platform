/**
 * Bootstrap App Installation Script
 *
 * Installs core apps in dependency order after FULL CLEAN RESET
 * Plain JavaScript version - runs without compilation
 */
import { AppDataSource } from '../dist/database/connection.js';
import { AppManager } from '../dist/services/AppManager.js';
import logger from '../dist/utils/logger.js';

const CORE_APPS_INSTALL_ORDER = [
  'organization-core',
  'forum-core',
  'lms-core',
  'organization-forum',
  'forum-cosmetics',
  'forum-yaksa',
  'sellerops',
  'supplierops',
  'partnerops',
];

async function bootstrapInstallApps() {
  try {
    logger.info('🚀 Starting bootstrap app installation...');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      logger.info('Initializing database connection...');
      await AppDataSource.initialize();
      logger.info('✅ Database connected');
    }

    // Create AppManager instance
    const appManager = new AppManager();

    // Install each app in dependency order
    for (const appId of CORE_APPS_INSTALL_ORDER) {
      try {
        logger.info(`\n📦 Installing ${appId}...`);
        await appManager.install(appId, { autoActivate: true });
        logger.info(`✅ Successfully installed and activated ${appId}`);
      } catch (error) {
        logger.error(`❌ Failed to install ${appId}:`, error.message);
        logger.error(error.stack);
        // Continue with next app instead of stopping
      }
    }

    logger.info('\n✅ Bootstrap installation completed');
    logger.info(`\nInstalled apps:`);
    const installedApps = await appManager.listInstalled();
    for (const app of installedApps) {
      logger.info(`  - ${app.appId} (${app.version}) - ${app.status}`);
    }

    process.exit(0);
  } catch (error) {
    logger.error('❌ Bootstrap installation failed:', error);
    logger.error(error.stack);
    process.exit(1);
  }
}

bootstrapInstallApps();
