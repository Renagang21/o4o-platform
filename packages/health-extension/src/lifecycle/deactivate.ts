/**
 * Health Extension Deactivate Lifecycle
 *
 * @package @o4o/health-extension
 */

export interface DeactivateContext {
  dataSource?: any;
  logger?: any;
  eventEmitter?: any;
}

export async function deactivate(context: DeactivateContext = {}): Promise<void> {
  const { logger, eventEmitter } = context;
  const log = logger?.info?.bind(logger) || console.log;

  log('[health-extension] Deactivating Health Extension...');

  // Unregister event handlers if event emitter is available
  if (eventEmitter) {
    log('[health-extension] Unregistering event handlers...');
    // Event handlers will be unregistered
  }

  log('[health-extension] Health Extension deactivated successfully');
}

export default deactivate;
