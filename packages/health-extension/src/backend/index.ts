/**
 * Health Extension Backend
 *
 * @package @o4o/health-extension
 */

// Routes
export { createRoutes } from './routes.js';

// Services
export {
  HealthProductService,
  HealthOfferService,
  HealthOrderService,
  HealthSettlementService,
} from './services/index.js';

// Controllers
export {
  HealthProductController,
  HealthOfferController,
  HealthOrderController,
  HealthSettlementController,
} from './controllers/index.js';

// Hooks
export {
  healthValidationHooks,
  beforeOfferCreate,
  afterOfferCreate,
  beforeListingCreate,
  afterListingCreate,
  beforeOrderCreate,
  afterOrderCreate,
} from './hooks/index.js';

// Events
export {
  HealthEventHandler,
  getHealthEventHandler,
  HEALTH_EVENTS,
} from './events/index.js';

// DTOs
export type * from './dto/index.js';

// Types
export type {
  HookContext,
  HookResult,
} from './hooks/index.js';

export type {
  HealthOfferCreatedEvent,
  HealthOrderCreatedEvent,
  HealthSettlementCreatedEvent,
  ExpirationWarningEvent,
} from './events/index.js';

export type {
  HealthProductDetail,
  HealthProductListItem,
  HealthOfferDetail,
  CreateHealthOfferDto,
  HealthOrderDetail,
  CreateHealthOrderDto,
  HealthSettlementDetail,
  HealthSettlementSummary,
} from './services/index.js';
