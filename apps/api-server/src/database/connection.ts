import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SnakeNamingStrategy } from './SnakeNamingStrategy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Auth entities
import { User } from '../modules/auth/entities/User.js';
import { Role } from '../modules/auth/entities/Role.js';
import { Permission } from '../modules/auth/entities/Permission.js';
import { RefreshToken } from '../modules/auth/entities/RefreshToken.js';
import { LoginAttempt } from '../modules/auth/entities/LoginAttempt.js';
import { LinkingSession } from '../modules/auth/entities/LinkingSession.js';
import { RoleAssignment } from '../modules/auth/entities/RoleAssignment.js';

// Legacy auth entities
import { PasswordResetToken } from '../entities/PasswordResetToken.js';
import { EmailVerificationToken } from '../entities/EmailVerificationToken.js';
import { ApprovalLog } from '../entities/ApprovalLog.js';
import { LinkedAccount } from '../entities/LinkedAccount.js';
import { AccountActivity } from '../entities/AccountActivity.js';
import { UserActivityLog } from '../entities/UserActivityLog.js';
import { Notification } from '../entities/Notification.js';

// Core entities
import { Category } from '../entities/Category.js';
import { Settings } from '../entities/Settings.js';
import { Theme, ThemeInstallation } from '../entities/Theme.js';
import { Tag } from '../entities/Tag.js';
import { ReusableBlock } from '../entities/ReusableBlock.js';
import { BlockPattern } from '../entities/BlockPattern.js';
import { TemplatePart } from '../entities/TemplatePart.js';
import { SmtpSettings } from '../entities/SmtpSettings.js';
import { EmailLog } from '../entities/EmailLog.js';
import { FieldGroup, CustomField, CustomFieldValue } from '../entities/CustomField.js';
import { CustomPost } from '../entities/CustomPost.js';
import { CustomPostType } from '../entities/CustomPostType.js';
import { Taxonomy, Term, TermRelationship } from '../entities/Taxonomy.js';
import { AiSettings } from '../entities/AiSettings.js';
import { AIUsageLog } from '../entities/AIUsageLog.js';

// App system
import { App } from '../entities/App.js';
import { AppInstance } from '../entities/AppInstance.js';
import { AppUsageLog } from '../entities/AppUsageLog.js';
import { AppRegistry } from '../entities/AppRegistry.js';

// Forms
import { Form } from '../entities/Form.js';
import { FormSubmission } from '../entities/FormSubmission.js';

// Customizer
import { CustomizerPreset } from '../entities/CustomizerPreset.js';
import { WidgetArea } from '../entities/WidgetArea.js';

// CPT-ACF Presets
import { FormPreset } from '../entities/FormPreset.js';
import { ViewPreset } from '../entities/ViewPreset.js';
import { TemplatePreset } from '../entities/TemplatePreset.js';

// Role management
import { RoleApplication } from '../entities/RoleApplication.js';
import { KycDocument } from '../entities/KycDocument.js';

// Forum
import { ForumPost, ForumCategory, ForumComment, ForumTag } from '@o4o/forum-core';
import { ForumNotification } from '../entities/ForumNotification.js';

// Digital signage
import { SignageDevice } from '../entities/SignageDevice.js';
import { SignageSlide } from '../entities/SignageSlide.js';
import { SignagePlaylist, SignagePlaylistItem } from '../entities/SignagePlaylist.js';
import { SignageSchedule } from '../entities/SignageSchedule.js';

// Deployment
import { DeploymentInstance } from '../modules/deployment/deployment.entity.js';

// Sites
import { Site } from '../modules/sites/site.entity.js';

// CMS Module V2
import { CustomField as CMSCustomField } from '../modules/cms/entities/CustomField.js';
import { View as CMSView } from '../modules/cms/entities/View.js';
import { Page as CMSPage } from '../modules/cms/entities/Page.js';

// Service entities - use index.js barrel export (same as other services)
import {
  CosmeticsBrand,
  CosmeticsLine,
  CosmeticsProduct,
  CosmeticsPricePolicy,
  CosmeticsProductLog,
  CosmeticsPriceLog,
} from '../routes/cosmetics/entities/index.js';

import {
  YaksaCategory,
  YaksaPost,
  YaksaPostLog,
} from '../routes/yaksa/entities/index.js';

import {
  GlycopharmPharmacy,
  GlycopharmProduct,
  GlycopharmProductLog,
  GlycopharmApplication,
  GlycopharmOrder,
  GlycopharmOrderItem,
} from '../routes/glycopharm/entities/index.js';

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

import {
  NetureSupplier,
  NetureSupplierProduct,
  NeturePartnershipRequest,
  NeturePartnershipProduct,
} from '../modules/neture/entities/index.js';

import {
  KpaOrganization,
  KpaMember,
  KpaApplication,
} from '../routes/kpa/entities/index.js';

// Tourism entities (Phase 5-C)
import {
  TourismDestination,
  TourismPackage,
  TourismPackageItem,
} from '../routes/tourism/entities/index.js';

// NOTE: Checkout entities (CheckoutOrder, CheckoutPayment, OrderLog) are NOT registered yet.
// These tables don't exist in the database. Migration needed before registration.
// See: apps/api-server/src/entities/checkout/

// Organization core
import { Organization, OrganizationMember } from '@o4o/organization-core';

// CMS core
import { CmsContent, CmsContentSlot, Channel, ChannelPlaybackLog, ChannelHeartbeat } from '@o4o-apps/cms-core';

