/**
 * Health Extension Activate Lifecycle
 *
 * @package @o4o/health-extension
 */

export interface ActivateContext {
  dataSource?: any;
  logger?: any;
  eventEmitter?: any;
}

export async function activate(context: ActivateContext = {}): Promise<void> {
  const { logger, eventEmitter } = context;
  const log = logger?.info?.bind(logger) || console.log;

  log('[health-extension] Activating Health Extension...');

  // Register event handlers if event emitter is available
  if (eventEmitter) {
    log('[health-extension] Registering event handlers...');
    // Event handlers will be registered through the event system
  }

  // Register hooks
  log('[health-extension] Registering validation hooks...');
  // Hooks are exported and used by Core services

  log('[health-extension] Health Extension activated successfully');
}

export default activate;
