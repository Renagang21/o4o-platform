import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SnakeNamingStrategy } from './SnakeNamingStrategy.js';
// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Note: Environment variables are loaded by main.ts at startup
// In Cloud Run, env vars are injected via workflow (no .env files needed)

// ============================================================================
// ENTITY REGISTRY (WO-O4O-API-SERVER-CONNECTION-ENTITY-REGISTRY-SPLIT-V1)
// 전체 entity import + 등록 배열은 ./entities.ts 가 단일 출처(SSOT)다.
// connection.ts 는 DB 연결 설정만 담당한다. 신규 entity 추가는 entities.ts 에서 한다.
// ============================================================================
import { entities } from './entities.js';

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

  // 엔티티 등록 - ./entities.ts 단일 registry 참조 (등록 순서 보존)
  entities,

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
