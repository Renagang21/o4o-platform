/**
 * Groupbuy-Yaksa Backend
 * Phase 5: Access Hardening
 */

// Entities
export {
  GroupbuyCampaign,
  type CampaignStatus,
  CampaignProduct,
  type CampaignProductStatus,
  GroupbuyOrder,
  type GroupbuyOrderStatus,
  SupplierProfile,
  GroupbuyEntities,
} from './entities/index.js';

// Services
export {
  GroupbuyCampaignService,
  type CreateCampaignDto,
  type UpdateCampaignDto,
  type CampaignCloseResult,
  CampaignProductService,
  type CreateCampaignProductDto,
  type UpdateCampaignProductDto,
  GroupbuyOrderService,
  type CreateGroupbuyOrderDto,
  type OrderQuantitySummary,
} from './services/index.js';

// Routes
export { createGroupbuyRoutes } from './routes/index.js';

// Middleware (Phase 5)
export {
  createGroupbuyAuthMiddleware,
  GroupbuyAuthError,
  type GroupbuyAuthRequest,
  type GroupbuyAuthMiddleware,
  type OrganizationMembership,
  type AuthenticatedUser,
} from './middleware/index.js';
