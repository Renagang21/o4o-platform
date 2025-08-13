/**
 * Custom Blocks Registration
 * Import and register all custom blocks for the WordPress editor
 */

// Global interface declaration for WordPress
declare global {
  interface Window {
    wp?: any;
  }
}

// Custom block types are dynamically loaded via lazy.ts to improve performance

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
  
  /* Block Appender Styles */
  .block-list-appender {
    margin-top: 20px;
  }
  
  .block-editor-button-block-appender {
    width: 100%;
    justify-content: center;
    padding: 12px;
    border: 2px dashed #ddd;
    color: #555;
    transition: all 0.2s ease;
  }
  
  .block-editor-button-block-appender:hover {
    border-color: #007cba;
    color: #007cba;
    background-color: rgba(0, 124, 186, 0.04);
  }
`;

// Initialize custom blocks
export function initializeCustomBlocks() {
  // WordPress polyfill이 초기화되었는지 확인
  const domReady = window.wp?.domReady || ((callback: () => void) => {
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
    
    // console.log('Custom blocks initialized:', [
    //   'o4o/group',
    //   'o4o/columns',
    //   'o4o/column'
    // ]);
  });
}

// Export block names for use in allowed blocks lists
export const CUSTOM_BLOCKS = [
  'o4o/group',
  'o4o/columns'
];