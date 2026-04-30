import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SnakeNamingStrategy } from './SnakeNamingStrategy.js';
// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Note: Environment variables are loaded by main.ts at startup
// In Cloud Run, env vars are injected via workflow (no .env files needed)
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
  GlycopharmForumCategoryRequest, // Forum Category Request (legacy)
  // GlycopharmOrder, GlycopharmOrderItem - REMOVED (Phase 4-A: Legacy Order System Deprecation)
  // TabletServiceRequest — REMOVED (WO-O4O-STORE-TABLET-LEGACY-CLEANUP-V1)
  StoreBlogPost, // WO-STORE-BLOG-CHANNEL-V1
  GlycopharmPharmacyExtension, // WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1
  GlycopharmMember, // WO-GLYCOPHARM-MEMBER-TABLE-CREATION-V1
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

// ============================================================================
// NETURE ENTITIES (Phase P1: Read-Only Information Platform)
// ============================================================================
import {
  NetureSupplier,
  ProductMaster,
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
import { KpaSteward } from '../routes/kpa/entities/kpa-steward.entity.js'; // WO-TYPEORM-ENTITY-REGISTRATION-FIX-V2
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
import { KpaExternalExpertProfile } from '../routes/kpa/entities/kpa-external-expert-profile.entity.js';
import { KpaSupplierStaffProfile } from '../routes/kpa/entities/kpa-supplier-staff-profile.entity.js';
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
// SITEGUIDE ENTITIES (WO-SITEGUIDE-CORE-EXECUTION-V1)
// ============================================================================
import {
  SiteGuideBusiness,
  SiteGuideApiKey,
  SiteGuideUsageSummary,
  SiteGuideExecutionLog,
} from '../routes/siteguide/entities/index.js';
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
import { MarketTrialShippingAddress } from '../extensions/trial-shipping/entities/MarketTrialShippingAddress.entity.js';
import { MarketTrialFulfillment } from '../extensions/trial-fulfillment/entities/MarketTrialFulfillment.entity.js';
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
  StoreQrCode,
  StoreQrScanEvent,
  ProductMarketingAsset,
} from '../routes/platform/entities/index.js';

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
// PLATFORM SERVICE CATALOG (WO-PLATFORM-SERVICE-CATALOG-AND-MY-V1)
// ============================================================================
import { PlatformService } from '../entities/PlatformService.js';

// ============================================================================
// PLATFORM PAYMENT ENTITY (WO-O4O-PAYMENT-CORE-GLYCOPHARM-PILOT-V1)
// ============================================================================
import { PlatformPayment } from '../entities/payment/PlatformPayment.entity.js';

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
  // WO-O4O-TEMPLATE-SYSTEM-FOUNDATION
  Template,
  TemplateVersion,
  TemplateBlock,
  // WO-O4O-TEMPLATE-LIBRARY
  TemplateTag,
  TemplateTagMap,
  TemplateCategory,
  TemplateCategoryMap,
  // WO-O4O-STORE-CONTENT-COPY
  StoreContent,
  StoreContentBlock,
  // WO-O4O-CONTENT-ANALYTICS
  ContentAnalytics,
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

// 환경변수 직접 사용 (dotenv는 main.ts에서 먼저 로딩됨)
const DB_TYPE = process.env.DB_TYPE || 'postgres';
const NODE_ENV = process.env.NODE_ENV || 'development';

// SQLite 또는 PostgreSQL 설정
let dataSourceConfig: any;