// LMS core
import {
  Course,
  Lesson,
  Enrollment,
  Progress,
  Certificate,
  LMSEvent,
  Attendance,
} from '@o4o/lms-core';

// Environment configuration
const DB_TYPE = process.env.DB_TYPE || 'postgres';
const NODE_ENV = process.env.NODE_ENV || 'development';

let dataSourceConfig: any;

if (DB_TYPE === 'sqlite') {
  const DB_DATABASE = process.env.DB_DATABASE || './data/o4o_dev.sqlite';
  dataSourceConfig = {
    type: 'sqlite',
    database: DB_DATABASE,
  };
} else {
  const DB_HOST = process.env.DB_HOST;
  const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
  const DB_USERNAME = process.env.DB_USERNAME;
  const DB_PASSWORD = process.env.DB_PASSWORD;
  const DB_NAME = process.env.DB_NAME;

  const isCloudSQLSocket = DB_HOST?.startsWith('/cloudsql/');

  if (isCloudSQLSocket) {
    dataSourceConfig = {
      type: 'postgres',
      host: DB_HOST,
      username: DB_USERNAME,
      password: DB_PASSWORD,
      database: DB_NAME,
    };
  } else {
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

export const AppDataSource = new DataSource({
  ...dataSourceConfig,

  synchronize: false,
  logging: ['error'],

  ...(DB_TYPE === 'postgres' ? {
    extra: {
      max: 20,
      min: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  } : {}),

  entities: [
    // Auth
    User,
    Role,
    Permission,
    RefreshToken,
    RoleAssignment,
    LoginAttempt,
    LinkingSession,
    PasswordResetToken,
    EmailVerificationToken,
    ApprovalLog,
    LinkedAccount,
    AccountActivity,
    UserActivityLog,
    Notification,
    // Core
    Category,
    Settings,
    Theme,
    ThemeInstallation,
    Tag,
    ReusableBlock,
    BlockPattern,
    TemplatePart,
    SmtpSettings,
    EmailLog,
    FieldGroup,
    CustomField,
    CustomFieldValue,
    CustomPost,
    CustomPostType,
    Taxonomy,
    Term,
    TermRelationship,
    AiSettings,
    AIUsageLog,
    // App System
    App,
    AppInstance,
    AppUsageLog,
    AppRegistry,
    // Forms
    Form,
    FormSubmission,
    // Customizer
    CustomizerPreset,
    WidgetArea,
    // CPT-ACF Presets
    FormPreset,
    ViewPreset,
    TemplatePreset,
    // Role Management
    RoleApplication,
    KycDocument,
    // Forum
    ForumPost,
    ForumCategory,
    ForumComment,
    ForumTag,
    ForumNotification,
    // Digital Signage
    SignageDevice,
    SignageSlide,
    SignagePlaylist,
    SignagePlaylistItem,
    SignageSchedule,
    // Deployment
    DeploymentInstance,
    // Sites
    Site,
    // CMS Module V2
    CMSCustomField,
    CMSView,
    CMSPage,
    // Services
    CosmeticsBrand,
    CosmeticsLine,
    CosmeticsProduct,
    CosmeticsPricePolicy,
    CosmeticsProductLog,
    CosmeticsPriceLog,
    YaksaCategory,
    YaksaPost,
    YaksaPostLog,
    GlycopharmPharmacy,
    GlycopharmProduct,
    GlycopharmProductLog,
    GlycopharmApplication,
    GlycopharmOrder,
    GlycopharmOrderItem,
    GlucoseViewVendor,
    GlucoseViewViewProfile,
    GlucoseViewConnection,
    GlucoseViewCustomer,
    GlucoseViewBranch,
    GlucoseViewChapter,
    GlucoseViewPharmacist,
    GlucoseViewApplication,
    GlucoseViewPharmacy,
    NetureSupplier,
    NetureSupplierProduct,
    NeturePartnershipRequest,
    NeturePartnershipProduct,
    KpaOrganization,
    KpaMember,
    KpaApplication,
    Organization,
    OrganizationMember,
    Course,
    Lesson,
    Enrollment,
    Progress,
    Certificate,
    LMSEvent,
    Attendance,
    CmsContent,
    CmsContentSlot,
    Channel,
    ChannelPlaybackLog,
    ChannelHeartbeat,
    // Tourism (Phase 5-C)
    TourismDestination,
    TourismPackage,
    TourismPackageItem,
    // NOTE: Checkout entities not registered - tables don't exist yet
  ],

  migrations: NODE_ENV === 'production'
    ? ['dist/database/migrations/*.js']
    : [__dirname + '/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: false,

  ...(DB_TYPE === 'postgres' && NODE_ENV === 'production' && !process.env.DB_HOST?.startsWith('/cloudsql/') ? {
    ssl: {
      rejectUnauthorized: false
    }
  } : {}),

  ...(DB_TYPE === 'postgres' ? {
    cache: {
      type: 'database',
      tableName: 'typeorm_query_cache',
      duration: 30000
    }
  } : {})
});

export async function checkDatabaseHealth() {
  try {
    if (!AppDataSource.isInitialized) {
      return { status: 'disconnected', error: 'DataSource not initialized' };
    }

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

export async function closeDatabaseConnection() {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  } catch (error: any) {
    // Silent error handling
  }
}

export const initializeDatabase = () => AppDataSource.initialize();

export default AppDataSource;
