import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SnakeNamingStrategy } from './SnakeNamingStrategy.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { User } from '../entities/User.js';
import { Role } from '../entities/Role.js';
import { Permission } from '../entities/Permission.js';
import { RefreshToken } from '../entities/RefreshToken.js';
import { LoginAttempt } from '../entities/LoginAttempt.js';
import { PasswordResetToken } from '../entities/PasswordResetToken.js';
import { EmailVerificationToken } from '../entities/EmailVerificationToken.js';
import { ApprovalLog } from '../entities/ApprovalLog.js';
import { LinkedAccount } from '../entities/LinkedAccount.js';
import { AccountActivity } from '../entities/AccountActivity.js';
import { UserActivityLog } from '../entities/UserActivityLog.js';
import { Media } from '../entities/Media.js';
import { MediaFile } from '../entities/MediaFile.js';
import { MediaFolder } from '../entities/MediaFolder.js';
import { Category } from '../entities/Category.js';
import { Settings } from '../entities/Settings.js';
import { Theme, ThemeInstallation } from '../entities/Theme.js';
import { FundingProject } from '../entities/crowdfunding/FundingProject.js';
import { FundingReward } from '../entities/crowdfunding/FundingReward.js';
import { FundingBacking } from '../entities/crowdfunding/FundingBacking.js';
import { BackerReward } from '../entities/crowdfunding/BackerReward.js';
import { FundingUpdate } from '../entities/crowdfunding/FundingUpdate.js';
import { ForumCategory } from '../entities/ForumCategory.js';
import { ForumComment } from '../entities/ForumComment.js';
import { ForumPost } from '../entities/ForumPost.js';
import { ForumTag } from '../entities/ForumTag.js';
// Digital Signage entities
import { SignageContent } from '../entities/SignageContent.js';
import { SignageSchedule } from '../entities/SignageSchedule.js';
import { Store } from '../entities/Store.js';
import { StorePlaylist } from '../entities/StorePlaylist.js';
import { PlaylistItem } from '../entities/PlaylistItem.js';
import { ScreenTemplate } from '../entities/ScreenTemplate.js';
import { ContentUsageLog } from '../entities/ContentUsageLog.js';
import { Post } from '../entities/Post.js';
import { Tag } from '../entities/Tag.js';
import { PostAutosave } from '../entities/PostAutosave.js';
import { Page } from '../entities/Page.js';
import { ReusableBlock } from '../entities/ReusableBlock.js';
import { BlockPattern } from '../entities/BlockPattern.js';
import { TemplatePart } from '../entities/TemplatePart.js';
import { Shipment } from '../entities/Shipment.js';
import { ShipmentTrackingHistory } from '../entities/ShipmentTrackingHistory.js';
import { SmtpSettings } from '../entities/SmtpSettings.js';
import { EmailLog } from '../entities/EmailLog.js';
import { FieldGroup, CustomField, CustomFieldValue } from '../entities/CustomField.js';
import { CustomPost } from '../entities/CustomPost.js';
import { CustomPostType } from '../entities/CustomPostType.js';
// Taxonomy System entities
import { Taxonomy, Term, TermRelationship } from '../entities/Taxonomy.js';
// Menu System entities
import { Menu } from '../entities/Menu.js';
import { MenuItem } from '../entities/MenuItem.js';
import { MenuLocation } from '../entities/MenuLocation.js';
// AI Settings entity
import { AISetting } from '../entities/AISetting.js';
import { AiSettings } from '../entities/AiSettings.js';
import { AIUsageLog } from '../entities/AIUsageLog.js';
// App System entities
import { App } from '../entities/App.js';
import { AppInstance } from '../entities/AppInstance.js';
import { AppUsageLog } from '../entities/AppUsageLog.js';
// Cart and Order entities
import { Cart } from '../entities/Cart.js';
import { CartItem } from '../entities/CartItem.js';
import { Order } from '../entities/Order.js';
// Dropshipping entities
import { Product } from '../entities/Product.js';
import { Supplier } from '../entities/Supplier.js';
import { Seller } from '../entities/Seller.js';
import { Partner } from '../entities/Partner.js';
import { SellerProduct } from '../entities/SellerProduct.js';
import { PartnerCommission } from '../entities/PartnerCommission.js';
import { BusinessInfo } from '../entities/BusinessInfo.js';
// Form entities
import { Form } from '../entities/Form.js';
import { FormSubmission } from '../entities/FormSubmission.js';

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
    User,
    Role,
    Permission,
    RefreshToken,
    LoginAttempt,
    PasswordResetToken,
    EmailVerificationToken,
    ApprovalLog,
    LinkedAccount,
    AccountActivity,
    UserActivityLog,
    Media,
    MediaFile,
    MediaFolder,
    Category,
    Settings,
    Theme,
    ThemeInstallation,
    // Crowdfunding entities
    FundingProject,
    FundingReward,
    FundingBacking,
    BackerReward,
    FundingUpdate,
    // Forum entities
    ForumCategory,
    ForumPost,
    ForumComment,
    ForumTag,
    // Digital Signage entities
    SignageContent,
    SignageSchedule,
    Store,
    StorePlaylist,
    PlaylistItem,
    ScreenTemplate,
    ContentUsageLog,
    // Content entities
    Post,
    PostAutosave,
    Tag,
    Page,
    ReusableBlock,
    BlockPattern,
    TemplatePart,
    Shipment,
    ShipmentTrackingHistory,
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
    // Menu System entities
    Menu,
    MenuItem,
    MenuLocation,
    // AI Settings
    AISetting,
    AiSettings,
    AIUsageLog,
    // App System entities
    App,
    AppInstance,
    AppUsageLog,
    // Cart and Order entities
    Cart,
    CartItem,
    Order,
    // Dropshipping entities
    Product,
    Supplier,
    Seller,
    Partner,
    SellerProduct,
    PartnerCommission,
    BusinessInfo,
    // Form entities
    Form,
    FormSubmission,
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
