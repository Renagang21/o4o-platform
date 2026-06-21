// ============================================================================
// TypeORM Entity Registry (WO-O4O-API-SERVER-CONNECTION-ENTITY-REGISTRY-SPLIT-V1)
//
// connection.ts 에서 분리된 entity import + registry 배열.
// connection.ts 는 DB 연결 설정만 담당하고, entity 등록은 이 파일이 단일 출처(SSOT)다.
//
// 규칙:
// - 이 파일은 entity import 와 `entities` 배열 조립만 담당한다.
// - 조건부 등록 / 환경별 분기 / DataSource 참조 / 서비스 로직 import 금지.
// - 신규 entity 추가는 connection.ts 가 아니라 이 파일에서 한다.
// - 등록 순서는 TypeORM metadata 안정성을 위해 기존 순서를 보존한다.
// ============================================================================

// AUTH Module entities
// IMPORTANT: Use entities/User.js re-export to ensure class identity matches
// other files that import from entities/User.js (e.g., authentication.service.ts)
// This prevents "No metadata for User was found" TypeORM errors.
import { User } from '../entities/User.js';
import { Role } from '../modules/auth/entities/Role.js';
import { Permission } from '../modules/auth/entities/Permission.js';
import { RefreshToken } from '../modules/auth/entities/RefreshToken.js';
import { LoginAttempt } from '../modules/auth/entities/LoginAttempt.js';
import { LinkingSession } from '../modules/auth/entities/LinkingSession.js';
import { PasswordResetToken } from '../entities/PasswordResetToken.js';
import { EmailVerificationToken } from '../entities/EmailVerificationToken.js';
import { ApprovalLog } from '../entities/ApprovalLog.js';
import { ProductApproval } from '../entities/ProductApproval.js';
import { LinkedAccount } from '../entities/LinkedAccount.js';
import { AccountActivity } from '../entities/AccountActivity.js';
import { UserActivityLog } from '../entities/UserActivityLog.js';
import { Notification } from '../entities/Notification.js';
// Media/MediaFile/MediaFolder removed - legacy CMS entities
import { Category } from '../entities/Category.js';
import { Settings } from '../entities/Settings.js';
import { Theme, ThemeInstallation } from '../entities/Theme.js';
// Post/PostMeta/Page/PostAutosave removed - legacy WP-like CMS entities
import { Tag } from '../entities/Tag.js';
import { ReusableBlock } from '../entities/ReusableBlock.js';
import { BlockPattern } from '../entities/BlockPattern.js';
import { TemplatePart } from '../entities/TemplatePart.js';
// Shipment/ShipmentTrackingHistory removed - legacy commerce entities
import { SmtpSettings, EmailLog } from '@o4o/mail-core';
import { OperatorNotificationSettings } from '../entities/OperatorNotificationSettings.js';
import { FieldGroup, CustomField, CustomFieldValue } from '../entities/CustomField.js';
import { CustomPost } from '../entities/CustomPost.js';
import { CustomPostType } from '../entities/CustomPostType.js';
// Taxonomy System entities
import { Taxonomy, Term, TermRelationship } from '../entities/Taxonomy.js';
// Menu System entities - removed (legacy CMS)
// AI Settings entity (unified - AISetting removed)
import { AiSettings } from '../entities/AiSettings.js';
import { AIUsageLog } from '../entities/AIUsageLog.js';
// AI Policy entities (WO-O4O-AI-COST-LIMIT-QUOTA-V1 + WO-O4O-AI-BILLING-DATA-SYSTEM-V1)
import { AiLlmPolicy } from '../modules/ai-policy/entities/ai-llm-policy.entity.js';
import { AiUsageQuota } from '../modules/ai-policy/entities/ai-usage-quota.entity.js';
import { AiUsageAggregate } from '../modules/ai-policy/entities/ai-usage-aggregate.entity.js';
import { AiBillingSummary } from '../modules/ai-policy/entities/ai-billing-summary.entity.js';
// App System entities
import { App } from '../entities/App.js';
import { AppInstance } from '../entities/AppInstance.js';
import { AppUsageLog } from '../entities/AppUsageLog.js';
import { AppRegistry } from '../entities/AppRegistry.js';
// Cart/Order/Settlement entities removed - legacy commerce entities
// Dropshipping entities - Now imported from @o4o/dropshipping-core package
// import { Product } from '../entities/Product.js';
// import { Supplier } from '../entities/Supplier.js';
// import { Seller } from '../entities/Seller.js';
// import { Partner } from '../entities/Partner.js';
// import { SellerProduct } from '../entities/SellerProduct.js';
// import { PartnerCommission } from '../entities/PartnerCommission.js';
// import { BusinessInfo } from '../entities/BusinessInfo.js';
// import { CommissionPolicy } from '../entities/CommissionPolicy.js';
// import { Commission } from '../entities/Commission.js';
// import { ConversionEvent } from '../entities/ConversionEvent.js';
// import { ReferralClick } from '../entities/ReferralClick.js';
// import { SellerAuthorization } from '../entities/SellerAuthorization.js';
// Form entities
import { Form } from '../entities/Form.js';
import { FormSubmission } from '../entities/FormSubmission.js';
// Customizer entities
import { CustomizerPreset } from '../entities/CustomizerPreset.js';
import { WidgetArea } from '../entities/WidgetArea.js';
// CPT-ACF Preset entities
import { FormPreset } from '../entities/FormPreset.js';
import { ViewPreset } from '../entities/ViewPreset.js';
import { TemplatePreset } from '../entities/TemplatePreset.js';
// P0 Zero-Data Role Management entities
import { RoleAssignment } from '../modules/auth/entities/RoleAssignment.js';
// WO-O4O-SERVICE-MEMBERSHIP-ARCHITECTURE-V1: Global User + Service Membership
import { ServiceMembership } from '../modules/auth/entities/ServiceMembership.js';
// WO-O4O-IDENTITY-V2-PHASE1-SCHEMA-RESET-V1: Identity V2 L2 Credential Layer
import { ServiceCredential } from '../modules/auth/entities/ServiceCredential.js';
import { RoleApplication } from '../entities/RoleApplication.js';
import { KycDocument } from '../entities/KycDocument.js';
// SupplierProfile/SellerProfile/PartnerProfile removed - now in dropshipping-core

