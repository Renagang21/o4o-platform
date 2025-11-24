# 📄 R-8-7 Caching Strategy Documentation

**작성일:** 2025-11-24
**작성자:** Development Team
**대상 시스템:** O4O Platform API Server
**관련 태스크:** R-8-7 성능 점검 & 캐싱 최적화

---

## 1. 개요 (Overview)

본 문서는 O4O Platform API 서버가 사용하는 **캐싱 전략(Cache Strategy)** 전반을 기술한 내부 기술 문서입니다.

캐싱 엔진, TTL 정책, 캐시 키 구조, 캐시 무효화 정책, 적용 대상 API, 장애 대비 전략을 모두 포함하여, 개발·운영팀이 캐싱 동작을 정확하게 이해하고 유지보수할 수 있도록 구성하였습니다.

본 문서는 R-8-7 작업(Performance Audit & Caching Optimization)의 최종 산출물로, 시스템의 성능 향상 및 안정적 운영을 위한 기준 문서 역할을 합니다.

---

## 2. 캐시 엔진 구조

O4O API 서버는 다음의 **2단 캐싱 구조(dual-level cache architecture)**를 채택합니다:

### 2.1 Level 1 — In-Memory Cache (MemoryCacheService)

- **node-cache** 기반
- 초고속 접근 (ns~µs 수준)
- 장애 영향 없음
- 서버 개별 인스턴스 캐시 → 분산 환경에서는 일관성 이슈 있음

→ Redis 장애 시 fallback 용도로 활용

**구현 위치:** `apps/api-server/src/cache/MemoryCacheService.ts`

---

### 2.2 Level 2 — Redis Distributed Cache (RedisCacheService)

- **ioredis** 기반
- 캐시의 **SSOT** (Single Source Of Truth)
- 분산 환경에서도 일관성 유지
- TTL 기반 자동 정리
- 캐시 무효화(Invalidation)에 즉각 반응

현재 운영 환경에서는 **Redis 사용 전제(기본)**이며, 장애 시 자동으로 MemoryCache로 전환됩니다.

**구현 위치:** `apps/api-server/src/cache/RedisCacheService.ts`

---

## 3. 캐시 TTL 정책

캐시 TTL(Time to Live)은 4단계로 구성됩니다.

| 정책 | TTL (초) | 용도 | 적용 API |
|------|---------|------|----------|
| **short** | 60초 | Dashboard summary | Seller/Supplier Dashboard |
| **medium** | 300초 | Settlement Summary | Commission Summary APIs |
| **long** | 3600초 | Batch 계산, 사전 준비 통계 | Pre-computed data |
| **day** | 86400초 | 설정 값, lookup tables | Configuration APIs |

→ TTL은 `cache.config.ts`에서 중앙 관리됨.

**환경변수 설정:**
```bash
CACHE_TTL_SHORT=60      # 1분
CACHE_TTL_MEDIUM=300    # 5분
CACHE_TTL_LONG=3600     # 1시간
CACHE_TTL_DAY=86400     # 24시간
```

**구현 위치:** `apps/api-server/src/cache/cache.config.ts`

---

## 4. 캐시 키 설계 (Cache Key Architecture)

캐시 키는 **패턴 기반 설계**로 구성되어 있으며 다음 5가지 원칙을 따릅니다:

### 📌 원칙 1 — Prefix 기반 네임스페이스

```typescript
dashboard:seller:${sellerId}:summary
dashboard:supplier:${supplierId}:summary
settlement:seller:${sellerId}:commission:${from}:${to}
settlement:supplier:${supplierId}:commission:${from}:${to}
settlement:summary:${partyType}:${partyId}
```

### 📌 원칙 2 — 날짜 범위는 ISO 날짜 문자열로 통일

```typescript
// From cache.config.ts
generateRangeKey(dateRange?: { from?: Date; to?: Date }): string {
  if (!dateRange?.from && !dateRange?.to) return 'all';
  const fromStr = dateRange.from?.toISOString().split('T')[0] || '2020-01-01';
  const toStr = dateRange.to?.toISOString().split('T')[0] || 'now';
  return `${fromStr}_${toStr}`;
}
```

