/**
 * CPT/ACF Loop Block
 * 
 * Custom WordPress block for displaying custom post types with ACF fields
 */

import { registerBlockType } from '@wordpress/blocks';
import { list as icon } from '@wordpress/icons';

import metadata from './block.json';
import Edit from './edit';
import save from './save';

// Declare wp global
declare global {
  interface Window {
    wp: any;
  }
}

// Register custom block category if it doesn't exist
const registerO4OCategory = () => {
  const { getCategories, setCategories } = window.wp.blocks as any;
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
  icon,
  edit: Edit,
  save,
  supports: {
    ...metadata.supports,
    align: metadata.supports?.align as any
  }
} as any);