/**
 * Forum-Yaksa Backend Exports
 *
 * Extension package - provides entities and services only, no routes
 */

// Export entities
export * from './entities/index.js';

// Export services
export * from './services/index.js';

/**
 * Entity list for TypeORM
 */
import * as Entities from './entities/index.js';
export const entities = Object.values(Entities);

/**
 * Services registry
 */
import * as Services from './services/index.js';
export const services = Services;
