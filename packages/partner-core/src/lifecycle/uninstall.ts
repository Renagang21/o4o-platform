/**
 * Partner Core - Uninstall Lifecycle Hook
 *
 * 앱 제거 시 실행되는 로직
 * - 모든 Extension Hooks 정리
 * - 데이터 정리 (선택적)
 *
 * 주의: 프로덕션 환경에서는 데이터 삭제를 수행하지 않습니다.
 *
 * @package @o4o/partner-core
 */

import { DataSource } from 'typeorm';
import { clearAllPartnerExtensions } from '../partner-extension.js';

export interface UninstallContext {
  dataSource: DataSource;
  logger?: {
    info: (message: string) => void;
    error: (message: string) => void;
    warn: (message: string) => void;
  };
  options?: {
    removeData?: boolean; // 데이터 삭제 여부 (기본: false)
  };
}

export async function uninstall(context: UninstallContext): Promise<void> {
  const { dataSource, logger, options } = context;

  logger?.info('Partner Core: Starting uninstallation...');

  try {
    // 모든 Extension Hooks 정리
    clearAllPartnerExtensions();
    logger?.info('Partner Core: All extension hooks cleared');

    // 데이터 삭제 (옵션이 명시적으로 true인 경우에만)
    if (options?.removeData === true) {
      if (process.env.NODE_ENV === 'production') {
        logger?.warn(
          'Partner Core: Data removal is disabled in production environment'
        );
      } else {
        logger?.warn('Partner Core: Removing partner data...');

        // 테이블 삭제 순서 (외래키 관계 고려)
        const tablesToDrop = [
          'partner_commissions',
          'partner_settlement_batches',
          'partner_conversions',
          'partner_clicks',
          'partner_links',
          'partners',
        ];

        for (const table of tablesToDrop) {
          try {
            await dataSource.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
            logger?.info(`Partner Core: Dropped table ${table}`);
          } catch (error) {
            logger?.error(`Partner Core: Failed to drop table ${table} - ${error}`);
          }
        }

        logger?.info('Partner Core: Data removal completed');
      }
    }

    logger?.info('Partner Core: Uninstallation completed successfully');
  } catch (error) {
    logger?.error(`Partner Core: Uninstallation failed - ${error}`);
    throw error;
  }
}

export default uninstall;
