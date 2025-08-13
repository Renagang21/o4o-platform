/**
 * Core Blocks - Essential blocks for basic editing
 * These are loaded immediately
 */

// Core blocks are built-in to WordPress
// This module is for future custom core blocks

export function registerCoreBlocks() {
  if (!window.wp?.blocks) {
    console.warn('WordPress blocks API not available');
    return;
  }

  // Core blocks like paragraph, heading, list, image, quote
  // are registered automatically by WordPress
}

export default registerCoreBlocks;