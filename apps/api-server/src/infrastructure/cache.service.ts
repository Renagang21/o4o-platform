/**
 * Cache Service — RedisGuard 기반 JSON 캐시 레이어
 *
 * WO-INFRA-REDIS-FOUNDATION-V1
 *
 * 원칙:
 * - Redis 장애 시 throw 금지 → null 반환 (DB fallback)
 * - JSON 직렬화/역직렬화 내부 처리
 * - TTL 필수 (무기한 캐시 금지)
 * - getRedisClient() lazy 연결 재사용
 */

import { getRedisClient, isRedisAvailable } from './redis.guard.js';
import logger from '../utils/logger.js';

/**
 * 캐시에서 값 조회
 * Redis 미사용/장애 시 null 반환
 */
export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  if (!isRedisAvailable()) return null;

  try {
    const client = getRedisClient();
    if (!client) return null;

    const raw = await client.get(key);
    if (!raw) return null;

    return JSON.parse(raw) as T;
  } catch (error: any) {
    logger.warn(`[CacheService] get(${key}) failed:`, { error: error.message });
    return null;
  }
}

/**
 * 캐시에 값 저장
 * @param ttlSeconds TTL 초 (필수, 무기한 금지)
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
  if (!isRedisAvailable()) return false;

  try {
    const client = getRedisClient();
    if (!client) return false;

    const serialized = JSON.stringify(value);
    await client.set(key, serialized, 'EX', ttlSeconds);
    return true;
  } catch (error: any) {
    logger.warn(`[CacheService] set(${key}) failed:`, { error: error.message });
    return false;
  }
}

/**
 * 캐시 키 삭제
 */
export async function cacheDel(key: string): Promise<boolean> {
  if (!isRedisAvailable()) return false;

  try {
    const client = getRedisClient();
    if (!client) return false;

    await client.del(key);
    return true;
  } catch (error: any) {
    logger.warn(`[CacheService] del(${key}) failed:`, { error: error.message });
    return false;
  }
}

/**
 * 캐시 조회 or 생성 (Cache-Aside 패턴)
 * 캐시 hit → 캐시 값 반환
 * 캐시 miss → factory 실행 → 결과 캐시 저장 → 반환
 */
export async function cacheGetOrSet<T>(
  key: string,
  ttlSeconds: number,
  factory: () => Promise<T>,
): Promise<T> {
  // 캐시 조회 시도
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // 캐시 miss → DB 조회
  const result = await factory();

  // 비동기 캐시 저장 (실패해도 무시)
  cacheSet(key, result, ttlSeconds).catch(() => {});

  return result;
}
