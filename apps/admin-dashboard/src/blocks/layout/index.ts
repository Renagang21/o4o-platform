/**
 * Layout Blocks - For page structure and layout
 * Loaded on demand
 */

// Layout blocks are built-in to WordPress
// This module is for future custom layout blocks

export function registerLayoutBlocks() {
  if (!window.wp?.blocks) {
    console.warn('WordPress blocks API not available');
    return;
  }

  // Layout blocks like columns, group, separator, spacer
  // are registered automatically by WordPress
  console.log('Layout blocks loaded');
}

export default registerLayoutBlocks;