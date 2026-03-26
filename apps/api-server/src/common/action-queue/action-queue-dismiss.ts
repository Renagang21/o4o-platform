/**
 * Action Queue — Dismiss Tracking
 *
 * WO-O4O-OPERATOR-ACTION-LAYER-V1
 *
 * 사용자별/서비스별 dismiss 상태를 operator_action_dismissals 테이블에서 조회.
 */

import type { DataSource } from 'typeorm';
import logger from '../../utils/logger.js';

export async function getDismissedActionIds(
  dataSource: DataSource,
  userId: string,
  serviceKey: string,
): Promise<Set<string>> {
  try {
    const rows = await dataSource.query(
      `SELECT action_id FROM operator_action_dismissals
       WHERE user_id = $1 AND service_key = $2`,
      [userId, serviceKey],
    );
    return new Set(rows.map((r: any) => r.action_id));
  } catch {
    // 테이블 없는 경우 graceful fallback
    logger.warn(`[ActionQueue Dismiss] Failed to fetch dismissed actions for ${serviceKey}`);
    return new Set();
  }
}
