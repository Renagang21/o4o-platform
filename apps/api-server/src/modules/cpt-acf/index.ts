/**
 * CPT-ACF Module Entry Point
 * Exports all public APIs and controllers
 */

// Controllers
export { CPTController } from './controllers/cpt.controller.js';
export { ACFController } from './controllers/acf.controller.js';

// Services
export { cptService } from './services/cpt.service.js';
export { acfService } from './services/acf.service.js';
export { blockDataService } from './services/block-data.service.js';

// Routes
export { default as blockApiRoutes } from './routes/block-api.routes.js';

// Module info
export const MODULE_INFO = {
  name: 'CPT-ACF Module',
  version: '1.0.0',
  description: 'Custom Post Types and Advanced Custom Fields module with block editor support',
  author: 'O4O Platform Team',
  features: [
    'Custom Post Types management',
    'Advanced Custom Fields management',
    'Block Editor data API',
    'Optimized caching',
    'Clean architecture'
  ]
};