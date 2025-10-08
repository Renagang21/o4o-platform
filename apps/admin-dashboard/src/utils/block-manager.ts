/**
 * Block Manager - Optimized block loading strategy
 * Loads blocks on-demand to reduce initial bundle size
 */

export interface BlockCategory {
  name: string;
  priority: 'high' | 'medium' | 'low';
  blocks: string[];
  loaded: boolean;
}

class BlockManager {
  private categories: Map<string, BlockCategory> = new Map();
  private loadedBlocks: Set<string> = new Set();
  private blockRegistry: Map<string, any> = new Map();

  constructor() {
    this.initializeCategories();
  }

  private initializeCategories() {
    // Core blocks - always loaded
    this.categories.set('core', {
      name: 'Core Blocks',
      priority: 'high',
      blocks: ['paragraph', 'heading', 'list', 'list-item', 'quote', 'image'],
      loaded: false
    });

    // Layout blocks - loaded on demand
    this.categories.set('layout', {
      name: 'Layout Blocks',
      priority: 'medium',
      blocks: ['columns', 'column', 'group', 'separator', 'spacer', 'cover'],
      loaded: false
    });

    // Media blocks - lazy loaded
    this.categories.set('media', {
      name: 'Media Blocks',
      priority: 'low',
      blocks: ['gallery', 'audio', 'video', 'file', 'media-text', 'o4o/slide', 'o4o/markdown-reader', 'o4o/youtube', 'core/file'],
      loaded: false
    });

    // Widget blocks - lazy loaded
    this.categories.set('widgets', {
      name: 'Widget Blocks',
      priority: 'low',
      blocks: ['shortcode', 'archives', 'calendar', 'categories', 'latest-comments', 'latest-posts'],
      loaded: false
    });

    // Dynamic blocks - lazy loaded
    this.categories.set('dynamic', {
      name: 'Dynamic Blocks',
      priority: 'low',
      blocks: ['o4o/cpt-acf-loop', 'o4o/reusable', 'o4o/spectra-forms'],
      loaded: false
    });
  }

  /**
   * Load blocks by category
   */
  async loadCategory(categoryName: string): Promise<void> {
    const category = this.categories.get(categoryName);
    if (!category || category.loaded) {
      return;
    }

    try {
      let module;
      switch (categoryName) {
        case 'core':
          module = await import(
            /* webpackChunkName: "blocks-core" */
            '@/blocks/core'
          );
          if (module.registerCoreBlocks) {
            module.registerCoreBlocks();
          }
          break;
        case 'layout':
          module = await import(
            /* webpackChunkName: "blocks-layout" */
            '@/blocks/layout'
          );
          if (module.registerLayoutBlocks) {
            module.registerLayoutBlocks();
          }
          break;
        case 'media':
          module = await import(
            /* webpackChunkName: "blocks-media" */
            '@/blocks/media'
          );
          if (module.registerMediaBlocks) {
            module.registerMediaBlocks();
          }
          break;
        case 'widgets':
          // Widgets blocks will be implemented later
          break;
        case 'dynamic':
          // Register dynamic blocks directly with proper namespace
          this.registerBlock('o4o/cpt-acf-loop', {
            title: 'CPT ACF Loop',
            category: 'dynamic',
            icon: 'layout',
            description: 'Display custom post type loops',
            attributes: {
              postType: {
                type: 'string',
                default: 'post'
              },
              postsPerPage: {
                type: 'number',
                default: 10
              }
            },
            edit: () => null,
            save: () => null
          });
          this.registerBlock('o4o/reusable', {
            title: 'Reusable Block',
            category: 'dynamic',
            icon: 'block-default',
            description: 'Insert a reusable block',
            attributes: {
              ref: {
                type: 'number'
              }
            },
            edit: () => null,
            save: () => null
          });
          this.registerBlock('o4o/spectra-forms', {
            title: 'Spectra Forms',
            category: 'dynamic',
            icon: 'forms',
            description: 'Add a form',
            attributes: {
              formId: {
                type: 'string'
              }
            },
            edit: () => null,
            save: () => null
          });
          category.loaded = true;
          break;
      }

      // Mark category as loaded after registration
      if (categoryName === 'core' || categoryName === 'layout' || categoryName === 'media') {
        category.loaded = true;
      }
      
      if (module && categoryName !== 'core' && categoryName !== 'layout' && categoryName !== 'media') {
        // Register blocks from module for other categories
        Object.entries(module).forEach(([blockName, blockDefinition]) => {
          this.registerBlock(blockName, blockDefinition);
        });
        category.loaded = true;
      }
    } catch (error) {
      // Failed to load block category
    }
  }

  /**
   * Load only essential blocks for initial render
   */
  async loadEssentialBlocks(): Promise<void> {
    await this.loadCategory('core');
  }

  /**
   * Load all high-priority blocks
   */
  async loadHighPriorityBlocks(): Promise<void> {
    const highPriorityCategories = Array.from(this.categories.values())
      .filter(cat => cat.priority === 'high');
    
    await Promise.all(
      highPriorityCategories.map(cat => 
        this.loadCategory(this.getCategoryName(cat))
      )
    );
  }

  /**
   * Progressive loading strategy
   */
  async loadBlocksProgressive(): Promise<void> {
    // Load core blocks immediately
    await this.loadEssentialBlocks();

    // Load medium priority blocks after a delay
    setTimeout(async () => {
      const mediumCategories = Array.from(this.categories.values())
        .filter(cat => cat.priority === 'medium');
      
      for (const cat of mediumCategories) {
        await this.loadCategory(this.getCategoryName(cat));
      }
    }, 2000);

    // Load low priority blocks when idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(async () => {
        const lowCategories = Array.from(this.categories.values())
          .filter(cat => cat.priority === 'low');
        
        for (const cat of lowCategories) {
          await this.loadCategory(this.getCategoryName(cat));
        }
      });
    }
  }

  /**
   * Load specific block on demand
   */
  async loadBlock(blockName: string): Promise<any> {
    if (this.loadedBlocks.has(blockName)) {
      return this.blockRegistry.get(blockName);
    }

    // Find category containing this block
    for (const [categoryName, category] of this.categories) {
      if (category.blocks.includes(blockName)) {
        await this.loadCategory(categoryName);
        return this.blockRegistry.get(blockName);
      }
    }

    // Block not found in any category
    return null;
  }

  /**
   * Register a block
   */
  private registerBlock(name: string, definition: any): void {
    this.blockRegistry.set(name, definition);
    this.loadedBlocks.add(name);
    
    // Register with WordPress if available
    if (window.wp?.blocks?.registerBlockType) {
      window.wp.blocks.registerBlockType(name, definition);
    }
  }

  /**
   * Get category name for a category object
   */
  private getCategoryName(category: BlockCategory): string {
    for (const [name, cat] of this.categories) {
      if (cat === category) {
        return name;
      }
    }
    return '';
  }

  /**
   * Get loading statistics
   */
  getStats() {
    const totalBlocks = Array.from(this.categories.values())
      .reduce((sum, cat) => sum + cat.blocks.length, 0);
    
    return {
      totalBlocks,
      loadedBlocks: this.loadedBlocks.size,
      loadedCategories: Array.from(this.categories.values())
        .filter(cat => cat.loaded).length,
      totalCategories: this.categories.size
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