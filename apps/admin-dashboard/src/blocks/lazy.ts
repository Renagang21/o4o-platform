/**
 * Lazy Loading for Block Components
 * Improves initial load performance by loading blocks on demand
 */

// Lazy loading for block components

// Map of block names to their import functions
const blockImportMap = {
  'o4o/group': () => import('./group'),
  'o4o/columns': () => import('./columns')
};

// Track loaded blocks
const loadedBlocks = new Set<string>();

/**
 * Load a block on demand
 */
export async function loadBlock(blockName: string): Promise<void> {
  if (loadedBlocks.has(blockName)) {
    return;
  }

  const importFn = blockImportMap[blockName as keyof typeof blockImportMap];
  if (!importFn) {
    // Removed console.warn
    return;
  }

  try {
    await importFn();
    loadedBlocks.add(blockName);
  } catch (error) {
    // Error logging - use proper error handler
  }
}

/**
 * Load blocks based on content
 */
export async function loadBlocksForContent(content: string): Promise<void> {
  const blockPattern = /<!-- wp:(\S+)/g;
  const usedBlocks = new Set<string>();
  
  let match;
  while ((match = blockPattern.exec(content)) !== null) {
    usedBlocks.add(match[1]);
  }

  // Load all required blocks in parallel
  const loadPromises = Array.from(usedBlocks).map(blockName => 
    loadBlock(blockName)
  );
  
  await Promise.all(loadPromises);
}

/**
 * Preload commonly used blocks
 */
export async function preloadCommonBlocks(): Promise<void> {
  const commonBlocks = ['o4o/group', 'o4o/columns'];
  await Promise.all(commonBlocks.map(loadBlock));
}

/**
 * Initialize lazy loading system
 */
export function initializeLazyBlocks() {
  // Monitor block insertion to load blocks on demand
  if (typeof window !== 'undefined' && (window as any).wp?.data) {
    const { subscribe } = (window as any).wp.data;
    if (!subscribe) return;
    
    let previousBlockTypes = new Set<string>();
    
    subscribe(() => {
      const select = (window as any).wp?.data?.select;
      if (!select) return;
      
      const getBlocks = select('core/block-editor')?.getBlocks;
      if (!getBlocks) return;
      
      const blocks = getBlocks();
      
      if (!blocks) return;
      
      // Find all block types in use
      const currentBlockTypes = new Set<string>();
      const findBlockTypes = (blocks: any[]) => {
        blocks.forEach(block => {
          currentBlockTypes.add(block.name);
          if (block.innerBlocks?.length > 0) {
            findBlockTypes(block.innerBlocks);
          }
        });
      };
      
      findBlockTypes(blocks);
      
      // Load any new block types
      currentBlockTypes.forEach(blockType => {
        if (!previousBlockTypes.has(blockType) && blockImportMap[blockType as keyof typeof blockImportMap]) {
          loadBlock(blockType);
        }
      });
      
      previousBlockTypes = currentBlockTypes;
    });
  }
}