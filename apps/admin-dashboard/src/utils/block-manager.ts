/**
 * Block Manager - Simplified stub
 * All blocks are now registered at startup via registerAllBlocks()
 * This file maintains API compatibility with existing imports
 *
 * @deprecated Use registerAllBlocks() from @/blocks instead
 */

export interface BlockCategory {
  name: string;
  priority: 'high' | 'medium' | 'low';
  blocks: string[];
  loaded: boolean;
}

class BlockManager {
  /**
   * Load blocks by category (no-op - blocks loaded at startup)
   */
  async loadCategory(_categoryName: string): Promise<void> {
    // No-op: All blocks registered at startup via registerAllBlocks()
    return Promise.resolve();
  }

  /**
   * Load only essential blocks (no-op)
   */
  async loadEssentialBlocks(): Promise<void> {
    // No-op: All blocks registered at startup
    return Promise.resolve();
  }

  /**
   * Load all high-priority blocks (no-op)
   */
  async loadHighPriorityBlocks(): Promise<void> {
    // No-op: All blocks registered at startup
    return Promise.resolve();
  }

  /**
   * Progressive loading strategy (no-op)
   */
  async loadBlocksProgressive(): Promise<void> {
    // No-op: All blocks registered at startup
    return Promise.resolve();
  }

  /**
   * Load specific block on demand (no-op)
   */
  async loadBlock(_blockName: string): Promise<any> {
    // No-op: All blocks registered at startup
    return Promise.resolve(null);
  }

  /**
   * Get loading statistics
   */
  getStats() {
    return {
      totalBlocks: 0,
      loadedBlocks: 0,
      loadedCategories: 0,
      totalCategories: 0
    };
  }
}

// Singleton instance
let blockManagerInstance: BlockManager | null = null;

export function getBlockManager(): BlockManager {
  if (!blockManagerInstance) {
    blockManagerInstance = new BlockManager();
  }
  return blockManagerInstance;
}

// Export for use in components
export default getBlockManager();