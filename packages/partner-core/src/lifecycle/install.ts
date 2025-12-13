/**
 * Partner Core - Install Lifecycle Hook
 *
 * 앱 설치 시 실행되는 로직
 * - DB 테이블 생성 (마이그레이션)
 * - 초기 데이터 설정
 *
 * @package @o4o/partner-core
 */

import { DataSource } from 'typeorm';
import { partnerEntities } from '../entities/index.js';

export interface InstallContext {
  dataSource: DataSource;
  logger?: {
    info: (message: string) => void;
    error: (message: string) => void;
  };
}

export async function install(context: InstallContext): Promise<void> {
  const { dataSource, logger } = context;

  logger?.info('Partner Core: Starting installation...');

  try {
    // Entity 동기화 (개발 환경에서만, 프로덕션은 마이그레이션 사용)
    if (process.env.NODE_ENV === 'development') {
      logger?.info('Partner Core: Synchronizing entities...');

      // Entity 메타데이터 확인
      const entityMetadatas = partnerEntities.map((entity) => {
        return dataSource.getMetadata(entity);
      });

      logger?.info(
        `Partner Core: Found ${entityMetadatas.length} entities to synchronize`
      );

      // 테이블 생성 (이미 있으면 스킵)
      await dataSource.synchronize(false);

      logger?.info('Partner Core: Entity synchronization completed');
    }

    logger?.info('Partner Core: Installation completed successfully');
  } catch (error) {
    logger?.error(`Partner Core: Installation failed - ${error}`);
    throw error;
  }
}

export default install;
