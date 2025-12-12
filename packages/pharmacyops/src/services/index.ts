/**
 * PharmacyOps Services
 *
 * @package @o4o/pharmacyops
 */

import { PharmacyDashboardService } from './PharmacyDashboardService.js';
import { PharmacyProductService } from './PharmacyProductService.js';
import { PharmacyOfferService } from './PharmacyOfferService.js';
import { PharmacyOrderService } from './PharmacyOrderService.js';
import { PharmacyDispatchService } from './PharmacyDispatchService.js';
import { PharmacySettlementService } from './PharmacySettlementService.js';

// Re-export services
export { PharmacyDashboardService };
export { PharmacyProductService };
export { PharmacyOfferService };
export { PharmacyOrderService };
export { PharmacyDispatchService };
export { PharmacySettlementService };

// Re-export types
export type { ProductSearchParams, ProductSearchResult } from './PharmacyProductService.js';
export type { OfferSearchParams, OfferSearchResult } from './PharmacyOfferService.js';
export type { OrderSearchParams, OrderSearchResult, OrderValidationResult } from './PharmacyOrderService.js';
export type { DispatchSearchParams, DispatchSearchResult } from './PharmacyDispatchService.js';
export type { SettlementSearchParams, SettlementSearchResult } from './PharmacySettlementService.js';

// Service array for module registration
export const pharmacyOpsServices = [
  PharmacyDashboardService,
  PharmacyProductService,
  PharmacyOfferService,
  PharmacyOrderService,
  PharmacyDispatchService,
  PharmacySettlementService,
];
