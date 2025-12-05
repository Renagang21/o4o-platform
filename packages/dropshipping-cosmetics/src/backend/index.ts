/**
 * Cosmetics Extension Backend
 *
 * Main export for backend functionality
 */

export * from './entities/index.js';
export * from './services/cosmetics-filter.service.js';
export * from './services/influencer-routine.service.js';
export * from './controllers/cosmetics-filter.controller.js';
export * from './controllers/influencer-routine.controller.js';
export * from './controllers/signage.controller.js';
export * from './middleware/permissions.middleware.js';
export * from './hooks/product-filter.hook.js';
export { createCosmeticsModule, CosmeticsEntities } from './module.js';
export { default as CosmeticsModule } from './module.js';
