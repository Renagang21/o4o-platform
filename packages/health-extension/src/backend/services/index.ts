/**
 * Health Extension Services
 *
 * @package @o4o/health-extension
 */

// Import first
import { HealthProductService } from './HealthProductService.js';
import { HealthOfferService } from './HealthOfferService.js';
import { HealthOrderService } from './HealthOrderService.js';
import { HealthSettlementService } from './HealthSettlementService.js';

// Then export
export { HealthProductService };
export { HealthOfferService };
export { HealthOrderService };
export { HealthSettlementService };

// Export types
export type {
  HealthProductDetail,
  HealthProductListItem,
} from './HealthProductService.js';

export type {
  HealthOfferDetail,
  CreateHealthOfferDto,
} from './HealthOfferService.js';

export type {
  HealthOrderDetail,
  CreateHealthOrderDto,
} from './HealthOrderService.js';

export type {
  HealthSettlementDetail,
  HealthSettlementSummary,
} from './HealthSettlementService.js';
