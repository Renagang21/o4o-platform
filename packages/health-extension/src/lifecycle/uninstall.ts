/**
 * Health Extension Uninstall Lifecycle
 *
 * @package @o4o/health-extension
 */

export interface UninstallContext {
  dataSource?: any;
  logger?: any;
  purgeData?: boolean;
}

export async function uninstall(context: UninstallContext = {}): Promise<void> {
  const { logger, purgeData = false } = context;
  const log = logger?.info?.bind(logger) || console.log;

  log('[health-extension] Uninstalling Health Extension...');

  if (purgeData) {
    log('[health-extension] Purge data requested');
    // Health Extension uses metadata approach - no dedicated tables to drop
    // Health metadata in products will remain unless explicitly cleaned
    log('[health-extension] Note: Product health metadata will be retained');
  }

  log('[health-extension] Health Extension uninstalled successfully');
}

export default uninstall;
