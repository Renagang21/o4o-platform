/**
 * CPT-ACF Module Entry Point
 * Exports all public APIs and controllers
 */

// Controllers
export { CPTController } from './controllers/cpt.controller';
export { ACFController } from './controllers/acf.controller';

// Services
export { cptService } from './services/cpt.service';
export { acfService } from './services/acf.service';
export { blockDataService } from './services/block-data.service';

// Routes
export { default as blockApiRoutes } from './routes/block-api.routes';

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