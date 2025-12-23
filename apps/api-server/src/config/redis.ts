/**
 * Redis Configuration
 *
 * Phase 2.5: GRACEFUL_STARTUP 호환
 * - Import 시점에 연결하지 않음
 * - redis.guard.ts를 통한 lazy 초기화
 */

import { getRedisClient, getRedisSubClient, closeAllRedisConnections } from '../infrastructure/redis.guard.js';
import logger from '../utils/logger.js';

// Lazy getter로 Redis 클라이언트 제공
// 이 export들은 호출 시점에 연결 시도
export const redis = {
  get client() {
    return getRedisClient();
  },
};

export const redisSub = {
  get client() {
    return getRedisSubClient();
  },
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('[Redis] SIGINT received, closing connections...');
  await closeAllRedisConnections();
});

process.on('SIGTERM', async () => {
  logger.info('[Redis] SIGTERM received, closing connections...');
  await closeAllRedisConnections();
});

// Default export for backwards compatibility
export default redis;
