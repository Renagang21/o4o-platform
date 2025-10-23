import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from './SnakeNamingStrategy';
import { User } from '../entities/User';
import { Role } from '../entities/Role';
import { Permission } from '../entities/Permission';
import { RefreshToken } from '../entities/RefreshToken';
import { LoginAttempt } from '../entities/LoginAttempt';
import { PasswordResetToken } from '../entities/PasswordResetToken';
import { EmailVerificationToken } from '../entities/EmailVerificationToken';
import { ApprovalLog } from '../entities/ApprovalLog';
import { LinkedAccount } from '../entities/LinkedAccount';
import { AccountActivity } from '../entities/AccountActivity';
import { UserActivityLog } from '../entities/UserActivityLog';
import { Media } from '../entities/Media';
import { MediaFile } from '../entities/MediaFile';
import { MediaFolder } from '../entities/MediaFolder';
import { Category } from '../entities/Category';
import { Settings } from '../entities/Settings';
import { Theme, ThemeInstallation } from '../entities/Theme';
import { FundingProject } from '../entities/crowdfunding/FundingProject';
import { FundingReward } from '../entities/crowdfunding/FundingReward';
import { FundingBacking } from '../entities/crowdfunding/FundingBacking';
import { BackerReward } from '../entities/crowdfunding/BackerReward';
import { FundingUpdate } from '../entities/crowdfunding/FundingUpdate';
import { ForumCategory } from '../entities/ForumCategory';
import { ForumComment } from '../entities/ForumComment';
import { ForumPost } from '../entities/ForumPost';
import { ForumTag } from '../entities/ForumTag';
// Digital Signage entities
import { SignageContent } from '../entities/SignageContent';
import { SignageSchedule } from '../entities/SignageSchedule';
import { Store } from '../entities/Store';
import { StorePlaylist } from '../entities/StorePlaylist';
import { PlaylistItem } from '../entities/PlaylistItem';
import { ScreenTemplate } from '../entities/ScreenTemplate';
import { ContentUsageLog } from '../entities/ContentUsageLog';
import { Post } from '../entities/Post';
import { Tag } from '../entities/Tag';
import { PostAutosave } from '../entities/PostAutosave';
import { Page } from '../entities/Page';
import { ReusableBlock } from '../entities/ReusableBlock';
import { BlockPattern } from '../entities/BlockPattern';
import { TemplatePart } from '../entities/TemplatePart';
import { Shipment } from '../entities/Shipment';
import { ShipmentTrackingHistory } from '../entities/ShipmentTrackingHistory';
import { SmtpSettings } from '../entities/SmtpSettings';
import { EmailLog } from '../entities/EmailLog';
import { FieldGroup, CustomField, CustomFieldValue } from '../entities/CustomField';
import { CustomPost } from '../entities/CustomPost';
import { CustomPostType } from '../entities/CustomPostType';
// Taxonomy System entities
import { Taxonomy, Term, TermRelationship } from '../entities/Taxonomy';
// Menu System entities
import { Menu } from '../entities/Menu';
import { MenuItem } from '../entities/MenuItem';
import { MenuLocation } from '../entities/MenuLocation';
// AI Settings entity
import { AISetting } from '../entities/AISetting';
import { AiSettings } from '../entities/AiSettings';
// App System entities
import { App } from '../entities/App';
import { AppInstance } from '../entities/AppInstance';
import { AppUsageLog } from '../entities/AppUsageLog';
// Cart and Order entities
import { Cart } from '../entities/Cart';
import { CartItem } from '../entities/CartItem';
import { Order } from '../entities/Order';
// Dropshipping entities
import { Product } from '../entities/Product';
import { Supplier } from '../entities/Supplier';
import { Seller } from '../entities/Seller';
import { Partner } from '../entities/Partner';
import { SellerProduct } from '../entities/SellerProduct';
import { PartnerCommission } from '../entities/PartnerCommission';
import { BusinessInfo } from '../entities/BusinessInfo';
// Form entities
import { Form } from '../entities/Form';
import { FormSubmission } from '../entities/FormSubmission';

import { env } from '../utils/env-validator';

// 환경변수는 env-validator를 통해 가져옴
const DB_TYPE = env.getString('DB_TYPE', 'postgres');
const NODE_ENV = env.getString('NODE_ENV', 'development');

// SQLite 또는 PostgreSQL 설정
let dataSourceConfig: any;

if (DB_TYPE === 'sqlite') {
  const DB_DATABASE = env.getString('DB_DATABASE', './data/o4o_dev.sqlite');
  
  dataSourceConfig = {
    type: 'sqlite',
    database: DB_DATABASE,
  };
} else {
  // PostgreSQL 설정
  const DB_HOST = env.getString('DB_HOST');
  const DB_PORT = env.getNumber('DB_PORT');
  const DB_USERNAME = env.getString('DB_USERNAME');
  const DB_PASSWORD = env.getString('DB_PASSWORD');
  const DB_NAME = env.getString('DB_NAME');
  
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