if (DB_TYPE === 'sqlite') {
  const DB_DATABASE = process.env.DB_DATABASE || './data/o4o_dev.sqlite';

  dataSourceConfig = {
    type: 'sqlite',
    database: DB_DATABASE,
  };
} else {
  // PostgreSQL 설정
  const DB_HOST = process.env.DB_HOST;
  const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
  const DB_USERNAME = process.env.DB_USERNAME;
  const DB_PASSWORD = process.env.DB_PASSWORD;
  const DB_NAME = process.env.DB_NAME;

  // Cloud SQL Unix Socket 연결 감지
  // Cloud Run에서 Cloud SQL 연결 시 DB_HOST가 /cloudsql/... 형식
  const isCloudSQLSocket = DB_HOST?.startsWith('/cloudsql/');

  if (isCloudSQLSocket) {
    // Cloud SQL Unix Socket 연결 (Cloud Run 환경)
    // pg 드라이버는 host 옵션에 socket 디렉토리 경로를 사용
    dataSourceConfig = {
      type: 'postgres',
      host: DB_HOST,  // /cloudsql/PROJECT:REGION:INSTANCE
      username: DB_USERNAME,
      password: DB_PASSWORD,
      database: DB_NAME,
      // Cloud SQL socket 연결 시 port는 사용되지 않음
    };
  } else {
    // 일반 TCP 연결 (로컬 개발, 기타 환경)
    dataSourceConfig = {
      type: 'postgres',
      host: DB_HOST,
      port: DB_PORT,
      username: DB_USERNAME,
      password: DB_PASSWORD,
      database: DB_NAME,
    };
  }
}

