/**
 * Forum-Neture Backend Exports
 *
 * Extension package - provides services only, no entities or routes
 */

// Export services
export * from './services/index.js';

/**
 * Services registry
 */
import * as Services from './services/index.js';
export const services = Services;

/**
 * Entity list for TypeORM (empty for this extension)
 */
export const entities: any[] = [];
