/**
 * E-commerce Core Install Lifecycle
 *
 * AppStore 설치 시 실행되는 로직
 * - 테이블 생성 (CREATE TABLE IF NOT EXISTS)
 * - 인덱스 생성
 * - 초기 데이터 설정
 */

import { DataSource } from 'typeorm';

export interface InstallContext {
  dataSource: DataSource;
  logger?: {
    info: (message: string) => void;
    error: (message: string) => void;
  };
}

export async function install(context: InstallContext): Promise<void> {
  const { dataSource, logger } = context;

  logger?.info('[ecommerce-core] Starting installation...');

  try {
    // 1. Check if tables exist, create if not
    // TypeORM synchronize handles this, but we can add custom logic here

    // 2. Create indexes if not exists
    await createCustomIndexes(dataSource, logger);

    // 3. Initialize default data if needed
    await initializeDefaultData(dataSource, logger);

    logger?.info('[ecommerce-core] Installation completed successfully');
  } catch (error) {
    logger?.error(`[ecommerce-core] Installation failed: ${error}`);
    throw error;
  }
}

async function createCustomIndexes(
  dataSource: DataSource,
  logger?: { info: (message: string) => void }
): Promise<void> {
  logger?.info('[ecommerce-core] Creating custom indexes...');

  // 복합 인덱스 생성 (필요한 경우)
  const queries = [
    // 주문 검색 최적화
    `CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_buyer_status
     ON ecommerce_orders (buyer_id, status)`,

    // 결제 검색 최적화
    `CREATE INDEX IF NOT EXISTS idx_ecommerce_payments_order_status
     ON ecommerce_payments (order_id, status)`,
  ];

  for (const query of queries) {
    try {
      await dataSource.query(query);
    } catch (error) {
      // Index already exists or other non-critical error
      logger?.info(`[ecommerce-core] Index creation skipped: ${error}`);
    }
  }
}

async function initializeDefaultData(
  dataSource: DataSource,
  logger?: { info: (message: string) => void }
): Promise<void> {
  logger?.info('[ecommerce-core] Initializing default data...');

  // 기본 데이터 초기화 (필요한 경우)
  // 예: 기본 설정값 등
}

export default install;
