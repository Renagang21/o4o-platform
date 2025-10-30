/**
 * Database Health Checker
 * 데이터베이스 연결 상태와 필수 테이블을 체크합니다.
 */

import { DataSource } from 'typeorm';
import { env } from './env-validator.js';
import logger from './logger.js';

export class DatabaseChecker {
  private dataSource: DataSource;
  private requiredTables = [
    'users',
    'settings',
  ];
  
  private optionalTables = [
    'products',
    'orders',
    'categories',
    'inventory',
    'coupons',
    'themes',
    'posts',
    'pages',
  ];

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  /**
   * 데이터베이스 연결 체크
   */
  async checkConnection(): Promise<boolean> {
    try {
      if (!this.dataSource.isInitialized) {
        logger.info('Initializing database connection...');
        await this.dataSource.initialize();
      }
      
      // Test query
      await this.dataSource.query('SELECT 1');
      logger.info('✅ Database connection successful');
      return true;
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      return false;
    }
  }

  /**
   * 필수 테이블 체크
   */
  async checkRequiredTables(): Promise<{
    success: boolean;
    missing: string[];
  }> {
    const missing: string[] = [];
    
    for (const table of this.requiredTables) {
      const exists = await this.tableExists(table);
      if (!exists) {
        missing.push(table);
      }
    }
    
    if (missing.length > 0) {
      logger.warn(`⚠️ Missing required tables: ${missing.join(', ')}`);
    } else {
      logger.info('✅ All required tables exist');
    }
    
    return {
      success: missing.length === 0,
      missing
    };
  }

  /**
   * 선택적 테이블 체크
   */
  async checkOptionalTables(): Promise<{
    existing: string[];
    missing: string[];
  }> {
    const existing: string[] = [];
    const missing: string[] = [];
    
    for (const table of this.optionalTables) {
      const exists = await this.tableExists(table);
      if (exists) {
        existing.push(table);
      } else {
        missing.push(table);
      }
    }
    
    if (missing.length > 0) {
      logger.info(`ℹ️ Optional tables not found: ${missing.join(', ')}`);
    }
    
    return { existing, missing };
  }

  /**
   * 테이블 존재 여부 체크
   */
  private async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.dataSource.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tableName]
      );
      
      return result[0]?.exists || false;
    } catch (error) {
      logger.error(`Error checking table ${tableName}:`, error);
      return false;
    }
  }

  /**
   * 마이그레이션 상태 체크
   */
  async checkMigrations(): Promise<{
    executed: number;
    pending: string[];
  }> {
    try {
      // Check if migrations table exists
      const migrationsTableExists = await this.tableExists('typeorm_migrations');
      
      if (!migrationsTableExists) {
        logger.warn('⚠️ Migrations table does not exist');
        return { executed: 0, pending: [] };
      }
      
      // Get executed migrations
      const executedMigrations = await this.dataSource.query(
        'SELECT name FROM typeorm_migrations ORDER BY id'
      );
      
      logger.info(`✅ Executed migrations: ${executedMigrations.length}`);
      
      return {
        executed: executedMigrations.length,
        pending: [] // TODO: Compare with available migrations
      };
    } catch (error) {
      logger.error('Error checking migrations:', error);
      return { executed: 0, pending: [] };
    }
  }

  /**
   * 전체 헬스 체크
   */
  async performHealthCheck(): Promise<{
    healthy: boolean;
    details: {
      connection: boolean;
      requiredTables: {
        success: boolean;
        missing: string[];
      };
      optionalTables: {
        existing: string[];
        missing: string[];
      };
      migrations: {
        executed: number;
        pending: string[];
      };
    };
  }> {
    logger.info('🏥 Starting database health check...');
    
    const connection = await this.checkConnection();
    
    if (!connection) {
      return {
        healthy: false,
        details: {
          connection: false,
          requiredTables: { success: false, missing: [] },
          optionalTables: { existing: [], missing: [] },
          migrations: { executed: 0, pending: [] }
        }
      };
    }
    
    const requiredTables = await this.checkRequiredTables();
    const optionalTables = await this.checkOptionalTables();
    const migrations = await this.checkMigrations();
    
    const healthy = connection && requiredTables.success;
    
    if (healthy) {
      logger.info('✅ Database health check passed');
    } else {
      logger.error('❌ Database health check failed');
    }
    
    return {
      healthy,
      details: {
        connection,
        requiredTables,
        optionalTables,
        migrations
      }
    };
  }

  /**
   * 테이블 생성 시도 (개발 환경에서만)
   */
  async tryCreateMissingTables(): Promise<void> {
    if (!env.isDevelopment()) {
      logger.warn('Table auto-creation is only available in development mode');
      return;
    }
    
    try {
      logger.info('Attempting to synchronize database schema...');
      await this.dataSource.synchronize();
      logger.info('✅ Database schema synchronized');
    } catch (error) {
      logger.error('Failed to synchronize database schema:', error);
    }
  }
}