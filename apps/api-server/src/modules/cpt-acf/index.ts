/**
 * CPT-ACF Module Entry Point
 * Exports all public APIs and controllers
 */

// Controllers
export { CPTController } from './controllers/cpt.controller.js';
export { ACFController } from './controllers/acf.controller.js';

// Services
/**
 * @deprecated Use unified service from services/cpt/cpt.service.ts instead
 * This export is kept for backward compatibility only
 */
export { cptService } from './services/cpt.service.js';

/**
 * @deprecated Use unified service from services/cpt/cpt.service.ts instead
 * This export is kept for backward compatibility only
 */
export { acfService } from './services/acf.service.js';

// blockDataService removed - legacy CMS service (Phase 8-3)

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