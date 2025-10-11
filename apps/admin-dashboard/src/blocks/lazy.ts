/**
 * Lazy Loading for Block Components
 * Simplified - blocks are now loaded via block registry at startup
 * This file maintains API compatibility with existing imports
 */

/**
 * Load a block on demand (no-op - blocks loaded at startup)
 * @deprecated Blocks are now registered at startup via block registry
 */
export async function loadBlock(_blockName: string): Promise<void> {
  // No-op: All blocks are registered at startup
  return Promise.resolve();
}

/**
 * Load blocks based on content (no-op)
 * @deprecated Blocks are now registered at startup via block registry
 */
export async function loadBlocksForContent(_content: string): Promise<void> {
  // No-op: All blocks are registered at startup
  return Promise.resolve();
}

/**
 * Preload commonly used blocks (no-op)
 * @deprecated Blocks are now registered at startup via block registry
 */
export async function preloadCommonBlocks(): Promise<void> {
  // No-op: All blocks are registered at startup
  return Promise.resolve();
}

/**
 * Initialize lazy loading system (no-op)
 * @deprecated Blocks are now registered at startup via block registry
 */
export function initializeLazyBlocks(): void {
  // No-op: All blocks are registered at startup
}