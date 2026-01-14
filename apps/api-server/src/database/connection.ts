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
import { SmtpSettings } from '../entities/SmtpSettings.js';
import { EmailLog } from '../entities/EmailLog.js';
import { FieldGroup, CustomField, CustomFieldValue } from '../entities/CustomField.js';
import { CustomPost } from '../entities/CustomPost.js';
import { CustomPostType } from '../entities/CustomPostType.js';
// Taxonomy System entities
import { Taxonomy, Term, TermRelationship } from '../entities/Taxonomy.js';
// Menu System entities - removed (legacy CMS)
// AI Settings entity (unified - AISetting removed)
import { AiSettings } from '../entities/AiSettings.js';
import { AIUsageLog } from '../entities/AIUsageLog.js';
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
import { RoleApplication } from '../entities/RoleApplication.js';
import { KycDocument } from '../entities/KycDocument.js';
// SupplierProfile/SellerProfile/PartnerProfile removed - now in dropshipping-core

// ============================================================================
// FORUM-CORE ENTITIES (Phase 4: Entities-only Re-introduction)
// Use /entities subpath to avoid side-effect loading
// ============================================================================
import {
  ForumPost,
  ForumCategory,
  ForumComment,
  ForumTag,
} from '@o4o/forum-core/entities';

// Forum Notification entity (Phase 13)
import { ForumNotification } from '../entities/ForumNotification.js';
// Digital Signage entities
import { SignageDevice } from '../entities/SignageDevice.js';
import { SignageSlide } from '../entities/SignageSlide.js';
import { SignagePlaylist, SignagePlaylistItem } from '../entities/SignagePlaylist.js';
import { SignageSchedule } from '../entities/SignageSchedule.js';
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
  GlycopharmPharmacy,
  GlycopharmProduct,
  GlycopharmProductLog,
  GlycopharmApplication,
  // GlycopharmOrder, GlycopharmOrderItem - REMOVED (Phase 4-A: Legacy Order System Deprecation)
} from '../routes/glycopharm/entities/index.js';

// ============================================================================
// GLUCOSEVIEW ENTITIES (Phase C-1, C-2, C-3)
// ============================================================================
import {
  GlucoseViewVendor,
  GlucoseViewViewProfile,
  GlucoseViewConnection,
  GlucoseViewCustomer,
  GlucoseViewBranch,
  GlucoseViewChapter,
  GlucoseViewPharmacist,
  GlucoseViewApplication,
  GlucoseViewPharmacy,
} from '../routes/glucoseview/entities/index.js';

// ============================================================================
// NETURE ENTITIES (Phase P1: Read-Only Information Platform)
// ============================================================================
import {
  NetureSupplier,
  NetureSupplierProduct,
  NeturePartnershipRequest,
  NeturePartnershipProduct,
} from '../modules/neture/entities/index.js';

// ============================================================================
// KPA ENTITIES (Pharmacist Association SaaS)
// ============================================================================
import {
  KpaOrganization,
  KpaMember,
  KpaApplication,
} from '../routes/kpa/entities/index.js';

// ============================================================================
// E-COMMERCE CORE ENTITIES (Phase 4-B: GlycoPharm Core Integration)
// Use official exports path (moduleResolution: bundler)
// ============================================================================
import { EcommerceOrder, EcommerceOrderItem, EcommercePayment } from '@o4o/ecommerce-core/entities';

// ============================================================================
// ORGANIZATION-CORE ENTITIES (Phase 4: Entities-only Re-introduction)
// Use /entities subpath to avoid side-effect loading
// ============================================================================
import {
  Organization,
  OrganizationMember,
} from '@o4o/organization-core/entities';

// ============================================================================
// CMS-CORE ENTITIES - REMOVED (WO-PLATFORM-BOOTSTRAP-STABILIZATION-P0)
// ============================================================================
// Original: import { CmsContent, CmsContentSlot, Channel, ChannelPlaybackLog, ChannelHeartbeat } from '@o4o-apps/cms-core';
// Reason: Package index.ts re-exports all entities causing potential circular dependencies
// These entities will be lazy-loaded when Admin/Ops routes are accessed
// ============================================================================

