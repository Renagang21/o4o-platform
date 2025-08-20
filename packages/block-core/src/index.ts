/**
 * O4O Platform Block Core
 * Core plugin system for managing block plugins
 */

export { BlockManager } from './BlockManager';
export { BlockRegistry } from './BlockRegistry';
export { PluginLoader } from './PluginLoader';

export type {
  BlockPlugin,
  BlockDefinition,
  BlockAttribute,
  BlockSupports,
  PluginSettings,
  LoadOptions,
  PluginMetadata
} from './types';

// Create and export singleton instance
import { BlockManager } from './BlockManager';

const blockManager = BlockManager.getInstance();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      blockManager.initialize().catch(console.error);
    });
  } else {
    blockManager.initialize().catch(console.error);
  }
}

export default blockManager;