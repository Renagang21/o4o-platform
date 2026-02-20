/**
 * Glycopharm Entities Index
 *
 * Phase B-1: Glycopharm API Implementation
 */

// GlycopharmPharmacy class removed (WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1 Phase C)
// GlycopharmPharmacyStatus moved to dto/index.ts (canonical source)
// TemplateProfile, StoreBlockType, StoreBlock preserved — consumers use import type directly
export type { TemplateProfile, StoreBlockType, StoreBlock } from './glycopharm-pharmacy.entity.js';
export { GlycopharmProduct, type GlycopharmProductStatus, type GlycopharmProductCategory } from './glycopharm-product.entity.js';
export { GlycopharmProductLog, type GlycopharmProductLogAction } from './glycopharm-product-log.entity.js';
export {
  GlycopharmApplication,
  type GlycopharmApplicationStatus,
  type GlycopharmServiceType,
  type GlycopharmOrganizationType,
} from './glycopharm-application.entity.js';
export { GlycopharmFeaturedProduct } from './glycopharm-featured-product.entity.js';

// Smart Display
export { DisplayPlaylist, type PlaylistStatus } from './display-playlist.entity.js';
export { DisplayMedia, type MediaSourceType } from './display-media.entity.js';
export { DisplayPlaylistItem, type TransitionType } from './display-playlist-item.entity.js';
export { DisplaySchedule } from './display-schedule.entity.js';

// Forum Category Request (GlycoPharm legacy - renamed to avoid collision with forum-core)
export { GlycopharmForumCategoryRequest, type GlycopharmCategoryRequestStatus } from './forum-category-request.entity.js';

// Customer Request (Phase 1: Common Request Implementation)
export {
  GlycopharmCustomerRequest,
  type CustomerRequestPurpose,
  type CustomerRequestSourceType,
  type CustomerRequestStatus,
} from './customer-request.entity.js';

// Event (Phase 2-A: Event → Request Connection)
export {
  GlycopharmEvent,
  type GlycopharmEventType,
  type GlycopharmEventSourceType,
  type GlycopharmEventPurpose,
} from './glycopharm-event.entity.js';

// Request Action Log (Phase 2-C: Post-Action)
export {
  GlycopharmRequestActionLog,
  type RequestActionType,
  type RequestActionStatus,
} from './request-action-log.entity.js';

// Billing Invoice (Phase 3-D: Invoice Finalization, Phase 3-E: Dispatch)
export {
  GlycopharmBillingInvoice,
  type InvoiceStatus,
  type BillingUnit,
  type InvoiceLineSnapshot,
  type DispatchStatus,
  type DispatchLogEntry,
} from './billing-invoice.entity.js';

// Orders - REMOVED (Phase 4-A: Legacy Order System Deprecation)
// GlycopharmOrder, GlycopharmOrderItem entities removed
// New orders will use E-commerce Core with OrderType.GLYCOPHARM

// Tablet Service Request (WO-STORE-TABLET-REQUEST-CHANNEL-V1)
export {
  TabletServiceRequest,
  type TabletServiceRequestStatus,
  type TabletRequestItem,
} from './tablet-service-request.entity.js';

// Store Blog Post (WO-STORE-BLOG-CHANNEL-V1)
export {
  StoreBlogPost,
  type StoreBlogPostStatus,
} from './store-blog-post.entity.js';

// WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1 Phase B-1a
export { GlycopharmPharmacyExtension } from './glycopharm-pharmacy-extension.entity.js';
