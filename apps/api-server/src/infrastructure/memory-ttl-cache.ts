/**
 * Memory TTL Cache — in-process 캐시 (Redis 대체)
 *
 * WO-O4O-REDIS-SESSIONSYNC-REMOVAL-AND-MEMORYSTORE-DECOMMISSION-V1
 *
 * Memorystore 폐기에 따라 read-cache / cache.service 의 백엔드를 in-process 로 바꾼다.
 *
 * Redis 대비 달라지는 점 (의도된 것):
 * - 인스턴스 간 공유가 없다 → 인스턴스마다 독립 캐시. 캐시 미스가 늘 뿐 정합성 문제는 없다
 *   (기존에도 TTL-only · 능동 무효화 없음이라 stale 허용 폭은 동일하다).
 * - 프로세스 재시작 시 비워진다.
 *
 * 상한을 두어 메모리 누수를 막는다.
 */

interface Entry {
  value: string;
  expiresAt: number;
}

const MAX_ENTRIES = 5000;
const store = new Map<string, Entry>();

function prune(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
  // 여전히 상한을 넘으면 오래된 순(삽입 순)으로 버린다
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
  }
}

export function memoryCacheGet(key: string): string | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function memoryCacheSet(key: string, value: string, ttlSeconds: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  if (store.size > MAX_ENTRIES) prune();
}

export function memoryCacheDel(key: string): void {
  store.delete(key);
}

/** 테스트/진단용 */
export function memoryCacheSize(): number {
  return store.size;
}
