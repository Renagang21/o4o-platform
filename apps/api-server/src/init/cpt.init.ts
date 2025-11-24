/**
 * CPT Registry Initialization
 * Phase 5: Auto-load all CPT schemas on server bootstrap
 */

import { registry } from '@o4o/cpt-registry';
import logger from '../utils/logger.js';

// Import all schema definitions
import { dsProductSchema } from '../schemas/ds_product.schema.js';
import { productsSchema } from '../schemas/products.schema.js';
import { portfolioSchema } from '../schemas/portfolio.schema.js';
import { testimonialsSchema } from '../schemas/testimonials.schema.js';
import { teamSchema } from '../schemas/team.schema.js';
import { dsSupplierSchema } from '../schemas/ds_supplier.schema.js';
import { dsPartnerSchema } from '../schemas/ds_partner.schema.js';
import { dsCommissionPolicySchema } from '../schemas/ds_commission_policy.schema.js';

/**
 * Initialize CPT Registry
 * Call this in main.ts bootstrap before starting the server
 */
export async function initializeCPT(): Promise<void> {
  logger.info('[CPT Registry] Initializing...');

  try {
    // Register all CPT schemas (Phase P0-A: 8/8 CPTs registered)
    const schemas = [
      dsProductSchema,
      productsSchema,
      portfolioSchema,
      testimonialsSchema,
      teamSchema,
      dsSupplierSchema,
      dsPartnerSchema,
      dsCommissionPolicySchema,
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
