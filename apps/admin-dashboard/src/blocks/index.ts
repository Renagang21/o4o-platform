/**
 * Custom Blocks Registration
 * Import and register all custom blocks for the WordPress editor
 */

import { blockRegistry } from './registry/BlockRegistry';

// Core text blocks
import paragraphBlockDefinition from './definitions/paragraph';
import headingBlockDefinition from './definitions/heading';
import quoteBlockDefinition from './definitions/quote';
import codeBlockDefinition from './definitions/code';
import markdownBlockDefinition from './definitions/markdown';
import listBlockDefinition from './definitions/list';
import tableBlockDefinition from './definitions/table';

// Media blocks
import imageBlockDefinition from './definitions/image';
import coverBlockDefinition from './definitions/cover';
import galleryBlockDefinition from './definitions/gallery';
import slideBlockDefinition from './definitions/slide';
import videoBlockDefinition from './definitions/video';

// Design blocks
import buttonBlockDefinition from './definitions/button';

// Layout blocks
import columnsBlockDefinition from './definitions/columns';
import columnBlockDefinition from './definitions/column';
import groupBlockDefinition from './definitions/group';
import conditionalBlockDefinition from './definitions/conditional';

// Widget blocks
import socialBlockDefinition from './definitions/social';
import shortcodeBlockDefinition from './definitions/shortcode';
import placeholderBlockDefinition from './definitions/placeholder';

// Embed blocks
import youtubeBlockDefinition from './definitions/youtube';
import fileBlockDefinition from './definitions/file';

// Form blocks
import universalFormBlockDefinition from './definitions/universal-form';
import formFieldBlockDefinition from './definitions/form-field';
import formSubmitBlockDefinition from './definitions/form-submit';

// Type declaration is in wordpress-runtime-setup.ts

// Custom block types are dynamically loaded via lazy.ts to improve performance

/**
 * Register all blocks with the new registry system
 */
export function registerAllBlocks(): void {
  // Register core text blocks
  blockRegistry.register(paragraphBlockDefinition);
  blockRegistry.register(headingBlockDefinition);
  blockRegistry.register(quoteBlockDefinition);
  blockRegistry.register(codeBlockDefinition);
  blockRegistry.register(markdownBlockDefinition);
  blockRegistry.register(listBlockDefinition);
  blockRegistry.register(tableBlockDefinition);

  // Register media blocks
  blockRegistry.register(imageBlockDefinition);
  blockRegistry.register(coverBlockDefinition);
  blockRegistry.register(galleryBlockDefinition);
  blockRegistry.register(slideBlockDefinition);
  blockRegistry.register(videoBlockDefinition);

  // Register design blocks
  blockRegistry.register(buttonBlockDefinition);

  // Register layout blocks
  blockRegistry.register(columnsBlockDefinition);
  blockRegistry.register(columnBlockDefinition);
  blockRegistry.register(groupBlockDefinition);
  blockRegistry.register(conditionalBlockDefinition);

  // Register widget blocks
  blockRegistry.register(socialBlockDefinition);
  blockRegistry.register(shortcodeBlockDefinition);
  blockRegistry.register(placeholderBlockDefinition); // Phase 1-C: Placeholder for missing components

  // Register embed blocks
  blockRegistry.register(youtubeBlockDefinition);
  blockRegistry.register(fileBlockDefinition);

  // Register form blocks
  blockRegistry.register(universalFormBlockDefinition); // ⭐ Unified form block (replaces post-form and cpt-form)
  blockRegistry.register(formFieldBlockDefinition);
  blockRegistry.register(formSubmitBlockDefinition);
}

// Export registry for external use
export { blockRegistry } from './registry/BlockRegistry';
export * from './registry/types';

// Additional block styles
const blockStyles = `
  /* Group Block Styles */
  .o4o-group-block {
    box-sizing: border-box;
  }
  
  .o4o-group-block.flex {
    display: flex;
  }
  
  .o4o-group-block.grid {
    display: grid;
  }
  
  /* Columns Block Styles */
  .o4o-columns-block {
    display: flex;
    width: 100%;
    box-sizing: border-box;
  }
  
  .o4o-column-block {
    box-sizing: border-box;
    flex-grow: 0;
    flex-shrink: 0;
  }
  
  @media (max-width: 768px) {
    .o4o-columns-block.stack-on-mobile {
      flex-direction: column !important;
    }
    
    .o4o-columns-block.stack-on-mobile .o4o-column-block {
      flex-basis: 100% !important;
      margin-bottom: 20px;
    }
  }
  
  /* InnerBlocks Styles */
  .block-editor-inner-blocks {
    height: 100%;
  }

  .block-editor-inner-blocks .block-editor-block-list__layout {
    height: 100%;
  }

  /* Form Block Styles */
  .o4o-post-form-block,
  .o4o-cpt-form-block {
    position: relative;
  }

  .o4o-form-field-block {
    margin-bottom: 1rem;
  }

  .o4o-form-submit-block {
    margin-top: 1.5rem;
  }
`;

// Initialize custom blocks
export function initializeCustomBlocks() {
  // WordPress polyfill이 초기화되었는지 확인
  const domReady = (window.wp?.domReady as ((callback: () => void) => void) | undefined) || ((callback: () => void) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  });
  
  domReady(() => {
    // Add custom styles to the editor
    const styleElement = document.createElement('style');
    styleElement.textContent = blockStyles;
    document.head.appendChild(styleElement);
    
    //   'o4o/group',
    //   'o4o/columns',
    //   'o4o/column'
    // ]);
  });
}

// Export block names for use in allowed blocks lists
export const CUSTOM_BLOCKS = [
  'o4o/group',
  'o4o/columns',
  'o4o/conditional'
];