### 📌 원칙 3 — API 유형 구분

```
:summary      # 요약 통계
:commission   # 커미션 데이터
:orders       # 주문 목록
```

### 📌 원칙 4 — 캐시 충돌 방지

항상 sellerId/supplierId/partyId 포함하여 파티별로 격리

### 📌 원칙 5 — 쉬운 무효화

패턴 기반 invalidation 가능하도록 설계

**예시:**
```typescript
// 특정 seller의 모든 캐시 삭제
cacheService.deletePattern(`*:seller:${sellerId}:*`)

// 특정 supplier의 모든 캐시 삭제
cacheService.deletePattern(`*:supplier:${supplierId}:*`)
```

**전체 캐시 키 목록:** `apps/api-server/src/cache/cache.config.ts` 참조

---

## 5. 캐시 적용 대상 API 목록

### 5.1 Dashboard API (Step 3 적용)

#### Seller Dashboard
- **getSummaryForSeller()** → 60초 TTL
  - 경로: `apps/api-server/src/services/SellerDashboardService.ts:74-149`
  - 캐시 키: `dashboard:seller:${sellerId}:summary`
  - 측정 지표: totalOrders, totalRevenue, totalCommission, averageOrderValue

- **getOrdersForSeller()** → (향후 페이지별 캐싱 고려)
  - 경로: `apps/api-server/src/services/SellerDashboardService.ts:159-302`

#### Supplier Dashboard
- **getSummaryForSupplier()** → 60초 TTL
  - 경로: `apps/api-server/src/services/SupplierDashboardService.ts`
  - 캐시 키: `dashboard:supplier:${supplierId}:summary`

---

### 5.2 Settlement API (Step 4 적용)

#### Settlement Summary
- **getSettlementSummary()** → 300초 TTL
  - 경로: `apps/api-server/src/services/SettlementReadService.ts:343-428`
  - 캐시 키: `settlement:summary:${partyType}:${partyId}:${rangeKey}`
  - 집계 데이터: totalPending, totalPaid, totalProcessing, settlementCount

#### Commission Summary
- **getSellerCommissionSummary()** → 300초 TTL
  - 경로: `apps/api-server/src/services/SettlementReadService.ts:92-213`
  - 캐시 키: `settlement:seller:${sellerId}:commission:${from}:${to}`
  - 집계 데이터: totalCommission, totalSales, averageCommissionRate

- **getSupplierCommissionSummary()** → 300초 TTL
  - 경로: `apps/api-server/src/services/SettlementReadService.ts:222-336`
  - 캐시 키: `settlement:supplier:${supplierId}:commission:${from}:${to}`
  - 집계 데이터: totalRevenue, totalMargin, revenueByOrder

---

## 6. 캐시 무효화 정책 (Cache Invalidation Policy)

R-8-7 Step 5에서 모든 핵심 API 이벤트에 캐시 무효화가 연결되어 있으며, 다음의 원칙을 따릅니다:

### 6.1 무효화 이벤트 목록

#### ① 주문 생성 (createOrder)
**트리거:** `OrderService.createOrder()` 완료 시
**무효화 대상:**
- Seller dashboard summary: 모든 주문 항목의 sellerId
- Supplier dashboard summary: 모든 주문 항목의 supplierId

**구현 위치:** `apps/api-server/src/services/OrderService.ts:179-189`

```typescript
const sellerIds = new Set<string>();
const supplierIds = new Set<string>();
for (const item of request.items) {
  if (item.sellerId) sellerIds.add(item.sellerId);
  if (item.supplierId) supplierIds.add(item.supplierId);
}
invalidateOrderRelatedCaches(Array.from(sellerIds), Array.from(supplierIds));
```

---

#### ② 주문 상태 변경 (updateOrderStatus)
**트리거:** `OrderService.updateOrderStatus()` 완료 시
**무효화 대상:**
- Seller summary
- Supplier summary
- Settlement summary (배송완료 → 정산 영향)