// ============================================================================
// FORUM-CORE ENTITIES (Phase 4: Entities-only Re-introduction)
// Use /entities subpath to avoid side-effect loading
// ============================================================================
import {
  ForumPost,
  // ForumCategory removed — WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1
  ForumComment,
  ForumCategoryRequest,
  ForumCategoryMember,
  ForumPostLike,
} from '@o4o/forum-core/entities';

// Forum Notification entity (Phase 13)
import { ForumNotification } from '../entities/ForumNotification.js';
// Digital Signage legacy entities removed (WO-O4O-SIGNAGE-CONTENT-CENTERED-REFACTOR-V1 Phase 5)
// SignageDevice, SignageSlide replaced by digital-signage-core entities
// Deployment entities
import { DeploymentInstance } from '../modules/deployment/deployment.entity.js';
// Site entities
import { Site } from '../modules/sites/site.entity.js';

// ✅ CMS Module V2 entities (Phase C-2)
// Note: CMSCustomPostType removed - now unified with CustomPostType using cms_cpt_types table
import { CustomField as CMSCustomField } from '../modules/cms/entities/CustomField.js';
import { View as CMSView } from '../modules/cms/entities/View.js';
import { Page as CMSPage } from '../modules/cms/entities/Page.js';

// ============================================================================
// COSMETICS ENTITIES (Phase 7-A-1)
// ============================================================================
import {
  CosmeticsBrand,
  CosmeticsLine,
  CosmeticsProduct,
  CosmeticsPricePolicy,
  CosmeticsProductLog,
  CosmeticsPriceLog,
  CosmeticsStore,
  CosmeticsStoreApplication,
  CosmeticsStoreMember,
  CosmeticsStoreListing,
  CosmeticsStorePlaylist,
  CosmeticsStorePlaylistItem,
  CosmeticsMember, // WO-O4O-KCOS-COSMETICS-MEMBER-PROFILE-FOUNDATION-V1
} from '../routes/cosmetics/entities/index.js';

// ============================================================================
// YAKSA ENTITIES (Phase A-1)
// ============================================================================
import {
  YaksaCategory,
  YaksaPost,
  YaksaPostLog,
} from '../routes/yaksa/entities/index.js';

// ============================================================================
// GLYCOPHARM ENTITIES (Phase B-1)
// ============================================================================
import {
  // GlycopharmPharmacy - REMOVED (WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1 Phase C)
  GlycopharmProduct,
  GlycopharmProductLog,
  GlycopharmApplication,
  GlycopharmFeaturedProduct,
  GlycopharmCustomerRequest,
  GlycopharmEvent,
  GlycopharmRequestActionLog,
  GlycopharmBillingInvoice, // Phase 3-D: Invoice Finalization
  // GlycopharmForumCategoryRequest — REMOVED (WO-O4O-FORUM-CATEGORY-DEAD-CODE-REMOVAL-V1)
  // GlycopharmOrder, GlycopharmOrderItem - REMOVED (Phase 4-A: Legacy Order System Deprecation)
  // TabletServiceRequest — REMOVED (WO-O4O-STORE-TABLET-LEGACY-CLEANUP-V1)
  StoreBlogPost, // WO-STORE-BLOG-CHANNEL-V1
  StoreBlogSettings, // WO-O4O-KPA-STORE-BLOG-META-V1
  GlycopharmPharmacyExtension, // WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1
  GlycopharmMember, // WO-GLYCOPHARM-MEMBER-TABLE-CREATION-V1
  GlycopharmContent, // WO-O4O-GLYCOPHARM-RESOURCES-BACKEND-V1
} from '../routes/glycopharm/entities/index.js';

// ============================================================================
// GLUCOSEVIEW ENTITIES (Phase C-1, C-2, C-3)
// ============================================================================

// STORE AI ENTITIES (WO-O4O-STORE-HUB-AI-SUMMARY-V1)
import { StoreAiSnapshot } from '../modules/store-ai/entities/store-ai-snapshot.entity.js';
import { StoreAiInsight } from '../modules/store-ai/entities/store-ai-insight.entity.js';

// STORE AI PRODUCT ENTITIES (WO-O4O-PRODUCT-STORE-AI-INSIGHT-V1)
import { StoreAiProductSnapshot } from '../modules/store-ai/entities/store-ai-product-snapshot.entity.js';
import { StoreAiProductInsight } from '../modules/store-ai/entities/store-ai-product-insight.entity.js';

// PRODUCT AI TAG (WO-O4O-PRODUCT-AI-TAGGING-V1)
import { ProductAiTag } from '../modules/store-ai/entities/product-ai-tag.entity.js';

// PRODUCT AI CONTENT (IR-O4O-AI-CONTENT-ENGINE-IMPLEMENTATION-V1)
import { ProductAiContent } from '../modules/store-ai/entities/product-ai-content.entity.js';

// MEDIA LIBRARY (WO-O4O-COMMON-MEDIA-LIBRARY-FOUNDATION-V1)
import { MediaAsset } from '../modules/media/entities/MediaAsset.entity.js';

// PRODUCT OCR TEXT (WO-O4O-PRODUCT-AI-CONTENT-PIPELINE-V1)
import { ProductOcrText } from '../modules/store-ai/entities/product-ocr-text.entity.js';

// ASSET SNAPSHOT ENTITY (WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1)
import { AssetSnapshot } from '../modules/asset-snapshot/entities/asset-snapshot.entity.js';

// ACTION LOG ENTITY (WO-PLATFORM-ACTION-LOG-CORE-V1)
import { ActionLog } from '@o4o/action-log-core';

// SERVICE LEGAL / POLICY ENTITIES (WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1)
import { ServiceLegalProfile } from '../modules/service-legal/entities/ServiceLegalProfile.entity.js';
import { ServicePolicyDocument } from '../modules/service-legal/entities/ServicePolicyDocument.entity.js';

