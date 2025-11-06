/**
 * CPT Registry Initialization
 * Phase 5: Auto-load all CPT schemas on server bootstrap
 */

import { registry } from '@o4o/cpt-registry';
import logger from '../utils/logger.js';

// Import all schema definitions
import { dsProductSchema } from '../schemas/ds_product.schema.js';
// Add more schemas here as you create them:
// import { eventSchema } from '../schemas/event.schema.js';
// import { portfolioSchema } from '../schemas/portfolio.schema.js';

/**
 * Initialize CPT Registry
 * Call this in main.ts bootstrap before starting the server
 */
export async function initializeCPT(): Promise<void> {
  logger.info('[CPT Registry] Initializing...');

  try {
    // Register all CPT schemas
    const schemas = [
      dsProductSchema,
      // Add more schemas here
    ];

    for (const schema of schemas) {
      try {
        registry.register(schema);
        logger.info(`[CPT Registry] ✓ Registered: ${schema.name}`);
      } catch (error) {
        logger.error(`[CPT Registry] ✗ Failed to register "${schema.name}":`, error);
        // Continue registering other schemas even if one fails
      }
    }

    logger.info(`[CPT Registry] Initialization complete. ${registry.count()} CPTs registered.`);
    logger.info(`[CPT Registry] Available CPTs: ${registry.listNames().join(', ')}`);
  } catch (error) {
    logger.error('[CPT Registry] Initialization failed:', error);
    throw error; // Fail fast if registry setup fails
  }
}

/**
 * Get all registered CPT names
 * Useful for debugging and API endpoints
 */
export function getRegisteredCPTs(): string[] {
  return registry.listNames();
}
