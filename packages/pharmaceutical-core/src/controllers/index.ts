/**
 * Pharmaceutical Core Controllers
 *
 * NestJS Controllers for API endpoints
 *
 * @package @o4o/pharmaceutical-core
 */

export { ProductsController } from './products.controller.js';
export { OffersController } from './offers.controller.js';
export { OrdersController } from './orders.controller.js';
export { DispatchController } from './dispatch.controller.js';
export { SettlementController } from './settlement.controller.js';

// Controller list for NestJS module registration
export const pharmaControllers = [
  'ProductsController',
  'OffersController',
  'OrdersController',
  'DispatchController',
  'SettlementController',
];