// CONTACT INQUIRY ENTITY (WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1)
import { ContactInquiry } from '../modules/contact-inquiry/entities/ContactInquiry.entity.js';
// SERVICE CONTACT SETTINGS ENTITY (WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1)
import { ServiceContactSettings } from '../modules/contact-inquiry/entities/ServiceContactSettings.entity.js';

// ============================================================================
// PLATFORM STORE IDENTITY ENTITIES (WO-CORE-STORE-SLUG-SYSTEM-V1)
// ============================================================================
import { PlatformStoreSlug } from '@o4o/platform-core/store-identity';
import { PlatformStoreSlugHistory } from '@o4o/platform-core/store-identity';

// ============================================================================
// CATALOG / STORE PRODUCT ENTITIES (WO-O4O-STORE-CATALOG-AND-STORE-PRODUCT-SCHEMA-IMPLEMENTATION-V1)
// ============================================================================
import { CatalogProduct } from '../modules/catalog/entities/catalog-product.entity.js';
import { StoreProduct } from '../modules/store/entities/store-product.entity.js';
// STORE LIBRARY ENTITY — store_library_items 는 store_execution_assets 로 rename됨(migration 20260421010000).
// StoreLibraryItem(부재 테이블) 제거 — StoreExecutionAsset 사용. (WO-O4O-STORE-LIBRARY-CONTROLLER-REPOINT-TO-EXECUTION-ASSETS-V1)

// ============================================================================
// NETURE ENTITIES (Phase P1: Read-Only Information Platform)
// ============================================================================
import {
  NetureSupplier,
  NetureSupplierRegulatedCategory, // WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1
  ServiceAudiencePolicy, // WO-O4O-SERVICE-PHARMACY-AUDIENCE-POLICY-SETTINGS-V1
  ProductMaster,
  ProductIdentifier, // WO-O4O-PRODUCT-IDENTIFIER-CORE-V1
  ProductCandidate, // WO-O4O-PRODUCT-CANDIDATE-REVIEW-QUEUE-V1
  MobileProductDraft, // WO-O4O-MOBILE-PRODUCT-DRAFT-TO-CANDIDATE-V1
  ProductDrugExtension, // WO-O4O-PRODUCT-DRUG-EXTENSION-PERSISTENCE-V1
  SharedProductDescription, // WO-O4O-PRODUCT-DESCRIPTION-SHARED-CANDIDATE-STORAGE-V1
  ProductCategory,
  Brand,
  SupplierProductOffer,
  NeturePartnershipRequest,
  NeturePartnershipProduct,
  NeturePartnerDashboardItem,
  NeturePartnerDashboardItemContent,
  NeturePartnerRecruitment,
  NeturePartnerApplication,
  NetureSellerPartnerContract,
  SupplierCsvImportBatch,
  SupplierCsvImportRow,
  NetureSupplierLibraryItem,
  ProductImage,
  NetureSettlement,
  NetureSettlementOrder,
  NetureContactMessage,
  OfferServiceApproval,
  ProductAlias,
  CategoryMappingRule,
  SpotPricePolicy,
} from '../modules/neture/entities/index.js';
// ============================================================================
// NETURE ROUTES ENTITIES (WO-TYPEORM-ENTITY-REGISTRATION-FIX-V3)
// Phase G-3: 주문/결제 + Phase D-1: 파트너/상품
// 의존 관계: NetureOrder ↔ NetureOrderItem, NeturePartner ↔ NetureProduct
// 전체 5개를 함께 등록해야 "No metadata found" 오류가 발생하지 않음
// ============================================================================
import {
  NetureOrder,
  NetureOrderItem,
  NeturePartner,
  NetureProduct,
  NetureProductLog,
} from '../routes/neture/entities/index.js';
// Guide Inline Edit entity (WO-O4O-GUIDE-CONTENT-DATASOURCE-REGISTER-V1)
import { GuideContent } from '../routes/guide/entities/guide-content.entity.js';

// ============================================================================
// CATALOG IMPORT ENTITIES (WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1)
// ============================================================================
import {
  CatalogImportJob,
  CatalogImportRow,
} from '../modules/catalog-import/entities/index.js';

// ============================================================================
// STORE CORE ENTITIES (WO-O4O-STORE-CORE-ENTITY-EXTRACTION-V1)
// ============================================================================
import {
  OrganizationStore,
  OrganizationChannel,
  OrganizationProductListing,
  OrganizationProductChannel,
  StoreProductProfile,
  StoreCapability,
} from '../modules/store-core/entities/index.js';

// ============================================================================
// KPA ENTITIES (Pharmacist Association SaaS)
// ============================================================================
import {
  KpaMember,
  KpaApplication,
  KpaJoinInquiry,
  KpaMemberService,
  KpaAuditLog,
  KpaStoreAssetControl,
  KpaStoreContent, // WO-KPA-A-CONTENT-OVERRIDE-EXTENSION-V1
  KpaPharmacyRequest, // WO-KPA-A-PHARMACY-REQUEST-STRUCTURE-REALIGN-V1
  OrganizationServiceEnrollment, // WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1
  KpaPharmacistProfile, // WO-ROLE-NORMALIZATION-PHASE3-B-V1
  KpaStudentProfile, // WO-KPA-A-RBAC-PROFILE-NORMALIZATION-V1
  ServiceProduct, // WO-O4O-SERVICE-PRODUCT-LAYER-PREP-V1
  StorePlaylist, // WO-O4O-SIGNAGE-STORE-PLAYLIST-ENGINE-V1
  StorePlaylistItem, // WO-O4O-SIGNAGE-STORE-PLAYLIST-ENGINE-V1
  KpaApprovalRequest, // WO-TYPEORM-ENTITY-REGISTRATION-P1-FIX-V1
  KpaContent, // WO-TYPEORM-ENTITY-REGISTRATION-P1-FIX-V1
  KpaWorkingContent, // WO-TYPEORM-ENTITY-REGISTRATION-P1-FIX-V1
} from '../routes/kpa/entities/index.js';
import { KpaLegalDocument } from '../routes/kpa/entities/kpa-legal-document.entity.js'; // WO-TYPEORM-ENTITY-REGISTRATION-P1-FIX-V1
// WO-O4O-KPA-REGISTER-CANONICAL-CLEANUP-V1: external_expert / supplier_staff entity 제거
import { MemberQualification } from '../routes/kpa/entities/member-qualification.entity.js';
import { QualificationRequest } from '../routes/kpa/entities/qualification-request.entity.js';
import { InstructorProfile } from '../routes/kpa/entities/instructor-profile.entity.js';

