/**
 * CPT Registry Initialization
 * Phase 5: Auto-load all CPT schemas on server bootstrap
 */

import { registry } from '@o4o/cpt-registry';
import logger from '../utils/logger.js';

// Import all schema definitions
import { productsSchema } from '../schemas/products.schema.js';
import { portfolioSchema } from '../schemas/portfolio.schema.js';
import { testimonialsSchema } from '../schemas/testimonials.schema.js';
import { teamSchema } from '../schemas/team.schema.js';

/**
 * Initialize CPT Registry
 * Call this in main.ts bootstrap before starting the server
 */
export async function initializeCPT(): Promise<void> {
  logger.info('[CPT Registry] Initializing...');

  try {
    // Register all CPT schemas
    // WO-O4O-POST-LEGACY-RESIDUE-AND-ENVIRONMENT-CLEANUP-V1:
    //   ds_product / ds_supplier / ds_partner / ds_commission_policy 4개 Dropshipping CPT 제거.
    //   운영 DB 에 custom_posts 테이블 자체가 없고 custom_post_types 는 0 row 이므로 데이터 영향 없음.
    const schemas = [
      productsSchema,
      portfolioSchema,
      testimonialsSchema,
      teamSchema,
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
