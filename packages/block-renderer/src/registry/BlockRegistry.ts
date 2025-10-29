/**
 * Block Registry
 * Dynamic block registration and retrieval system
 */

import { BlockComponent } from '../types/block.types';

class BlockRegistry {
  private registry = new Map<string, BlockComponent>();
  private lazyRegistry = new Map<string, () => Promise<{ default: BlockComponent }>>();

  /**
   * Register a block component
   */
  register(type: string, component: BlockComponent): void {
    this.registry.set(type, component);
  }

  /**
   * Register multiple block components at once
   */
  registerMany(blocks: Record<string, BlockComponent>): void {
    Object.entries(blocks).forEach(([type, component]) => {
      this.register(type, component);
    });
  }

  /**
   * Register a lazy-loaded block component
   */
  registerLazy(type: string, loader: () => Promise<{ default: BlockComponent }>): void {
    this.lazyRegistry.set(type, loader);
  }

  /**
   * Get a block component by type
   * Supports both 'paragraph' and 'core/paragraph' formats
   */
  get(type: string): BlockComponent | undefined {
    // Direct match first
    if (this.registry.has(type)) {
      return this.registry.get(type);
    }

    // Try normalized type (remove core/ or o4o/ prefix)
    const normalizedType = type.replace(/^(core|o4o)\//, '');
    if (this.registry.has(normalizedType)) {
      return this.registry.get(normalizedType);
    }

    // Try with core/ prefix
    const coreType = `core/${normalizedType}`;
    if (this.registry.has(coreType)) {
      return this.registry.get(coreType);
    }

    // Try with o4o/ prefix
    const o4oType = `o4o/${normalizedType}`;
    if (this.registry.has(o4oType)) {
      return this.registry.get(o4oType);
    }

    return undefined;
  }

  /**
   * Check if a block type is registered
   */
  has(type: string): boolean {
    return this.get(type) !== undefined;
  }

  /**
   * Get all registered block types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.registry.clear();
    this.lazyRegistry.clear();
  }
}

// Singleton instance
export const blockRegistry = new BlockRegistry();
