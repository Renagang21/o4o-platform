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

// ============================================
// [event_offer] WO-O4O-EVENT-OFFER-CORE-TRANSITION-V1
// 새 정책에 맞춘 별칭 export. 외부 코드는 점진적으로 EventOffer* 이름으로 이주.
// 실제 DB 테이블/심볼 rename은 WO-3에서 처리.
// ============================================
export {
  GroupbuyCampaign as EventOfferCampaign,
  CampaignProduct as EventOfferProduct,
  GroupbuyOrder as EventOfferOrder,
  GroupbuyEntities as EventOfferEntities,
  type CampaignStatus as EventOfferApprovalStatus,
  normalizeApprovalState,
  type EventOfferTimeStatus,
} from './entities/index.js';

export {
  GroupbuyCampaignService as EventOfferCampaignService,
  CampaignProductService as EventOfferProductService,
  GroupbuyOrderService as EventOfferOrderService,
} from './services/index.js';
