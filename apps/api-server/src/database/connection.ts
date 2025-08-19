import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { RefreshToken } from '../entities/RefreshToken';
import { PasswordResetToken } from '../entities/PasswordResetToken';
import { EmailVerificationToken } from '../entities/EmailVerificationToken';
import { ApprovalLog } from '../entities/ApprovalLog';
import { LinkedAccount } from '../entities/LinkedAccount';
import { AccountActivity } from '../entities/AccountActivity';
import { MediaFile } from '../entities/MediaFile';
import { MediaFolder } from '../entities/MediaFolder';
import { Product } from '../entities/Product';
import { ProductAttribute } from '../entities/ProductAttribute';
import { ProductAttributeValue } from '../entities/ProductAttributeValue';
import { ProductVariation } from '../entities/ProductVariation';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Cart } from '../entities/Cart';
import { CartItem } from '../entities/CartItem';
import { Category } from '../entities/Category';
import { Settings } from '../entities/Settings';
import { Coupon, CouponUsage } from '../entities/Coupon';
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
import { Page } from '../entities/Page';
import { ReusableBlock } from '../entities/ReusableBlock';
import { BlockPattern } from '../entities/BlockPattern';
import { TemplatePart } from '../entities/TemplatePart';
import { Shipment } from '../entities/Shipment';
import { ShipmentTrackingHistory } from '../entities/ShipmentTrackingHistory';
import { SmtpSettings } from '../entities/SmtpSettings';
import { EmailLog } from '../entities/EmailLog';
import { Shortcode } from '../entities/Shortcode';
// Dropshipping entities
import { Supplier } from '../entities/dropshipping/Supplier';
import { Seller } from '../entities/dropshipping/Seller';
import { Affiliate } from '../entities/dropshipping/Affiliate';
import { DropshippingProduct } from '../entities/dropshipping/DropshippingProduct';

// 환경변수 기본값 설정
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
// DB_PASSWORD는 반드시 문자열로 처리
const DB_PASSWORD = String(process.env.DB_PASSWORD || '');
const DB_NAME = process.env.DB_NAME || 'o4o_platform';
const NODE_ENV = process.env.NODE_ENV || 'development';

// TypeORM 데이터소스 설정
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: DB_HOST,
  port: DB_PORT,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_NAME,
  
  // 개발 환경 설정
  synchronize: false, // 자동 스키마 동기화 비활성화 (마이그레이션 사용)
  logging: NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  
  // 연결 풀 설정 (CLAUDE.md 정책 기반)
  extra: {
    max: 20,           // 최대 연결 수
    min: 5,            // 최소 연결 수
    idleTimeoutMillis: 30000,  // 유휴 연결 타임아웃
    connectionTimeoutMillis: 2000, // 연결 타임아웃
  },
  
  // 엔티티 등록
  entities: NODE_ENV === 'production'
    ? ['dist/entities/**/*.js']
    : [
        User,
        RefreshToken,
        PasswordResetToken,
        EmailVerificationToken,
        ApprovalLog,
        LinkedAccount,
        AccountActivity,
        MediaFile,
        MediaFolder,
        Product,
        ProductAttribute,
        ProductAttributeValue,
        ProductVariation,
        Order,
        OrderItem,
        Cart,
        CartItem,
        Category,
        Settings,
        Coupon,
        CouponUsage,
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
        Page,
        ReusableBlock,
        BlockPattern,
        TemplatePart,
        Shipment,
        ShipmentTrackingHistory,
        SmtpSettings,
        EmailLog,
        Shortcode,
        // Dropshipping entities
        Supplier,
        Seller,
        Affiliate,
        DropshippingProduct
      ],
  
  // 마이그레이션 설정
  migrations: NODE_ENV === 'production' 
    ? ['dist/database/migrations/*.js'] 
    : ['src/database/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: false, // 자동 마이그레이션 비활성화 (수동 실행)
  
  // SSL 설정 (프로덕션 환경)
  ssl: NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  
  // 캐시 설정
  cache: {
    type: 'database',
    tableName: 'typeorm_query_cache',
    duration: 30000 // 30초 캐시
  }
});

// 데이터베이스 연결 상태 모니터링
// 주의: main.ts에서 초기화하므로 여기서는 자동 초기화하지 않음
// PM2 클러스터 모드에서 중복 초기화 방지
/*
AppDataSource.initialize()
  .then(() => {
  })
  .catch((error) => {
    console.error('❌ Database initialization failed:', error);
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
    
    return {
      status: 'connected',
      host: DB_HOST,
      port: DB_PORT,
      database: DB_NAME,
      connectionCount: (AppDataSource.driver as { pool?: { size?: number } })?.pool?.size || 0,
      maxConnections: 20,
      timestamp: new Date().toISOString()
    };
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
    console.error('❌ Error closing database connection:', error);
  }
}

// initializeDatabase function for backward compatibility
export const initializeDatabase = () => AppDataSource.initialize();

// TypeORM CLI를 위한 default export
export default AppDataSource;
