/**
 * Register all custom Gutenberg blocks
 */

// Setup WordPress API for our backend
import '@/lib/wordpress-api-setup';

// Import all blocks
import './cpt-acf-loop';

// Export block names for reference
export const BLOCK_NAMES = {
  CPT_ACF_LOOP: 'o4o/cpt-acf-loop',
} as const;