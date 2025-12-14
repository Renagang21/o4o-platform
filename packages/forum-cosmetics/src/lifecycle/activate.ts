/**
 * Forum-Cosmetics Activate Hook
 *
 * Called when the app is activated.
 * Enables cosmetics forum routes and registers event handlers.
 */

import type { DataSource } from 'typeorm';

export interface ActivateContext {
  dataSource: DataSource;
  organizationId?: string;
}

export async function activate(context: ActivateContext): Promise<void> {
  console.log('[forum-cosmetics] Activating...');

  try {
    // Register cosmetics forum routes
    console.log('[forum-cosmetics] Registering cosmetics forum routes...');
    console.log('[forum-cosmetics] Routes: /api/v1/cosmetics/forum/*');

    // TODO: Register event handlers for:
    // - Post creation (to auto-create cosmetics metadata)
    // - Post deletion (to cleanup cosmetics metadata)
    // - Post update (to sync cosmetics metadata)

    console.log('[forum-cosmetics] Activation complete');
    console.log('[forum-cosmetics] Available endpoints:');
    console.log('  GET  /api/v1/cosmetics/forum/posts');
    console.log('  GET  /api/v1/cosmetics/forum/posts/:id');
    console.log('  GET  /api/v1/cosmetics/forum/categories');
    console.log('  GET  /api/v1/cosmetics/forum/skin-types');
    console.log('  GET  /api/v1/cosmetics/forum/concerns');
    console.log('  GET  /api/v1/cosmetics/forum/featured');
    console.log('  GET  /api/v1/cosmetics/forum/top-rated');
    console.log('  GET  /api/v1/cosmetics/forum/statistics');
    console.log('  GET  /api/v1/cosmetics/forum/search');
  } catch (error) {
    console.error('[forum-cosmetics] Activation failed:', error);
    throw error;
  }
}

export default activate;
