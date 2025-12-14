/**
 * PharmacyOps Controllers
 *
 * @package @o4o/pharmacyops
 */

import { PharmacyDashboardController } from './PharmacyDashboardController.js';
import { PharmacyProductController } from './PharmacyProductController.js';
import { PharmacyOfferController } from './PharmacyOfferController.js';
import { PharmacyOrderController } from './PharmacyOrderController.js';
import { PharmacyDispatchController } from './PharmacyDispatchController.js';
import { PharmacySettlementController } from './PharmacySettlementController.js';

// Re-export controllers
export { PharmacyDashboardController };
export { PharmacyProductController };
export { PharmacyOfferController };
export { PharmacyOrderController };
export { PharmacyDispatchController };
export { PharmacySettlementController };

// Controller array for module registration
export const pharmacyOpsControllers = [
  PharmacyDashboardController,
  PharmacyProductController,
  PharmacyOfferController,
  PharmacyOrderController,
  PharmacyDispatchController,
  PharmacySettlementController,
];
