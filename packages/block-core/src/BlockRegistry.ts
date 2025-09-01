import { BlockDefinition } from './types';

/**
 * Block Registry - Manages block registration and retrieval
 */
export class BlockRegistry {
  private blocks: Map<string, BlockDefinition> = new Map();
  private categories: Map<string, Set<string>> = new Map();
  private keywords: Map<string, Set<string>> = new Map();

  /**
   * Register a block
   */
  register(blockName: string, definition: BlockDefinition): void {
    if (this.blocks.has(blockName)) {
      // Block is already registered, overwriting
    }

    // Store block definition
    this.blocks.set(blockName, definition);

    // Add to category index
    this.addToCategory(definition.category, blockName);

    // Add to keyword index
    if (definition.keywords) {
      this.addToKeywords(definition.keywords, blockName);
    }

    // Register with WordPress if available
    this.registerWithWordPress(blockName, definition);

    // Block registered
  }

  /**
   * Unregister a block
   */
  unregister(blockName: string): void {
    const block = this.blocks.get(blockName);
    
    if (!block) {
      // Block is not registered
      return;
    }

    // Remove from category index
    this.removeFromCategory(block.category, blockName);

    // Remove from keyword index
    if (block.keywords) {
      this.removeFromKeywords(block.keywords, blockName);
    }

    // Unregister from WordPress
    this.unregisterFromWordPress(blockName);

    // Remove block definition
    this.blocks.delete(blockName);

    // Block unregistered
  }

  /**
   * Get block definition
   */
  getBlock(blockName: string): BlockDefinition | undefined {
    return this.blocks.get(blockName);
  }

  /**
   * Get all blocks
   */
  getAllBlocks(): BlockDefinition[] {
    return Array.from(this.blocks.values());
  }

  /**
   * Get blocks by category
   */
  getBlocksByCategory(category: string): BlockDefinition[] {
    const blockNames = this.categories.get(category) || new Set();
    return Array.from(blockNames)
      .map(name => this.blocks.get(name))
      .filter(Boolean) as BlockDefinition[];
  }

  /**
   * Get blocks by keyword
   */
  getBlocksByKeyword(keyword: string): BlockDefinition[] {
    const blockNames = this.keywords.get(keyword.toLowerCase()) || new Set();
    return Array.from(blockNames)
      .map(name => this.blocks.get(name))
      .filter(Boolean) as BlockDefinition[];
  }

  /**
   * Search blocks
   */
  searchBlocks(query: string): BlockDefinition[] {
    const lowerQuery = query.toLowerCase();
    const results = new Set<BlockDefinition>();

    // Search in block names
    for (const [name, block] of this.blocks) {
      if (name.toLowerCase().includes(lowerQuery)) {
        results.add(block);
      }
    }

    // Search in titles
    for (const block of this.blocks.values()) {
      if (block.title.toLowerCase().includes(lowerQuery)) {
        results.add(block);
      }
    }

    // Search in descriptions
    for (const block of this.blocks.values()) {
      if (block.description?.toLowerCase().includes(lowerQuery)) {
        results.add(block);
      }
    }

    // Search in keywords
    const keywordResults = this.getBlocksByKeyword(query);
    keywordResults.forEach(block => results.add(block));

    return Array.from(results);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  /**
   * Check if block is registered
   */
  isRegistered(blockName: string): boolean {
    return this.blocks.has(blockName);
  }

  /**
   * Get block count
   */
  getBlockCount(): number {
    return this.blocks.size;
  }

  /**
   * Clear all blocks
   */
  clear(): void {
    // Unregister all blocks from WordPress
    for (const blockName of this.blocks.keys()) {
      this.unregisterFromWordPress(blockName);
    }

    // Clear all indices
    this.blocks.clear();
    this.categories.clear();
    this.keywords.clear();
  }

  // Private helper methods

  private addToCategory(category: string, blockName: string): void {
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set());
    }
    this.categories.get(category)!.add(blockName);
  }

  private removeFromCategory(category: string, blockName: string): void {
    const categoryBlocks = this.categories.get(category);
    if (categoryBlocks) {
      categoryBlocks.delete(blockName);
      if (categoryBlocks.size === 0) {
        this.categories.delete(category);
      }
    }
  }

  private addToKeywords(keywords: string[], blockName: string): void {
    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (!this.keywords.has(lowerKeyword)) {
        this.keywords.set(lowerKeyword, new Set());
      }
      this.keywords.get(lowerKeyword)!.add(blockName);
    }
  }

  private removeFromKeywords(keywords: string[], blockName: string): void {
    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      const keywordBlocks = this.keywords.get(lowerKeyword);
      if (keywordBlocks) {
        keywordBlocks.delete(blockName);
        if (keywordBlocks.size === 0) {
          this.keywords.delete(lowerKeyword);
        }
      }
    }
  }

  private registerWithWordPress(blockName: string, definition: BlockDefinition): void {
    // Check if WordPress is available
    if (typeof window !== 'undefined' && window.wp?.blocks?.registerBlockType) {
      try {
        window.wp.blocks.registerBlockType(blockName, {
          title: definition.title,
          icon: definition.icon,
          category: definition.category,
          attributes: definition.attributes,
          supports: definition.supports,
          edit: definition.edit,
          save: definition.save,
          deprecated: definition.deprecated,
          transforms: definition.transforms,
          variations: definition.variations,
          example: definition.example,
        });
      } catch (error) {
        console.error(`Failed to register block ${blockName} with WordPress:`, error);
      }
    }
  }

  private unregisterFromWordPress(blockName: string): void {
    // Check if WordPress is available
    if (typeof window !== 'undefined' && window.wp?.blocks?.unregisterBlockType) {
      try {
        window.wp.blocks.unregisterBlockType(blockName);
      } catch (error) {
        console.error(`Failed to unregister block ${blockName} from WordPress:`, error);
      }
    }
  }
}

// Extend window interface for WordPress
declare global {
  interface Window {
    wp?: {
      blocks?: {
        registerBlockType?: (name: string, settings: any) => any;
        unregisterBlockType?: (name: string) => any;
      };
    };
  }
}