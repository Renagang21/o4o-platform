/**
 * Block Registry - Central block management system
 * Singleton pattern for unified block registration and retrieval
 */

import {
  BlockDefinition,
  BlockRegistryEntry,
  BlockCategory,
  BlockSearchResult,
} from './types';

class BlockRegistry {
  private static instance: BlockRegistry | null = null;
  private blocks: Map<string, BlockRegistryEntry> = new Map();
  private categoryIndex: Map<BlockCategory, Set<string>> = new Map();

  private constructor() {
    // Initialize category index
    this.initializeCategoryIndex();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): BlockRegistry {
    if (!BlockRegistry.instance) {
      BlockRegistry.instance = new BlockRegistry();
    }
    return BlockRegistry.instance;
  }

  /**
   * Initialize category index
   */
  private initializeCategoryIndex(): void {
    const categories: BlockCategory[] = [
      'text',
      'media',
      'layout',
      'widgets',
      'embed',
      'design',
      'dynamic',
      'common',
    ];

    categories.forEach((category) => {
      this.categoryIndex.set(category, new Set());
    });
  }

  /**
   * Register a block
   */
  public register(definition: BlockDefinition): void {
    // Validate block definition
    this.validateDefinition(definition);

    // Check for duplicate registration
    if (this.blocks.has(definition.name)) {
      if (import.meta.env.DEV) {
        console.warn(`Block "${definition.name}" is already registered. Overwriting...`);
      }
    }

    // Create registry entry
    const entry: BlockRegistryEntry = {
      ...definition,
      registeredAt: new Date(),
    };

    // Store block
    this.blocks.set(definition.name, entry);

    // Update category index
    const categoryBlocks = this.categoryIndex.get(definition.category);
    if (categoryBlocks) {
      categoryBlocks.add(definition.name);
    }
  }

  /**
   * Validate block definition
   */
  private validateDefinition(definition: BlockDefinition): void {
    if (!definition.name) {
      throw new Error('Block definition must have a name');
    }
    if (!definition.title) {
      throw new Error(`Block "${definition.name}" must have a title`);
    }
    if (!definition.category) {
      throw new Error(`Block "${definition.name}" must have a category`);
    }
    if (!definition.component) {
      throw new Error(`Block "${definition.name}" must have a component`);
    }
  }

  /**
   * Get block by name
   */
  public get(name: string): BlockDefinition | undefined {
    const entry = this.blocks.get(name);
    if (!entry) {
      return undefined;
    }

    // Return definition without internal metadata
    const { registeredAt, ...definition } = entry;
    return definition as BlockDefinition;
  }

  /**
   * Get blocks by category
   */
  public getByCategory(category: BlockCategory): BlockDefinition[] {
    const blockNames = this.categoryIndex.get(category);
    if (!blockNames) {
      return [];
    }

    const blocks: BlockDefinition[] = [];
    blockNames.forEach((name) => {
      const block = this.get(name);
      if (block) {
        blocks.push(block);
      }
    });

    return blocks;
  }

  /**
   * Get all registered blocks
   */
  public getAll(): BlockDefinition[] {
    const blocks: BlockDefinition[] = [];
    this.blocks.forEach((entry) => {
      const { registeredAt, ...definition } = entry;
      blocks.push(definition as BlockDefinition);
    });
    return blocks;
  }

  /**
   * Search blocks by keyword
   */
  public search(query: string): BlockSearchResult[] {
    const lowerQuery = query.toLowerCase();
    const results: BlockSearchResult[] = [];

    this.blocks.forEach((entry) => {
      const { registeredAt, ...definition } = entry;
      let score = 0;

      // Check title
      if (definition.title.toLowerCase().includes(lowerQuery)) {
        score += 10;
      }

      // Check name
      if (definition.name.toLowerCase().includes(lowerQuery)) {
        score += 8;
      }

      // Check description
      if (definition.description?.toLowerCase().includes(lowerQuery)) {
        score += 5;
      }

      // Check keywords
      if (definition.keywords) {
        definition.keywords.forEach((keyword) => {
          if (keyword.toLowerCase().includes(lowerQuery)) {
            score += 3;
          }
        });
      }

      if (score > 0) {
        results.push({
          block: definition as BlockDefinition,
          score,
        });
      }
    });

    // Sort by score (descending)
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Check if block exists
   */
  public has(name: string): boolean {
    return this.blocks.has(name);
  }

  /**
   * Unregister a block
   */
  public unregister(name: string): boolean {
    const block = this.blocks.get(name);
    if (!block) {
      return false;
    }

    // Remove from category index
    const categoryBlocks = this.categoryIndex.get(block.category);
    if (categoryBlocks) {
      categoryBlocks.delete(name);
    }

    // Remove from blocks map
    this.blocks.delete(name);

    return true;
  }

  /**
   * Get block count
   */
  public count(): number {
    return this.blocks.size;
  }

  /**
   * Get categories with block counts
   */
  public getCategoryStats(): Record<BlockCategory, number> {
    const stats: Partial<Record<BlockCategory, number>> = {};

    this.categoryIndex.forEach((blockNames, category) => {
      stats[category] = blockNames.size;
    });

    return stats as Record<BlockCategory, number>;
  }

  /**
   * Clear all blocks (for testing)
   */
  public clear(): void {
    this.blocks.clear();
    this.categoryIndex.forEach((set) => set.clear());
  }

  /**
   * Get registry metadata
   */
  public getMetadata(): {
    totalBlocks: number;
    categories: Record<BlockCategory, number>;
    blockNames: string[];
  } {
    return {
      totalBlocks: this.count(),
      categories: this.getCategoryStats(),
      blockNames: Array.from(this.blocks.keys()),
    };
  }
}

// Export singleton instance
export const blockRegistry = BlockRegistry.getInstance();

// Export class for testing
export default BlockRegistry;
