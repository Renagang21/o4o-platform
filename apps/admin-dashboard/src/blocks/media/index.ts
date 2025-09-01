/**
 * Media Blocks - For multimedia content
 * Lazy loaded when needed
 */

// Media blocks are built-in to WordPress
// This module is for future custom media blocks

export function registerMediaBlocks() {
  if (!window.wp?.blocks) {
    // Warning log removed
    return;
  }

  // Media blocks like gallery, video, audio, file
  // are registered automatically by WordPress
}

export default registerMediaBlocks;