**구현 위치:** `apps/api-server/src/services/OrderService.ts:428-439`

```typescript
const sellerIds = new Set<string>();
const supplierIds = new Set<string>();
if (order.itemsRelation) {
  for (const item of order.itemsRelation) {
    if (item.sellerId) sellerIds.add(item.sellerId);
    if (item.supplierId) supplierIds.add(item.supplierId);
  }
  invalidateOrderRelatedCaches(Array.from(sellerIds), Array.from(supplierIds));
}
```

---

#### ③ 주문 취소 (cancelOrder)
**트리거:** `OrderService.cancelOrder()` 완료 시
**무효화 대상:**
- Seller summary 삭제
- Supplier summary 삭제
- Settlement summary 삭제

**구현 위치:** `apps/api-server/src/services/OrderService.ts:566-577`

---

#### ④ 정산 생성 (createSettlement)
**트리거:** `SettlementManagementService.createSettlement()` 완료 시
**무효화 대상:**
- Settlement summary
- Seller commission summary
- Supplier commission summary

**구현 위치:** `apps/api-server/src/services/SettlementManagementService.ts:333-336`

```typescript
invalidateSettlementCache(partyType, partyId).catch((err) => {
  logger.error('[R-8-7] Failed to invalidate settlement cache:', err);
});
```

---

#### ⑤ 배치 정산 (batchCreateSettlements)
**트리거:** 월별 배치 정산 실행 시
**무효화 대상:**
- 모든 seller settlement summary
- 모든 supplier settlement summary
- Platform settlement summary

**구현 위치:** `apps/api-server/src/services/SettlementManagementService.ts:653-677`

---

### 6.2 구현 방식

**캐시 무효화 헬퍼 위치:** `apps/api-server/src/utils/cache-invalidation.ts`

```typescript
// 제공되는 무효화 함수
export async function invalidateSellerCache(sellerId: string): Promise<void>
export async function invalidateSupplierCache(supplierId: string): Promise<void>
export async function invalidateSettlementCache(partyType: string, partyId: string): Promise<void>
export async function invalidateDashboardCache(partyType: string, partyId: string): Promise<void>
export async function invalidateAllByPattern(pattern: string): Promise<void>

// 헬퍼 함수
export async function invalidateMultipleSellerCaches(sellerIds: string[]): Promise<void>
export async function invalidateMultipleSupplierCaches(supplierIds: string[]): Promise<void>
export async function invalidateOrderRelatedCaches(sellerIds: string[], supplierIds: string[]): Promise<void>
```

→ 모든 무효화 함수가 패턴 기반으로 구현되어 있어 확장성 ✨

---

## 7. 장애 대비 전략 (Fault Tolerance)

캐싱 시스템은 장애 발생 시 다음 방식으로 자동 복구됩니다.

### 7.1 Redis 장애 시

**동작:**
1. RedisCacheService 실패 감지
2. 자동으로 MemoryCacheService로 fallback
3. 경고 로그 출력: `[CacheService] Failed to initialize cache service, falling back to memory cache`
4. 성능은 유지되나 분산 환경에서 일관성은 감소할 수 있음

**구현 위치:** `apps/api-server/src/cache/CacheService.ts:31-42`

```typescript
try {
  if (config.type === 'redis') {
    cacheServiceInstance = new RedisCacheService(config);
    logger.info('[CacheService] Redis cache service initialized');
  } else {
    cacheServiceInstance = new MemoryCacheService(config);
    logger.info('[CacheService] Memory cache service initialized');
  }
} catch (error) {
  logger.error('[CacheService] Failed to initialize cache service, falling back to memory cache', error);
  cacheServiceInstance = new MemoryCacheService(config);
}
```

---

### 7.2 MemoryCache 장애 시

- node-cache 특성상 서비스 영향 거의 없음
- TTL 만료로 자동 정리
- 재시작 시 캐시 초기화 (메모리 기반이므로 당연)

---

