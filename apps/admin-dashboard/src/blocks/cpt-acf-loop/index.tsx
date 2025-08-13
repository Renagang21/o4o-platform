/**
 * CPT/ACF Loop Block
 * 
 * Custom WordPress block for displaying custom post types with ACF fields
 */

import metadata from './block.json';
import Edit from './edit';
import save from './save';

// Global interface declaration for WordPress
declare global {
  interface Window {
    wp?: any;
  }
}

// Lazy registration to ensure WordPress polyfill is loaded
export const registerCPTACFLoop = () => {
  // Wait for WordPress to be available
  if (!window.wp?.blocks?.registerBlockType) {
    console.warn('[CPT/ACF Loop] WordPress blocks API not available yet');
    return;
  }
  
  const { registerBlockType, getCategories, setCategories } = window.wp.blocks as any;
  const { list: icon } = window.wp?.icons || {};
  
  // Register custom block category if it doesn't exist
  const registerO4OCategory = () => {
    const categories = getCategories();
    
    if (!categories.find((cat: any) => cat.slug === 'o4o-blocks')) {
      setCategories([
        {
          slug: 'o4o-blocks',
          title: 'O4O Blocks',
          icon: 'admin-plugins',
        },
        ...categories,
      ]);
    }
  };
  
  // Register category before block
  registerO4OCategory();
  
  // Register the block with proper typing
  registerBlockType(metadata.name as any, {
    ...metadata,
    icon: icon || 'list-view',
    edit: Edit,
    save,
    supports: {
      ...metadata.supports,
      align: metadata.supports?.align as any
    }
  } as any);
};

// Try to register immediately if WordPress is available
if (window.wp?.blocks?.registerBlockType) {
  registerCPTACFLoop();
} else {
  // Otherwise wait for DOM ready
  document.addEventListener('DOMContentLoaded', registerCPTACFLoop);
}