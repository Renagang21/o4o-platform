import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { MediaFile } from '../entities/MediaFile';
import { MediaFolder } from '../entities/MediaFolder';
// Temporarily disabled problematic entities due to OneDrive sync issues
// import { BetaUser } from '../entities/BetaUser';
// import { AnalyticsReport } from '../entities/AnalyticsReport';
// import { Alert } from '../entities/Alert';
// import { BetaFeedback } from '../entities/BetaFeedback';
// import { FeedbackConversation } from '../entities/FeedbackConversation';
// import { ForumCategory } from '../entities/ForumCategory';
// import { ForumComment } from '../entities/ForumComment';
// import { ForumPost } from '../entities/ForumPost';
// import { ForumTag } from '../entities/ForumTag';
// import { OperationsDashboard } from '../entities/OperationsDashboard';
// import { Payment } from '../entities/Payment';
// import { PricePolicy } from '../entities/PricePolicy';
// import { StatusPage } from '../entities/StatusPage';
// import { SystemMetrics } from '../entities/SystemMetrics';
// import { UserAction } from '../entities/UserAction';
// import { UserSession } from '../entities/UserSession';

// 환경변수 기본값 설정
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_USERNAME = process.env.DB_USERNAME || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
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
  synchronize: NODE_ENV === 'development', // 개발 시에만 자동 스키마 동기화
  logging: NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  
  // 연결 풀 설정 (CLAUDE.md 정책 기반)
  extra: {
    max: 20,           // 최대 연결 수
    min: 5,            // 최소 연결 수
    idleTimeoutMillis: 30000,  // 유휴 연결 타임아웃
    connectionTimeoutMillis: 2000, // 연결 타임아웃
  },
  
  // 엔티티 등록 (temporarily minimal for OneDrive sync issues)
  entities: [
    User,
    MediaFile,
    MediaFolder,
    // BetaUser,
    // AnalyticsReport,
    // Alert,
    // BetaFeedback,
    // FeedbackConversation,
    // ForumCategory,
    // ForumComment,
    // ForumPost,
    // ForumTag,
    // OperationsDashboard,
    // Payment,
    // PricePolicy,
    // StatusPage,
    // SystemMetrics,
    // UserAction,
    // UserSession
  ],
  
  // 마이그레이션 설정
  migrations: [
    'src/database/migrations/*.ts'
  ],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: NODE_ENV === 'production', // 프로덕션에서 자동 마이그레이션 실행
  
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
AppDataSource.initialize()
  .then(() => {
    console.log('📊 Database Configuration:');
    console.log(`   Host: ${DB_HOST}:${DB_PORT}`);
    console.log(`   Database: ${DB_NAME}`);
    console.log(`   Username: ${DB_USERNAME}`);
    console.log(`   Environment: ${NODE_ENV}`);
    console.log(`   Synchronize: ${NODE_ENV === 'development'}`);
    console.log(`   Connection Pool: min ${5}, max ${20}`);
    console.log('✅ Database initialized successfully');
  })
  .catch((error) => {
    console.error('❌ Database initialization failed:', error);
  });

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
      connectionCount: (AppDataSource.driver as any)?.pool?.size || 0,
      maxConnections: 20,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
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
      console.log('✅ Database connection closed gracefully');
    }
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}

// 기본 내보내기
export default AppDataSource;

// initializeDatabase function for backward compatibility
export const initializeDatabase = () => AppDataSource.initialize();