### 7.3 캐시 무효화 실패 시

**동작:**
- API 서버는 최신 DB 데이터를 항상 우선 취급
- 캐시 조회 실패 → 자동 MISS → 최신 데이터 재계산
- 재계산된 데이터는 캐시에 재저장됨

**구현 패턴:**
```typescript
export async function cachedOperation<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cacheService = getCacheService();

  try {
    const cached = await cacheService.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch data
    const data = await fetchFn();

    // Store in cache
    await cacheService.set(key, data, ttl);

    return data;
  } catch (error) {
    logger.error(`[CacheService] Error in cached operation for key: ${key}`, error);
    // Fall back to direct fetch on error
    return fetchFn();
  }
}
```

---

## 8. 운영 시 모니터링 항목

운영자는 다음 항목을 지속적으로 모니터링해야 합니다.

### 8.1 Cache HIT/MISS 비율

**모니터링 엔드포인트:**
```bash
GET /api/dev/perf/summary
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRequests": 1000,
    "averageResponseTime": 150,
    "slowRequests": 5,
    "cacheStats": {
      "type": "redis",
      "keys": 45,
      "hits": 700,
      "misses": 300,
      "hitRate": 0.7
    }
  }
}
```

**정상 구간:**
- HIT Rate: 70% 이상
- MISS Rate: 30% 이하

**경고:**
- HIT Rate < 40% → TTL 조정 또는 캐시 경로 점검 필요

---

### 8.2 Slow Query 로그

**모니터링 엔드포인트:**
```bash
GET /api/dev/perf/slow-queries
```

**정상 동작:**
- 매일 점검
- 정산 관련 JOIN이 가장 많은 부하를 발생시킴
- Slow query threshold: 1000ms (1초)

**구현 위치:** `apps/api-server/src/utils/performance.ts`

---

### 8.3 Dashboard Summary 캐시 재연산 빈도

**로그 패턴:**
```
[SellerDashboardService] Cache HIT for summary: {sellerId}
[SellerDashboardService] Cached summary for: {sellerId}
```

**주의사항:**
- Seller/Supplier summary가 지나치게 자주 재연산되면 invalidation 이벤트 과다 발생 가능성
- 주문 생성/변경이 많은 시간대에는 정상
- 야간에도 빈번하면 TTL 또는 무효화 로직 점검 필요

---

## 9. 향후 캐싱 아키텍처 개선 로드맵

### 9.1 Redis Cluster 전환
- **목적:** 대규모 운영 대비, 고가용성 확보
- **예상 시점:** 월 거래액 10억원 이상 시
- **구현 복잡도:** Medium

### 9.2 Keyset Pagination 적용 후 Pagination 캐싱
- **목적:** 더 빠른 Seller/Supplier order list API
- **현재 상태:** Offset-based pagination (캐싱 어려움)
- **개선 방향:** Cursor-based pagination 도입 후 페이지별 캐싱
- **구현 복잡도:** High

### 9.3 Materialized View 도입
- **목적:** Settlement Summary의 사전 계산(PRE-COMPUTE) 방식 적용
- **장점:** 실시간 계산 부하 제거, TTL 필요 없음
- **단점:** 데이터 동기화 복잡도 증가
- **구현 복잡도:** Very High

### 9.4 Cache Warming Strategy
- **목적:** 서버 재시작 시 초기 캐시 MISS 방지
- **방법:** 서버 시작 시 주요 seller/supplier의 summary를 미리 계산하여 캐시에 저장
- **구현 복잡도:** Low

---

## 10. 캐시 관리 명령어

### 10.1 개발 환경에서 캐시 확인

```bash
# 캐시 통계 조회
curl http://localhost:4000/api/dev/perf/summary

# Slow query 조회
curl http://localhost:4000/api/dev/perf/slow-queries

# Slow query 로그 초기화
curl -X DELETE http://localhost:4000/api/dev/perf/slow-queries
```

### 10.2 Redis CLI에서 캐시 조회

