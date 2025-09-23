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
      blocks: ['gallery', 'audio', 'video', 'file', 'media-text'],
      loaded: false
    });

    // Widget blocks - lazy loaded
    this.categories.set('widgets', {
      name: 'Widget Blocks',
      priority: 'low',
      blocks: ['shortcode', 'archives', 'calendar', 'categories', 'latest-comments', 'latest-posts'],
      loaded: false
    });

    // Embed blocks - lazy loaded (including markdown reader)
    this.categories.set('embeds', {
      name: 'Embed Blocks',
      priority: 'low',
      blocks: ['embed', 'youtube', 'twitter', 'facebook', 'instagram', 'markdown-reader'],
      loaded: false
    });

    // Dynamic blocks - lazy loaded (without markdown-reader)
    this.categories.set('dynamic', {
      name: 'Dynamic Blocks',
      priority: 'low',
      blocks: ['cpt-acf-loop', 'reusable', 'spectra-forms'],
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
          break;
        case 'layout':
          module = await import(
            /* webpackChunkName: "blocks-layout" */
            '@/blocks/layout'
          );
          break;
        case 'media':
          module = await import(
            /* webpackChunkName: "blocks-media" */
            '@/blocks/media'
          );
          break;
        case 'widgets':
          // Widgets blocks will be implemented later
          break;
        case 'embeds':
          // Register markdown-reader block directly
          this.registerBlock('markdown-reader', {
            name: 'markdown-reader',
            title: 'Markdown Reader',
            category: 'embed',
            icon: 'media-document',
            description: 'Display markdown files',
            supports: {
              align: ['wide', 'full'],
              html: false
            }
          });
          break;
        case 'dynamic':
          // Register dynamic blocks directly
          this.registerBlock('cpt-acf-loop', {
            name: 'cpt-acf-loop',
            title: 'CPT ACF Loop',
            category: 'dynamic',
            icon: 'layout',
            description: 'Display custom post type loops'
          });
          this.registerBlock('reusable', {
            name: 'reusable',
            title: 'Reusable Block',
            category: 'dynamic',
            icon: 'block-default',
            description: 'Insert a reusable block'
          });
          this.registerBlock('spectra-forms', {
            name: 'spectra-forms',
            title: 'Spectra Forms',
            category: 'dynamic',
            icon: 'forms',
            description: 'Add a form'
          });
          break;
      }

      if (module) {
        // Register blocks from module
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