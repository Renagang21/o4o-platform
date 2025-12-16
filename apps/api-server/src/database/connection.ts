import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SnakeNamingStrategy } from './SnakeNamingStrategy.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables for migrations
// In production, load .env-apiserver; in development, load .env.development
const envFile = process.env.NODE_ENV === 'production'
  ? '.env-apiserver'
  : '.env.development';

// When compiled, this file is in dist/src/database/, need to go up 3 levels to api-server root
const envPath = path.resolve(__dirname, '../../../', envFile);
dotenv.config({
  path: envPath
});
// AUTH Module entities (migrated to src/modules/auth/entities/)
import { User } from '../modules/auth/entities/User.js';
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
// Forum App entities (from @o4o-apps/forum package)
import { ForumPost, ForumCategory, ForumComment } from '@o4o-apps/forum';
// Forum Notification entity (Phase 13)
import { ForumNotification } from '../entities/ForumNotification.js';
// Dropshipping Core entities (from @o4o/dropshipping-core package)
// import { dropshippingEntities } from '@o4o/dropshipping-core';
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

// ✅ NEW: Membership-Yaksa entities
// Import from index to ensure correct loading order and prevent circular dependency
import {
  MemberCategory,
  Member,
  Affiliation,
  MembershipRoleAssignment,
  MembershipYear,
  Verification,
} from '@o4o/membership-yaksa/backend/entities/index.js';

// ✅ NEW: Dropshipping-Cosmetics entities
import { CosmeticsFilter } from '@o4o/dropshipping-cosmetics/backend/entities/cosmetics-filter.entity.js';
import { CosmeticsRoutine } from '@o4o/dropshipping-cosmetics/backend/entities/cosmetics-routine.entity.js';

// ✅ NEW: Organization-Core entities
import {
  Organization,
  OrganizationMember,
} from '@o4o/organization-core';

// ✅ NEW: LMS-Core entities
import {
  Course,
  Lesson,
  Enrollment,
  Progress,
  Certificate,
  LMSEvent,
  Attendance,
} from '@o4o/lms-core';

// ✅ NEW: Reporting-Yaksa entities
import {
  AnnualReport,
  ReportFieldTemplate,
  ReportLog,
  ReportAssignment,
} from '@o4o/reporting-yaksa/backend/entities/index.js';

// ✅ NEW: LMS-Yaksa entities
import {
  YaksaLicenseProfile,
  RequiredCoursePolicy,
  CreditRecord,
  YaksaCourseAssignment,
} from '@o4o/lms-yaksa';

// ✅ TODO: LMS-Marketing entities (Phase R7, R8) - temporarily disabled - build errors
// import {
//   ProductContent,
//   MarketingQuizCampaign,
//   SurveyCampaign,
// } from '@o4o-extensions/lms-marketing';

// ✅ TODO: Cosmetics-Partner-Extension entities (temporarily disabled - build errors)
// import {
//   PartnerProfile,
//   PartnerLink,
//   PartnerRoutine,
//   PartnerEarnings,
//   CommissionPolicy,
// } from '@o4o/cosmetics-partner-extension/backend/entities/index.js';

// ✅ NEW: AnnualFee-Yaksa entities (Phase 2)
import {
  FeePolicy,
  FeeInvoice,
  FeePayment,
  FeeExemption,
  FeeSettlement,
  FeeLog,
} from '@o4o/annualfee-yaksa/backend/entities/index.js';

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

  dataSourceConfig = {
    type: 'postgres',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
  };
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
    // Forum App entities (from @o4o-apps/forum package)
    ForumPost,
    ForumCategory,
    ForumComment,
    // Forum Notification entity (Phase 13)
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
    // ✅ CMS Module V2 entities (Phase C-2)
    // Note: CMSCustomPostType removed - CustomPostType now uses cms_cpt_types table
    CMSCustomField,
    CMSView,
    CMSPage,
    // ✅ NEW: Membership-Yaksa entities
    MemberCategory,
    Member,
    Affiliation,
    MembershipRoleAssignment,
    MembershipYear,
    Verification,
    // ✅ NEW: Dropshipping-Cosmetics entities
    CosmeticsFilter,
    CosmeticsRoutine,
    // ✅ NEW: Organization-Core entities
    Organization,
    OrganizationMember,
    // ✅ NEW: LMS-Core entities
    Course,
    Lesson,
    Enrollment,
    Progress,
    Certificate,
    LMSEvent,
    Attendance,
    // ✅ NEW: Reporting-Yaksa entities
    AnnualReport,
    ReportFieldTemplate,
    ReportLog,
    ReportAssignment,
    // ✅ NEW: LMS-Yaksa entities
    YaksaLicenseProfile,
    RequiredCoursePolicy,
    CreditRecord,
    YaksaCourseAssignment,
    // ✅ TODO: LMS-Marketing entities (Phase R7, R8) - temporarily disabled - build errors
    // ProductContent,
    // MarketingQuizCampaign,
    // SurveyCampaign,
    // ✅ TODO: Cosmetics-Partner-Extension entities (temporarily disabled - build errors)
    // PartnerProfile,
    // PartnerLink,
    // PartnerRoutine,
    // PartnerEarnings,
    // CommissionPolicy,
    // ✅ NEW: AnnualFee-Yaksa entities (Phase 2)
    FeePolicy,
    FeeInvoice,
    FeePayment,
    FeeExemption,
    FeeSettlement,
    FeeLog,
  ],
  
  // 마이그레이션 설정
  migrations: NODE_ENV === 'production'
    ? ['dist/database/migrations/*.js']
    : [__dirname + '/migrations/*.ts', __dirname + '/migrations/*.js'],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: false, // 자동 마이그레이션 비활성화 (수동 실행)
  
  // SSL 설정 (PostgreSQL 프로덕션 환경에서만)
  ...(DB_TYPE === 'postgres' && NODE_ENV === 'production' ? {
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
