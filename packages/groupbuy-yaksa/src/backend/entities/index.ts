/**
 * Groupbuy-Yaksa Entities
 * Phase 1: Entity & Domain Model
 */

import { GroupbuyCampaign } from './GroupbuyCampaign.js';
import { CampaignProduct } from './CampaignProduct.js';
import { GroupbuyOrder } from './GroupbuyOrder.js';
import { SupplierProfile } from './SupplierProfile.js';

export {
  GroupbuyCampaign,
  type CampaignStatus,
} from './GroupbuyCampaign.js';

export {
  CampaignProduct,
  type CampaignProductStatus,
} from './CampaignProduct.js';

export {
  GroupbuyOrder,
  type GroupbuyOrderStatus,
} from './GroupbuyOrder.js';

export { SupplierProfile } from './SupplierProfile.js';

/**
 * All entities for TypeORM registration
 */
export const GroupbuyEntities = [
  GroupbuyCampaign,
  CampaignProduct,
  GroupbuyOrder,
  SupplierProfile,
];