```bash
# Redis 접속
redis-cli -h localhost -p 6379

# 모든 캐시 키 조회
KEYS o4o:*

# 특정 seller의 캐시 조회
KEYS o4o:*:seller:SELLER_ID:*

# 캐시 값 조회
GET o4o:dashboard:seller:SELLER_ID:summary

# 캐시 TTL 확인
TTL o4o:dashboard:seller:SELLER_ID:summary

# 특정 패턴의 캐시 삭제
redis-cli --scan --pattern "o4o:*:seller:SELLER_ID:*" | xargs redis-cli DEL
```

### 10.3 환경변수 설정

```bash
# .env 파일에 추가
CACHE_TYPE=redis              # redis | memory
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=o4o:

# TTL 설정 (초 단위)
CACHE_TTL_SHORT=60
CACHE_TTL_MEDIUM=300
CACHE_TTL_LONG=3600
CACHE_TTL_DAY=86400

# Memory Cache 설정
MEMORY_CACHE_MAX=1000
MEMORY_CACHE_CHECK_PERIOD=600
```

---

## 11. 트러블슈팅

### 11.1 캐시가 작동하지 않는 경우

**증상:** Cache HIT rate가 0%에 가까움

**원인 및 해결:**
1. **Redis 연결 실패**
   - 로그 확인: `[CacheService] Failed to initialize cache service, falling back to memory cache`
   - 해결: Redis 서버 상태 확인, 연결 정보 점검

2. **TTL이 너무 짧게 설정됨**
   - 해결: 환경변수 `CACHE_TTL_*` 값 확인 및 조정

3. **캐시 키 생성 로직 오류**
   - 로그 확인: `[SellerDashboardService] Cached summary for: {sellerId}`
   - 해결: 캐시 키 패턴 점검

---

### 11.2 캐시 무효화가 작동하지 않는 경우

**증상:** 데이터 변경 후에도 오래된 데이터가 반환됨

**원인 및 해결:**
1. **무효화 로직이 호출되지 않음**
   - 로그 확인: `[CacheInvalidation] Seller cache invalidated`
   - 해결: OrderService/SettlementService의 무효화 호출 확인

2. **패턴 매칭 오류**
   - Redis CLI로 직접 확인: `KEYS o4o:*:seller:SELLER_ID:*`
   - 해결: CacheKeys 패턴과 실제 저장된 키 비교

3. **비동기 무효화 실패**
   - 로그 확인: `[R-8-7] Failed to invalidate caches`
   - 해결: Redis 연결 상태 확인

---

### 11.3 Redis 메모리 부족

**증상:** Redis 연결 오류 또는 캐시 저장 실패

**원인 및 해결:**
1. **maxmemory 설정 확인**
   ```bash
   redis-cli CONFIG GET maxmemory
   ```

2. **메모리 사용량 확인**
   ```bash
   redis-cli INFO memory
   ```

3. **해결 방법:**
   - maxmemory 증설
   - TTL 단축 (특히 long, day 정책)
   - 불필요한 캐시 키 정리

---

## 12. 결론

본 문서는 R-8-7에서 도입된 캐싱 시스템의 전체 아키텍처, 정책, 무효화 규칙, 운영 전략을 정리한 최종 기술 문서입니다.

이 문서에 따라 API 서버는:

✅ **더 빠르고 안정적이며**
✅ **부하에 강하고**
✅ **일관성 있는 데이터 제공이 가능**

해당 캐싱 전략은 R-8 모듈 전체의 성능을 대폭 강화하며 이후 확장 개발에서도 표준 기준으로 활용될 수 있습니다.

---

## 참고 자료

- **R-8-7 Implementation Summary:** `docs/dev/R-8-7-Implementation-Summary.md` (예정)
- **Cache Service Code:** `apps/api-server/src/cache/`
- **Cache Invalidation Code:** `apps/api-server/src/utils/cache-invalidation.ts`
- **Performance Monitor:** `apps/api-server/src/utils/performance.ts`

---

**문서 버전:** 1.0
**최종 수정일:** 2025-11-24