// TypeORM 데이터소스 설정
export const AppDataSource = new DataSource({
  ...dataSourceConfig,
  
  // NamingStrategy 설정 - 주석 처리 (데이터베이스가 이미 camelCase 사용)
  // namingStrategy: new SnakeNamingStrategy(),
  
  // 프로덕션 환경 설정
  synchronize: false, // 프로덕션에서는 항상 false
  logging: ['error'], // 프로덕션에서는 에러만 로깅
  
  // 연결 풀 설정 (PostgreSQL에서만 사용)
  // Cloud SQL Auth Proxy cold start 시 10초 이상 소요 가능 → 타임아웃 충분히 확보
  ...(DB_TYPE === 'postgres' ? {
    extra: {
      max: 20,           // 최대 연결 수
      min: 2,            // 최소 연결 수 (cold start 부담 감소)
      idleTimeoutMillis: 30000,  // 유휴 연결 타임아웃
      connectionTimeoutMillis: 10000, // 연결 타임아웃 (Cloud SQL Auth Proxy 대응)
    }
  } : {}),
  
  // 엔티티 등록 - 모든 환경에서 명시적 엔티티 배열 사용
  entities: [
    // AUTH Module entities
    User,
    Role,
    Permission,
    RefreshToken,
    RoleAssignment,
    ServiceMembership, // WO-O4O-SERVICE-MEMBERSHIP-ARCHITECTURE-V1
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
    GlycopharmForumCategoryRequest, // Forum Category Request (legacy)
    // TabletServiceRequest — REMOVED (WO-O4O-STORE-TABLET-LEGACY-CLEANUP-V1)
    StoreBlogPost, // WO-STORE-BLOG-CHANNEL-V1
    GlycopharmPharmacyExtension, // WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1
    GlycopharmMember, // WO-GLYCOPHARM-MEMBER-TABLE-CREATION-V1
    // ============================================================================
    // ASSET SNAPSHOT ENTITY (WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1)
    // ============================================================================
    AssetSnapshot,
    // ============================================================================
    // ACTION LOG ENTITY (WO-PLATFORM-ACTION-LOG-CORE-V1)
    // ============================================================================
    ActionLog,
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
    ProductMaster,
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
    // WO-TYPEORM-ENTITY-REGISTRATION-FIX-V2
    KpaSteward,
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
    // WO-O4O-REGISTRATION-STRUCTURE-REFACTOR-V1
    KpaExternalExpertProfile,
    KpaSupplierStaffProfile,
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
    // SITEGUIDE ENTITIES (WO-SITEGUIDE-CORE-EXECUTION-V1)
    // ============================================================================
    SiteGuideBusiness,
    SiteGuideApiKey,
    SiteGuideUsageSummary,
    SiteGuideExecutionLog,
    // ============================================================================
    // CONTENT TEMPLATE ENTITY (WO-O4O-CONTENT-TEMPLATE-SYSTEM-V1)
    // ============================================================================
    ContentTemplate,
    // ============================================================================
    // PLATFORM INQUIRY ENTITY (Platform-level Contact Form)
    // ============================================================================
    PlatformInquiry,
    // ============================================================================
    // PLATFORM SERVICE CATALOG (WO-PLATFORM-SERVICE-CATALOG-AND-MY-V1)
    // ============================================================================
    PlatformService,
    // ============================================================================
    // PLATFORM PAYMENT ENTITY (WO-O4O-PAYMENT-CORE-GLYCOPHARM-PILOT-V1)
    // ============================================================================
    PlatformPayment,
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
    // WO-O4O-TEMPLATE-SYSTEM-FOUNDATION
    Template,
    TemplateVersion,
    TemplateBlock,
    // WO-O4O-TEMPLATE-LIBRARY
    TemplateTag,
    TemplateTagMap,
    TemplateCategory,
    TemplateCategoryMap,
    // WO-O4O-STORE-CONTENT-COPY
    StoreContent,
    StoreContentBlock,
    // WO-O4O-CONTENT-ANALYTICS
    ContentAnalytics,
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
    // ============================================================================
    // STORE QR CODE ENTITY (WO-O4O-QR-LANDING-PAGE-V1)
    // ============================================================================
    StoreQrCode,
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
    MarketTrialShippingAddress,
    MarketTrialFulfillment,
    MarketTrialForumSyncFailure,
    // ============================================================================
    // STORE LIBRARY (WO-O4O-STORE-LIBRARY-FOUNDATION-V1) — merged into existing entry above
    // ============================================================================
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
  ],
  
  // 마이그레이션 설정
  // 프로덕션: dist/database/migrations/*.js (컴파일된 JS)
  // 개발: src/database/migrations/*.ts (TypeScript 소스)
  migrations: NODE_ENV === 'production'
    ? ['dist/database/migrations/*.js']
    : [__dirname + '/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
  // 프로덕션에서 자동 마이그레이션 비활성화
  // 기존 DB에 마이그레이션 기록이 없으면 테이블 중복 생성 오류 발생
  // 마이그레이션은 별도의 프로세스로 수동 실행 권장
  migrationsRun: false,
  
  // SSL 설정 (PostgreSQL TCP 연결 프로덕션 환경에서만)
  // Cloud SQL Unix Socket 연결 시에는 SSL 불필요 (이미 암호화됨)
  ...(DB_TYPE === 'postgres' && NODE_ENV === 'production' && !process.env.DB_HOST?.startsWith('/cloudsql/') ? {
    ssl: {
      rejectUnauthorized: false
    }
  } : {}),
  
  // 캐시 설정 (PostgreSQL에서만)
  ...(DB_TYPE === 'postgres' ? {
    cache: {
      type: 'database',
      tableName: 'typeorm_query_cache',
      duration: 30000 // 30초 캐시
    }
  } : {})
});

// 데이터베이스 연결 상태 모니터링
// 주의: main.ts에서 초기화하므로 여기서는 자동 초기화하지 않음
// PM2 클러스터 모드에서 중복 초기화 방지
/*
AppDataSource.initialize()
  .then(() => {
  })
  .catch((error) => {
    // Error log removed
  });
*/

// 데이터베이스 헬스 체크 함수
export async function checkDatabaseHealth() {
  try {
    if (!AppDataSource.isInitialized) {
      return { status: 'disconnected', error: 'DataSource not initialized' };
    }

    // 간단한 쿼리로 연결 상태 확인
    await AppDataSource.query('SELECT 1');
    
    const connectionInfo: any = {
      status: 'connected',
      timestamp: new Date().toISOString()
    };

    if (DB_TYPE === 'sqlite') {
      connectionInfo.type = 'sqlite';
      connectionInfo.database = dataSourceConfig.database;
    } else {
      connectionInfo.type = 'postgres';
      connectionInfo.host = dataSourceConfig.host;
      connectionInfo.port = dataSourceConfig.port;
      connectionInfo.database = dataSourceConfig.database;
      connectionInfo.connectionCount = (AppDataSource.driver as { pool?: { size?: number } })?.pool?.size || 0;
      connectionInfo.maxConnections = 20;
    }

    return connectionInfo;
  } catch (error: any) {
    return {
      status: 'error',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    };
  }
}

// 데이터베이스 정리 함수 (종료 시 사용)
export async function closeDatabaseConnection() {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  } catch (error: any) {
    // Error log removed
  }
}

// initializeDatabase function for backward compatibility
export const initializeDatabase = () => AppDataSource.initialize();

// TypeORM CLI를 위한 default export
export default AppDataSource;
