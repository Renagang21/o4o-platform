/**
 * Health Extension Install Lifecycle
 *
 * @package @o4o/health-extension
 */

export interface InstallContext {
  dataSource?: any;
  logger?: any;
}

export async function install(context: InstallContext = {}): Promise<void> {
  const { logger } = context;
  const log = logger?.info?.bind(logger) || console.log;

  log('[health-extension] Installing Health Extension...');

  // Health Extension uses metadata extension approach
  // No custom tables to create
  // ProductType.HEALTH filter applied at runtime

  log('[health-extension] Health Extension installed successfully');
}

export default install;