// ============================================================================
// PARTNER DASHBOARD ENTITIES (WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1)
// ============================================================================
import {
  PartnerContent,
  PartnerEvent,
  PartnerTarget,
} from '../modules/partner/entities/index.js';

// ============================================================================
// MARKET-TRIAL CORE ENTITIES (WO-MARKET-TRIAL-DB-PERSISTENCE-INTEGRATION-V1)
// ============================================================================
import {
  MarketTrial,
  MarketTrialParticipant,
  MarketTrialForum,
  MarketTrialDecision,
} from '@o4o/market-trial';

// MARKET-TRIAL EXTENSION ENTITIES
// WO-O4O-MARKET-TRIAL-PRODUCT-ORDER-SHIPPING-SCHEMA-CLEANUP-V1 (P3-1):
// MarketTrialShippingAddress / MarketTrialFulfillment (주문/발송 축) 제거됨.
import { MarketTrialForumSyncFailure } from '../extensions/trial-forum-monitor/entities/MarketTrialForumSyncFailure.entity.js';

// ============================================================================
// PLATFORM PHYSICAL STORE ENTITIES (WO-O4O-CROSS-SERVICE-STORE-LINKING-V1)
// ============================================================================
import {
  PhysicalStore,
  PhysicalStoreLink,
  StoreLocalProduct,
  StoreTablet,
  StoreTabletDisplay,
  TabletInterestRequest,
  StoreExecutionAsset,
  StoreAssetDerivation, // WO-KPA-STORE-ASSET-DERIVATION-TABLE-V1
  StoreQrCode,
  StoreQrScanEvent,
  ProductMarketingAsset,
} from '../routes/platform/entities/index.js';

// WO-O4O-KPA-POP-PUBLISHING-PHASE2-BACKEND-V1: StorePop entity 등록 (Phase 1 누락분 정합).
// Phase 1 에서 entity / migration / asset-snapshot 'pop' / queryPop placeholder 등은 적용됐으나
// connection.ts entities 배열 등록이 누락되어 TypeORM repository 사용이 불가능했음.
import { StorePop } from '../routes/o4o-store/entities/store-pop.entity.js';
// WO-O4O-KPA-OPERATOR-HUB-QR-TEMPLATE-FOUNDATION-V1: OperatorQrTemplate entity 등록.
// POP Phase 1 누락 레슨 적용 — Phase 1 단계부터 entities 배열 등록 포함 (Phase 2 정합 보장).
import { OperatorQrTemplate } from '../routes/o4o-store/entities/operator-qr-template.entity.js';

// ============================================================================
// PLATFORM STORE POLICY & PAYMENT CONFIG ENTITIES
// (WO-CORE-STORE-POLICY-SYSTEM-V1, WO-CORE-STORE-PAYMENT-CONFIG-V1)
// ============================================================================
import { PlatformStorePolicy, PlatformStorePaymentConfig } from '@o4o/platform-core/store-policy';

// ============================================================================
// CONTENT TEMPLATE ENTITY (WO-O4O-CONTENT-TEMPLATE-SYSTEM-V1)
// ============================================================================
import { ContentTemplate } from '../entities/ContentTemplate.js';

// ============================================================================
// PLATFORM INQUIRY ENTITY (Platform-level Contact Form)
// ============================================================================
import { PlatformInquiry } from '../entities/PlatformInquiry.js';

// ============================================================================
// CONTACT REQUEST ENTITY (WO-O4O-KPA-CONTACT-FORM-WORKFLOW-V1)
// ============================================================================
import { ContactRequest } from '../entities/ContactRequest.js';

// ============================================================================
// PLATFORM SERVICE CATALOG (WO-PLATFORM-SERVICE-CATALOG-AND-MY-V1)
// ============================================================================
import { PlatformService } from '../entities/PlatformService.js';

// ============================================================================
// PLATFORM PAYMENT ENTITY (WO-O4O-PAYMENT-CORE-GLYCOPHARM-PILOT-V1)
// ============================================================================
import { PlatformPayment } from '../entities/payment/PlatformPayment.entity.js';

// ============================================================================
// STORE PAID FEATURE ENTITLEMENT (WO-O4O-STORE-PAID-FEATURE-ENTITLEMENT-V1)
// ============================================================================
import { StorePaidFeatureEntitlement } from '../modules/store-entitlement/store-paid-feature-entitlement.entity.js';

// ============================================================================
// E-COMMERCE CORE ENTITIES (Phase 4-B: GlycoPharm Core Integration)
// Use official exports path (moduleResolution: bundler)
// ============================================================================
import { EcommerceOrder, EcommerceOrderItem, EcommercePayment } from '@o4o/ecommerce-core/entities';

// ============================================================================
// CHECKOUT ENTITIES (WO-KPA-CHECKOUT-ORDER-ENTITY-ALIGNMENT-FIX-V1)
// ============================================================================
import { CheckoutOrder } from '../entities/checkout/CheckoutOrder.entity.js';
import { CheckoutPayment } from '../entities/checkout/CheckoutPayment.entity.js';
import { OrderLog } from '../entities/checkout/OrderLog.entity.js';
// WO-O4O-STORE-CANONICAL-CART-CHECKOUT-FOUNDATION-V1
import { StoreCartItem } from '../entities/cart/StoreCartItem.entity.js';

// ============================================================================
// ORGANIZATION-CORE ENTITIES (Phase 4: Entities-only Re-introduction)
// Use /entities subpath to avoid side-effect loading
// ============================================================================
import {
  Organization,
  OrganizationMember,
} from '@o4o/organization-core/entities';