// ============================================================================
// LMS-CORE ENTITIES (Phase 4: Entities-only Re-introduction)
// Use /entities subpath to avoid side-effect loading
// ============================================================================
import {
  Course,
  Lesson,
  Enrollment,
  Progress,
  Certificate,
  LMSEvent,
  Attendance,
  ContentBundle,
} from '@o4o/lms-core/entities';

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
// (lms-marketing은 R7에서 삭제됨)
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
  ...(DB_TYPE === 'postgres' ? {
    extra: {
      max: 20,           // 최대 연결 수
      min: 5,            // 최소 연결 수
      idleTimeoutMillis: 30000,  // 유휴 연결 타임아웃
      connectionTimeoutMillis: 2000, // 연결 타임아웃
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
    LoginAttempt,
    LinkingSession,
    // Legacy AUTH entities (to be migrated)
    PasswordResetToken,
    EmailVerificationToken,
    ApprovalLog,
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
    ForumCategory,
    ForumComment,
    ForumTag,
    // Forum Notification entity (Phase 13) - local entity
    ForumNotification,
    // Digital Signage entities
    SignageDevice,
    SignageSlide,
    SignagePlaylist,
    SignagePlaylistItem,
    SignageSchedule,
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
    // ============================================================================
    // YAKSA ENTITIES (Phase A-1: Yaksa API Implementation)
    // ============================================================================
    YaksaCategory,
    YaksaPost,
    YaksaPostLog,
    // ============================================================================
    // GLYCOPHARM ENTITIES (Phase B-1)
    // Note: GlycopharmOrder, GlycopharmOrderItem REMOVED (Phase 4-A Legacy Deprecation)
    // ============================================================================
    GlycopharmPharmacy,
    GlycopharmProduct,
    GlycopharmProductLog,
    GlycopharmApplication,
    // ============================================================================
    // GLUCOSEVIEW ENTITIES (Phase C-1, C-2, C-3: API + Customer + Pharmacist)
    // ============================================================================
    GlucoseViewVendor,
    GlucoseViewViewProfile,
    GlucoseViewConnection,
    GlucoseViewCustomer,
    GlucoseViewBranch,
    GlucoseViewChapter,
    GlucoseViewPharmacist,
    GlucoseViewApplication,
    GlucoseViewPharmacy,
    // ============================================================================
    // NETURE ENTITIES (Phase P1: Read-Only Information Platform)
    // ============================================================================
    NetureSupplier,
    NetureSupplierProduct,
    NeturePartnershipRequest,
    NeturePartnershipProduct,
    // ============================================================================
    // KPA ENTITIES (Pharmacist Association SaaS)
    // ============================================================================
    KpaOrganization,
    KpaMember,
    KpaApplication,
    // ============================================================================
    // E-COMMERCE CORE ENTITIES (Phase 4-B: GlycoPharm Core Integration)
    // ============================================================================
    EcommerceOrder,
    EcommerceOrderItem,
    EcommercePayment,
    // ============================================================================
    // ORGANIZATION-CORE ENTITIES (Phase 4: Entities-only Re-introduction)
    // ============================================================================
    Organization,
    OrganizationMember,
    // ============================================================================
    // LMS-CORE ENTITIES (Phase 4: Entities-only Re-introduction)
    // ============================================================================
    Course,
    Lesson,
    Enrollment,
    Progress,
    Certificate,
    LMSEvent,
    Attendance,
    ContentBundle,
    // ============================================================================
    // CMS-CORE & CHANNEL ENTITIES - REMOVED (WO-PLATFORM-BOOTSTRAP-STABILIZATION-P0)
    // ============================================================================
    // CmsContent, CmsContentSlot, Channel, ChannelPlaybackLog, ChannelHeartbeat
    // Removed to prevent package side-effect loading from @o4o-apps/cms-core
    // These Admin/Ops entities will be lazy-loaded when routes are accessed
    // ============================================================================
    // DOMAIN ENTITIES REMAIN REMOVED (Phase R1: Execution Boundary Cleanup)
    // ============================================================================
    // Membership-Yaksa: MemberCategory, Member, Affiliation, MembershipRoleAssignment, MembershipYear, Verification
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
