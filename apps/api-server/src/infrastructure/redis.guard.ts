/**
 * Redis Connection Guard
 *
 * GRACEFUL_STARTUP 정책을 적용한 중앙화된 Redis 연결 관리자
 *
 * 핵심 원칙:
 * 1. Import 시점에 절대 네트워크 연결 시도 금지
 * 2. 모든 Redis 접근은 이 단일 진입점으로 통합
 * 3. 연결 실패 시 throw/process.exit 금지, null 반환
 * 4. GRACEFUL_STARTUP=true(기본값)면 서버는 항상 기동
 *
 * @module infrastructure/redis.guard
 */

import Redis from 'ioredis';
import logger from '../utils/logger.js';

// Redis 클라이언트 인스턴스 (lazy 초기화)
let _mainClient: Redis | null = null;
let _subClient: Redis | null = null;
let _queueClient: Redis | null = null;

// 연결 상태 추적
let _connectionAttempted = false;
let _connectionFailed = false;

/**
 * GRACEFUL_STARTUP 정책 확인
 * 기본값: true (안전 모드)
 */
function isGracefulStartup(): boolean {
  return process.env.GRACEFUL_STARTUP !== 'false';
}

/**
 * Redis 연결이 가능한지 확인
 * REDIS_HOST가 설정되어 있어야 연결 시도
 */
function isRedisConfigured(): boolean {
  return !!process.env.REDIS_HOST;
}

/**
 * Redis 클라이언트 생성 (내부용)
 * lazyConnect와 error handler가 항상 적용됨
 */
function createRedisClient(purpose: string): Redis | null {
  if (!isRedisConfigured()) {
    logger.info(`[RedisGuard] Redis not configured, ${purpose} client disabled`);
    return null;
  }

  try {
    const client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      // 핵심: lazyConnect로 즉시 연결 방지
      lazyConnect: true,
      // BullMQ 호환성
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      // 재시도 전략
      retryStrategy: (times) => {
        if (isGracefulStartup() && times > 3) {
          logger.warn(`[RedisGuard] ${purpose}: Connection retries exhausted, giving up`);
          _connectionFailed = true;
          return null; // 재시도 중단
        }
        return Math.min(times * 500, 3000);
      },
    });

    // 에러 핸들러 필수 등록 (unhandled error 방지)
    client.on('error', (error: Error) => {
      logger.error(`[RedisGuard] ${purpose} error:`, { error: error.message });
      _connectionFailed = true;
      // 절대 throw하지 않음
    });

    client.on('connect', () => {
      logger.info(`[RedisGuard] ${purpose} connected successfully`);
      _connectionFailed = false;
    });

    client.on('close', () => {
      logger.warn(`[RedisGuard] ${purpose} connection closed`);
    });

    return client;
  } catch (error: any) {
    logger.error(`[RedisGuard] Failed to create ${purpose} client:`, { error: error.message });
    if (isGracefulStartup()) {
      return null;
    }
    throw error;
  }
}

/**
 * 메인 Redis 클라이언트 (lazy)
 * 일반 캐싱, 세션 등에 사용
 */
export function getRedisClient(): Redis | null {
  if (!_mainClient) {
    _mainClient = createRedisClient('main');
  }
  return _mainClient;
}

/**
 * Pub/Sub용 Redis 클라이언트 (lazy)
 * 이벤트 구독에 사용
 */
export function getRedisSubClient(): Redis | null {
  if (!_subClient) {
    _subClient = createRedisClient('subscriber');
  }
  return _subClient;
}

/**
 * Queue용 Redis 클라이언트 (lazy)
 * BullMQ Queue/Worker에 사용
 * BullMQ는 connection 객체를 요구하므로 null이면 사용 불가
 */
export function getQueueRedisClient(): Redis | null {
  if (!_queueClient) {
    _queueClient = createRedisClient('queue');
  }
  return _queueClient;
}

/**
 * Queue용 Redis 연결 복제
 * BullMQ QueueEvents 등에서 사용
 */
export function duplicateQueueConnection(): Redis | null {
  const client = getQueueRedisClient();
  if (!client) return null;

  try {
    return client.duplicate();
  } catch (error: any) {
    logger.error('[RedisGuard] Failed to duplicate queue connection:', { error: error.message });
    return null;
  }
}

/**
 * Redis 연결 상태 확인
 */
export function getRedisStatus(): {
  configured: boolean;
  connected: boolean;
  failed: boolean;
  gracefulStartup: boolean;
} {
  return {
    configured: isRedisConfigured(),
    connected: _mainClient?.status === 'ready' || false,
    failed: _connectionFailed,
    gracefulStartup: isGracefulStartup(),
  };
}

/**
 * 모든 Redis 연결 정리 (graceful shutdown)
 */
export async function closeAllRedisConnections(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  if (_mainClient) {
    closePromises.push(
      _mainClient.quit().catch(err => {
        logger.error('[RedisGuard] Error closing main client:', err);
      }).then(() => { _mainClient = null; })
    );
  }

  if (_subClient) {
    closePromises.push(
      _subClient.quit().catch(err => {
        logger.error('[RedisGuard] Error closing sub client:', err);
      }).then(() => { _subClient = null; })
    );
  }

  if (_queueClient) {
    closePromises.push(
      _queueClient.quit().catch(err => {
        logger.error('[RedisGuard] Error closing queue client:', err);
      }).then(() => { _queueClient = null; })
    );
  }

  await Promise.all(closePromises);
  logger.info('[RedisGuard] All Redis connections closed');
}

/**
 * Redis가 사용 가능한지 확인 (optional feature guard)
 * Redis 없이도 동작해야 하는 기능에서 사용
 */
export function isRedisAvailable(): boolean {
  if (!isRedisConfigured()) return false;
  if (_connectionFailed) return false;

  const client = getRedisClient();
  return client?.status === 'ready';
}

// =============================================================================
// 기본 export (backwards compatibility)
// =============================================================================

// 주의: 이 export들은 lazy getter이므로 import 시점에 연결하지 않음
export const redisGuard = {
  getClient: getRedisClient,
  getSubClient: getRedisSubClient,
  getQueueClient: getQueueRedisClient,
  duplicateQueueConnection,
  getStatus: getRedisStatus,
  closeAll: closeAllRedisConnections,
  isAvailable: isRedisAvailable,
};

export default redisGuard;