// ============================================================================
// CMS-CORE ENTITIES (WO-NETURE-SMOKE-STABILIZATION-V1)
// Use /entities subpath to avoid side-effect loading
// ============================================================================
import {
  CmsContent,
  CmsContentSlot,
  CmsMedia,
  CmsMediaFile,
  CmsMediaFolder,
  CmsMediaTag,
} from '@o4o-apps/cms-core/entities';

// ============================================================================
// DIGITAL-SIGNAGE-CORE ENTITIES (Phase 2: Production Build)
// Use /entities subpath for TypeORM entity imports
// ============================================================================
import {
  SignageCoreEntities,
} from '@o4o-apps/digital-signage-core/entities';

// ============================================================================
// LMS-CORE ENTITIES (reduced after Phase 2)
// ============================================================================
import {
  InstructorApplication,
} from '@o4o/lms-core/entities';
import { CourseCompletion } from '../modules/lms/entities/CourseCompletion.js';

// ============================================================================
// CREDIT MODULE ENTITIES (WO-TYPEORM-ENTITY-REGISTRATION-FIX-V1)
// ============================================================================
import { CreditBalance } from '../modules/credit/entities/CreditBalance.js';
import { CreditTransaction } from '../modules/credit/entities/CreditTransaction.js';
// APPRECIATION ENTITIES (WO-O4O-APPRECIATION-POINT-LIKE-SYSTEM-PHASE1-V1)
// ============================================================================
import { AppreciationSend } from '../modules/appreciation/entities/AppreciationSend.js';

// POINT BUDGET ENTITIES (WO-O4O-SERVICE-OPERATOR-POINT-BUDGET-PHASE1-V1)
// ============================================================================
import { ServicePointBudget } from '../modules/point/entities/ServicePointBudget.js';
import { ServicePointBudgetTransaction } from '../modules/point/entities/ServicePointBudgetTransaction.js';

// ============================================================================
// INTERACTIVE-CONTENT-CORE ENTITIES (Phase 1 + Phase 2)
// ============================================================================
import {
  Quiz,
  QuizAttempt,
  Survey,
  SurveyQuestion,
  SurveyResponse,
  ContentBundle,
  Course,
  Lesson,
  // WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1
  Assignment,
  Submission,
} from '@o4o/interactive-content-core/entities';

// ============================================================================
// EDUCATION-EXTENSION ENTITIES (WO-O4O-INTERACTIVE-CONTENT-CORE-EXTRACTION-PHASE2)
// ============================================================================
import {
  Enrollment,
  Progress,
  Certificate,
  LMSEvent,
  Attendance,
} from '@o4o/education-extension/entities';

// ============================================================================
// MEMBERSHIP-YAKSA ENTITIES (Re-enabled for /api/v1/membership routes)
// ============================================================================
import {
  MemberCategory,
  Member,
  Affiliation,
  MembershipRoleAssignment,
  MembershipYear,
  Verification,
  AffiliationChangeLog,
  MemberAuditLog,
  LicenseVerificationRequest,
} from '@o4o/membership-yaksa/entities';

// ============================================================================
// DOMAIN ENTITIES REMOVED (Phase R1: Execution Boundary Cleanup)
// ============================================================================
// The following domain package entities remain removed:
// - @o4o/membership-yaksa (MemberCategory, Member, Affiliation, etc.)
// - @o4o/dropshipping-cosmetics (CosmeticsFilter)
// - @o4o/reporting-yaksa (AnnualReport, ReportFieldTemplate, ReportLog, ReportAssignment)
// - @o4o/lms-yaksa (YaksaLicenseProfile, RequiredCoursePolicy, CreditRecord, YaksaCourseAssignment)
// - @o4o/annualfee-yaksa (FeePolicy, FeeInvoice, FeePayment, FeeExemption, FeeSettlement, FeeLog)
// - @o4o/cosmetics-partner-extension
// - @o4o/cosmetics-sample-display-extension
// - @o4o/lms-marketing (ProductContent, QuizCampaign, SurveyCampaign)
//
// These will be handled in Phase R4+ (domain service separation).
// ============================================================================

// ============================================================================
// ENTITY REGISTRY
// 등록 순서는 기존 connection.ts entities 배열 순서를 그대로 보존한다.
// (WO-O4O-API-SERVER-CONNECTION-ENTITY-REGISTRY-SPLIT-V1)
// ============================================================================
export const entities = [
  // AUTH Module entities
  User,
  Role,
  Permission,
  RefreshToken,
  RoleAssignment,
  ServiceMembership, // WO-O4O-SERVICE-MEMBERSHIP-ARCHITECTURE-V1
  ServiceCredential, // WO-O4O-IDENTITY-V2-PHASE1-SCHEMA-RESET-V1
  LoginAttempt,
  LinkingSession,
  // Legacy AUTH entities (to be migrated)
  PasswordResetToken,
  EmailVerificationToken,
  ApprovalLog,
  ProductApproval, // WO-PRODUCT-POLICY-V2-DATA-LAYER-INTRODUCTION-V1
  LinkedAccount,
  AccountActivity,
  UserActivityLog,
  Notification,
  // Media/MediaFile/MediaFolder removed
  Category,
  Settings,
  Theme,
  ThemeInstallation,
  // Content entities
  // Post/PostMeta/Page/PostAutosave removed
  Tag,
  ReusableBlock,
  BlockPattern,
  TemplatePart,
  // Shipment/ShipmentTrackingHistory removed
  SmtpSettings,
  EmailLog,
  OperatorNotificationSettings,
  FieldGroup,
  CustomField,
  CustomFieldValue,
  CustomPost,
  CustomPostType,
  // Taxonomy System entities
  Taxonomy,
  Term,
  TermRelationship,
  // Menu System entities removed
  // AI Settings (unified)
  AiSettings,
  AIUsageLog,
  // App System entities
  App,
  AppInstance,
  AppUsageLog,
  AppRegistry,
  // Cart/Order/Settlement entities removed - legacy commerce
  // Form entities
  Form,
  FormSubmission,
  // Customizer entities
  CustomizerPreset,
  WidgetArea,
  // CPT-ACF Preset entities
  FormPreset,
  ViewPreset,
  TemplatePreset,
  // P0 Zero-Data Role Management entities (RoleAssignment moved to AUTH module)
  RoleApplication,
  KycDocument,
  // SupplierProfile/SellerProfile/PartnerProfile removed - now in dropshipping-core
  // ============================================================================
  // FORUM-CORE ENTITIES (Phase 4: Entities-only Re-introduction)
  // ============================================================================
  ForumPost,
  // ForumCategory removed — WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1
  ForumComment,
  ForumCategoryRequest,
  ForumCategoryMember,
  ForumPostLike,
  // Forum Notification entity (Phase 13) - local entity
  ForumNotification,
  // Digital Signage legacy entities removed — see digital-signage-core
  // Deployment entities
  DeploymentInstance,
  // Site entities
  Site,
  // ✅ CMS Module V2 entities (Phase C-2) - local entities, kept
  CMSCustomField,
  CMSView,
  CMSPage,
  // ============================================================================
  // COSMETICS ENTITIES (Phase 7-A-1: Cosmetics API Implementation)
  // ============================================================================
  CosmeticsBrand,
  CosmeticsLine,
  CosmeticsProduct,
  CosmeticsPricePolicy,
  CosmeticsProductLog,
  CosmeticsPriceLog,
  // COSMETICS STORE ENTITIES (WO-KCOS-STORES-PHASE1-V1)
  CosmeticsStore,
  CosmeticsStoreApplication,
  CosmeticsStoreMember,
  CosmeticsStoreListing,
  // COSMETICS STORE PLAYLIST ENTITIES (WO-KCOS-STORES-PHASE4-SIGNAGE-INTEGRATION-V1)
  CosmeticsStorePlaylist,
  CosmeticsStorePlaylistItem,
  // COSMETICS MEMBER PROFILE (WO-O4O-KCOS-COSMETICS-MEMBER-PROFILE-FOUNDATION-V1)
  CosmeticsMember,
  // ============================================================================
  // YAKSA ENTITIES (Phase A-1: Yaksa API Implementation)
  // ============================================================================
  YaksaCategory,
  YaksaPost,
  YaksaPostLog,
  // ============================================================================
  // GLYCOPHARM ENTITIES (Phase B-1)
  // Note: GlycopharmPharmacy REMOVED (WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1 Phase C)
  // Note: GlycopharmOrder, GlycopharmOrderItem REMOVED (Phase 4-A Legacy Deprecation)
  // ============================================================================
  GlycopharmProduct,
  GlycopharmProductLog,
  GlycopharmApplication,
  GlycopharmFeaturedProduct,
  GlycopharmCustomerRequest,
  GlycopharmEvent,
  GlycopharmRequestActionLog,
  GlycopharmBillingInvoice, // Phase 3-D: Invoice Finalization
  // GlycopharmForumCategoryRequest — REMOVED (WO-O4O-FORUM-CATEGORY-DEAD-CODE-REMOVAL-V1)
  // TabletServiceRequest — REMOVED (WO-O4O-STORE-TABLET-LEGACY-CLEANUP-V1)
  StoreBlogPost, // WO-STORE-BLOG-CHANNEL-V1
  StoreBlogSettings, // WO-O4O-KPA-STORE-BLOG-META-V1
  GlycopharmPharmacyExtension, // WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1
  GlycopharmMember, // WO-GLYCOPHARM-MEMBER-TABLE-CREATION-V1
  GlycopharmContent, // WO-O4O-GLYCOPHARM-RESOURCES-BACKEND-V1
  // ============================================================================
  // ASSET SNAPSHOT ENTITY (WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1)
  // ============================================================================
  AssetSnapshot,
  // ============================================================================
  // ACTION LOG ENTITY (WO-PLATFORM-ACTION-LOG-CORE-V1)
  // ============================================================================
  ActionLog,
  // ============================================================================
  // SERVICE LEGAL / POLICY ENTITIES (WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1)
  // ============================================================================
  ServiceLegalProfile,
  ServicePolicyDocument,
  // CONTACT INQUIRY (WO-O4O-CONTACT-DELIVERY-AND-NOTIFICATION-V1)
  ContactInquiry,
  // SERVICE CONTACT SETTINGS (WO-O4O-SERVICE-CONTACT-SETTINGS-ADMIN-V1)
  ServiceContactSettings,
  // ============================================================================
  // PLATFORM STORE IDENTITY ENTITIES (WO-CORE-STORE-SLUG-SYSTEM-V1)
  // ============================================================================
  PlatformStoreSlug,
  PlatformStoreSlugHistory,
  // ============================================================================
  // CATALOG / STORE PRODUCT (WO-O4O-STORE-CATALOG-AND-STORE-PRODUCT-SCHEMA-IMPLEMENTATION-V1)
  // ============================================================================
  CatalogProduct,
  StoreProduct,
  // ============================================================================
  // NETURE ENTITIES (Phase P1: Read-Only Information Platform)
  // ============================================================================
  NetureSupplier,
  NetureSupplierRegulatedCategory, // WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1
  ServiceAudiencePolicy, // WO-O4O-SERVICE-PHARMACY-AUDIENCE-POLICY-SETTINGS-V1
  ProductMaster,
  ProductIdentifier, // WO-O4O-PRODUCT-IDENTIFIER-CORE-V1
  ProductCandidate, // WO-O4O-PRODUCT-CANDIDATE-REVIEW-QUEUE-V1
  MobileProductDraft, // WO-O4O-MOBILE-PRODUCT-DRAFT-TO-CANDIDATE-V1
  ProductDrugExtension, // WO-O4O-PRODUCT-DRUG-EXTENSION-PERSISTENCE-V1
  SharedProductDescription, // WO-O4O-PRODUCT-DESCRIPTION-SHARED-CANDIDATE-STORAGE-V1
  ProductCategory,
  Brand,
  SupplierProductOffer,
  NeturePartnershipRequest,
  NeturePartnershipProduct,
  NeturePartnerDashboardItem,
  NeturePartnerDashboardItemContent,
  NeturePartnerRecruitment,
  NeturePartnerApplication,
  NetureSellerPartnerContract,
  SupplierCsvImportBatch,
  SupplierCsvImportRow,
  NetureSupplierLibraryItem,
  ProductImage,
  NetureSettlement,
  NetureSettlementOrder,
  NetureContactMessage,
  OfferServiceApproval,
  ProductAlias,
  CategoryMappingRule,
  SpotPricePolicy,
  // WO-TYPEORM-ENTITY-REGISTRATION-FIX-V3: routes/neture 전체 등록
  NetureOrder,
  NetureOrderItem,
  NeturePartner,
  NetureProduct,
  NetureProductLog,
  // WO-O4O-GUIDE-CONTENT-DATASOURCE-REGISTER-V1
  GuideContent,
  // ============================================================================
  // CATALOG IMPORT ENTITIES (WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1)
  // ============================================================================
  CatalogImportJob,
  CatalogImportRow,
  // ============================================================================
  // STORE CORE ENTITIES (WO-O4O-STORE-CORE-ENTITY-EXTRACTION-V1)
  // ============================================================================
  OrganizationStore,
  OrganizationChannel,
  OrganizationProductListing,
  OrganizationProductChannel,
  StoreProductProfile,
  StoreCapability,
  // ============================================================================
  // KPA ENTITIES (Pharmacist Association SaaS)
  // ============================================================================
  KpaMember,
  KpaApplication,
  KpaJoinInquiry,
  KpaMemberService,
  KpaAuditLog,
  // WO-KPA-A-ASSET-CONTROL-EXTENSION-V1
  KpaStoreAssetControl,
  // WO-KPA-A-CONTENT-OVERRIDE-EXTENSION-V1
  KpaStoreContent,
  // WO-KPA-A-PHARMACY-REQUEST-STRUCTURE-REALIGN-V1
  KpaPharmacyRequest,
  OrganizationServiceEnrollment,
  // WO-ROLE-NORMALIZATION-PHASE3-B-V1
  KpaPharmacistProfile,
  // WO-KPA-A-RBAC-PROFILE-NORMALIZATION-V1
  KpaStudentProfile,
  // WO-O4O-QUALIFICATION-SYSTEM-V1
  MemberQualification,
  QualificationRequest,
  // WO-O4O-INSTRUCTOR-APPLICATION-V1
  InstructorProfile,
  // WO-O4O-SERVICE-PRODUCT-LAYER-PREP-V1
  ServiceProduct,
  // WO-O4O-SIGNAGE-STORE-PLAYLIST-ENGINE-V1
  StorePlaylist,
  StorePlaylistItem,
  // WO-TYPEORM-ENTITY-REGISTRATION-P1-FIX-V1 (예방 등록)
  KpaApprovalRequest,
  KpaContent,
  KpaWorkingContent,
  KpaLegalDocument,
  // ============================================================================
  // PARTNER DASHBOARD ENTITIES (WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1)
  // ============================================================================
  PartnerContent,
  PartnerEvent,
  PartnerTarget,
  // ============================================================================
  // CONTENT TEMPLATE ENTITY (WO-O4O-CONTENT-TEMPLATE-SYSTEM-V1)
  // ============================================================================
  ContentTemplate,
  // ============================================================================
  // PLATFORM INQUIRY ENTITY (Platform-level Contact Form)
  // ============================================================================
  PlatformInquiry,
  // WO-O4O-KPA-CONTACT-FORM-WORKFLOW-V1
  ContactRequest,
  // ============================================================================
  // PLATFORM SERVICE CATALOG (WO-PLATFORM-SERVICE-CATALOG-AND-MY-V1)
  // ============================================================================
  PlatformService,
  // ============================================================================
  // PLATFORM PAYMENT ENTITY (WO-O4O-PAYMENT-CORE-GLYCOPHARM-PILOT-V1)
  // ============================================================================
  PlatformPayment,
  // ============================================================================
  // STORE PAID FEATURE ENTITLEMENT (WO-O4O-STORE-PAID-FEATURE-ENTITLEMENT-V1)
  // ============================================================================
  StorePaidFeatureEntitlement,
  // ============================================================================
  // E-COMMERCE CORE ENTITIES (Phase 4-B: GlycoPharm Core Integration)
  // ============================================================================
  EcommerceOrder,
  EcommerceOrderItem,
  EcommercePayment,
  // ============================================================================
  // CHECKOUT ENTITIES (WO-KPA-CHECKOUT-ORDER-ENTITY-ALIGNMENT-FIX-V1)
  // ============================================================================
  CheckoutOrder,
  CheckoutPayment,
  OrderLog,
  // WO-O4O-STORE-CANONICAL-CART-CHECKOUT-FOUNDATION-V1 — canonical store cart foundation
  StoreCartItem,
  // ============================================================================
  // ORGANIZATION-CORE ENTITIES (Phase 4: Entities-only Re-introduction)
  // ============================================================================
  Organization,
  OrganizationMember,
  // ============================================================================
  // LMS-CORE ENTITIES (reduced after Phase 2)
  // ============================================================================
  InstructorApplication,
  CourseCompletion,
  // ============================================================================
  // CREDIT MODULE ENTITIES (WO-TYPEORM-ENTITY-REGISTRATION-FIX-V1)
  // ============================================================================
  CreditBalance,
  CreditTransaction,
  // ============================================================================
  // APPRECIATION ENTITIES (WO-O4O-APPRECIATION-POINT-LIKE-SYSTEM-PHASE1-V1)
  // ============================================================================
  AppreciationSend,
  // ============================================================================
  // POINT BUDGET ENTITIES (WO-O4O-SERVICE-OPERATOR-POINT-BUDGET-PHASE1-V1)
  // ============================================================================
  ServicePointBudget,
  ServicePointBudgetTransaction,
  // ============================================================================
  // INTERACTIVE-CONTENT-CORE ENTITIES (Phase 1 + Phase 2)
  // ============================================================================
  Quiz,
  QuizAttempt,
  Survey,
  SurveyQuestion,
  SurveyResponse,
  ContentBundle,
  Course,
  Lesson,
  // WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1
  Assignment,
  Submission,
  // ============================================================================
  // EDUCATION-EXTENSION ENTITIES
  // ============================================================================
  Enrollment,
  Progress,
  Certificate,
  LMSEvent,
  Attendance,
  // ============================================================================
  // CMS-CORE ENTITIES (WO-NETURE-SMOKE-STABILIZATION-V1)
  // WO-O4O-KPA-CONTENT-COPY-INFRA-HOTFIX-V1: CmsMedia 계열 추가
  // ============================================================================
  CmsContent,
  CmsContentSlot,
  CmsMedia,
  CmsMediaFile,
  CmsMediaFolder,
  CmsMediaTag,
  // ============================================================================
  // DIGITAL-SIGNAGE-CORE ENTITIES (Phase 2: Production Build)
  // ============================================================================
  ...SignageCoreEntities,
  // ============================================================================
  // MEMBERSHIP-YAKSA ENTITIES (Re-enabled for /api/v1/membership routes)
  // ============================================================================
  MemberCategory,
  Member,
  Affiliation,
  MembershipRoleAssignment,
  MembershipYear,
  Verification,
  AffiliationChangeLog,
  MemberAuditLog,
  LicenseVerificationRequest,
  // ============================================================================
  // PLATFORM PHYSICAL STORE ENTITIES (WO-O4O-CROSS-SERVICE-STORE-LINKING-V1)
  // ============================================================================
  PhysicalStore,
  PhysicalStoreLink,
  // ============================================================================
  // STORE LOCAL PRODUCT & TABLET DISPLAY ENTITIES (WO-STORE-LOCAL-PRODUCT-DISPLAY-V1)
  // ============================================================================
  StoreLocalProduct,
  StoreTablet,
  StoreTabletDisplay,
  // ============================================================================
  // TABLET INTEREST REQUEST (WO-O4O-TABLET-MODULE-V1)
  // ============================================================================
  TabletInterestRequest,
  // ============================================================================
  // STORE EXECUTION ASSETS ENTITY (WO-KPA-STORE-ASSET-STRUCTURE-REFACTOR-V1)
  // ============================================================================
  StoreExecutionAsset,
  // WO-KPA-STORE-ASSET-DERIVATION-TABLE-V1: 원본↔파생 관계 추적
  StoreAssetDerivation,
  // ============================================================================
  // STORE QR CODE ENTITY (WO-O4O-QR-LANDING-PAGE-V1)
  // ============================================================================
  StoreQrCode,
  // STORE POP ENTITY (WO-O4O-KPA-POP-OPERATOR-PUBLISHING-V1 Phase 1 +
  //   WO-O4O-KPA-POP-PUBLISHING-PHASE2-BACKEND-V1 entities 배열 등록)
  // ============================================================================
  StorePop,
  // OPERATOR QR TEMPLATE ENTITY (WO-O4O-KPA-OPERATOR-HUB-QR-TEMPLATE-FOUNDATION-V1)
  // 운영자 발행 QR 청사진 — slug/organization_id/scan tracking 없음.
  // 매장 가져가기 시 기존 store_qr_codes 에 매장 사본 INSERT (Phase 3-B 후속).
  // ============================================================================
  OperatorQrTemplate,
  // QR SCAN EVENT ENTITY (WO-O4O-QR-SCAN-ANALYTICS-V1)
  // ============================================================================
  StoreQrScanEvent,
  // PRODUCT MARKETING ASSET ENTITY (WO-O4O-PRODUCT-MARKETING-GRAPH-V1)
  // ============================================================================
  ProductMarketingAsset,
  // ============================================================================
  // PLATFORM STORE POLICY & PAYMENT CONFIG ENTITIES
  // ============================================================================
  PlatformStorePolicy,
  PlatformStorePaymentConfig,
  // ============================================================================
  // MARKET-TRIAL ENTITIES (WO-MARKET-TRIAL-DB-PERSISTENCE-INTEGRATION-V1)
  // ============================================================================
  MarketTrial,
  MarketTrialParticipant,
  MarketTrialForum,
  MarketTrialDecision,
  MarketTrialForumSyncFailure,
  // ============================================================================
  // STORE LIBRARY — store_library_items → store_execution_assets rename(20260421010000).
  //   StoreLibraryItem 제거(부재 테이블), StoreExecutionAsset 사용.
  //   (WO-O4O-STORE-LIBRARY-CONTROLLER-REPOINT-TO-EXECUTION-ASSETS-V1)
  // ============================================================================
  // STORE AI ENTITIES (WO-O4O-STORE-HUB-AI-SUMMARY-V1)
  // ============================================================================
  StoreAiSnapshot,
  StoreAiInsight,
  StoreAiProductSnapshot,
  StoreAiProductInsight,
  ProductAiTag,
  // PRODUCT AI CONTENT (IR-O4O-AI-CONTENT-ENGINE-IMPLEMENTATION-V1)
  ProductAiContent,
  // PRODUCT OCR TEXT (WO-O4O-PRODUCT-AI-CONTENT-PIPELINE-V1)
  ProductOcrText,
  // MEDIA LIBRARY (WO-O4O-COMMON-MEDIA-LIBRARY-FOUNDATION-V1)
  MediaAsset,
  // ============================================================================
  // AI POLICY ENTITIES (WO-O4O-AI-COST-LIMIT-QUOTA-V1 + WO-O4O-AI-BILLING-DATA-SYSTEM-V1)
  // ============================================================================
  AiLlmPolicy,
  AiUsageQuota,
  AiUsageAggregate,
  AiBillingSummary,
  // ============================================================================
  // DOMAIN ENTITIES REMAIN REMOVED (Phase R1: Execution Boundary Cleanup)
  // ============================================================================
  // Dropshipping-Cosmetics: CosmeticsFilter
  // Reporting-Yaksa: AnnualReport, ReportFieldTemplate, ReportLog, ReportAssignment
  // LMS-Yaksa: YaksaLicenseProfile, RequiredCoursePolicy, CreditRecord, YaksaCourseAssignment
  // AnnualFee-Yaksa: FeePolicy, FeeInvoice, FeePayment, FeeExemption, FeeSettlement, FeeLog
  // These entities will be handled in Phase R4+ (domain service separation).
  // ============================================================================
];
