# Internal Beta Runbook V1

> WO-O4O-INTERNAL-BETA-ROLL-OUT-V1
> 2026-02-24

---

## 1. Beta Mode 활성화

```bash
# Cloud Run 환경변수 설정
BETA_MODE=true
```

Beta Mode ON 시 활성화되는 기능:
- `[OpsMetrics] 60s summary` 주기적 로그 출력
- `GET /internal/ops/metrics` 엔드포인트 응답
- `[SlowRequest]` warn 로그 출력

Beta Mode OFF 시: 위 기능 모두 비활성. 기존 동작 동일.

---

## 2. 관측 엔드포인트

| 엔드포인트 | 인증 | 설명 |
|------------|------|------|
| `GET /internal/ops/metrics` | requireAuth | 60초 카운터 스냅샷 |
| `GET /health/redis` | Public | Redis 연결 상태 + cache hit ratio |
| `GET /health/database` | Public | DB ping latency + 활성 커넥션 |
| `GET /health/detailed` | Public | 전체 컴포넌트 상태 |

---

## 3. 정상 범위 지표

| 지표 | 정상 범위 | 경고 기준 |
|------|-----------|-----------|
| checkout.attempt (60s) | 0~50 | > 100 (비정상 트래픽) |
| checkout.success / attempt | > 80% | < 60% |
| checkout.blocked.* (60s) | 0~5 | > 20 (정책 오설정 가능) |
| checkout.error (60s) | 0 | > 0 (즉시 확인) |
| payment.confirm.success / prepare | > 90% | < 70% |
| payment.duplicate.blocked | 0~2 | > 10 (프론트 재시도 과다) |
| cache.hit / (hit+miss) | > 70% | < 50% |
| cache.error (60s) | 0 | > 0 (Redis 장애) |
| DB ping latency | < 50ms | > 200ms |
| Redis ping latency | < 10ms | > 100ms |
| API 응답시간 | < 500ms | checkout > 700ms, payment > 1500ms |

---

## 4. 경고 대응 절차

### 4.1 Checkout 실패 증가

```
1. GET /internal/ops/metrics → checkout.blocked.* 확인
2. blocked.distribution 증가 → neture_supplier_products.distribution_type 확인
3. blocked.stock 증가 → glycopharm_products.stock_quantity 확인
4. blocked.sales_limit 증가 → organization_product_channels.sales_limit 확인
5. error 증가 → Cloud Run 로그에서 [GlycoPharm Checkout] Create order error 검색
```

### 4.2 Payment 실패 증가

```
1. GET /internal/ops/metrics → payment.confirm.failed 확인
2. Cloud Run 로그에서 [Payment] Confirm error 검색
3. Toss API 응답 코드 확인 (payment.metadata)
4. duplicate.blocked 증가 → 프론트엔드 재시도 로직 점검
```

### 4.3 Cache Hit Rate 저하

```
1. GET /health/redis → cache.hits / (hits + misses) 확인
2. hit rate < 50% → TTL 설정 확인 (READ_CACHE_TTL)
3. errors > 0 → Redis 연결 상태 확인
4. Redis 정상인데 miss 높으면 → 요청 패턴 변화 (신규 상품/약국 추가 등)
```

### 4.4 Redis 장애 시 기대 동작

```
Redis 연결 실패 / 타임아웃 시:
- cacheAside(): DB fallback 자동 실행 (기능 정상)
- 성능: 캐시 없이 직접 DB 쿼리 (응답 시간 증가)
- 로그: [ReadCache] GET error, falling back to DB (warn)
- 메트릭: cache.error 카운터 증가
- 주문/결제: 영향 없음 (cache는 read-only)
```

### 4.5 DB 응답 지연

```
1. GET /health/database → pingMs 확인
2. pingMs > 200ms → pg_stat_activity 장시간 쿼리 확인
3. longRunningQueries > 5 → 원인 쿼리 식별 후 kill 검토
4. activeConnections 급증 → connection pool 설정 확인
```

---

## 5. Slow Request 로그 형식

```json
{
  "level": "warn",
  "message": "[SlowRequest]",
  "method": "POST",
  "url": "/api/v1/glycopharm/checkout",
  "statusCode": 201,
  "durationMs": 820,
  "thresholdMs": 700,
  "label": "checkout"
}
```

Threshold 기준:
- checkout 관련: 700ms
- payment confirm 관련: 1500ms
- 기타 모든 API: 1000ms

---

## 6. 60초 메트릭 요약 로그 형식

```
[OpsMetrics] 60s summary {
  "checkout.attempt{service=glycopharm}": 12,
  "checkout.success{service=glycopharm}": 10,
  "checkout.blocked.stock{service=glycopharm}": 2,
  "payment.prepare{service=glycopharm}": 10,
  "payment.confirm.success{service=glycopharm}": 8,
  "cache.hit": 340,
  "cache.miss": 45,
  "cache.error": 0
}
```

비활성 메트릭(0)은 출력되지 않음.

---

## 7. Beta 종료 조건

다음 모든 항목 확인 후 Beta 종료:

- [ ] 결제 성공률 > 90% (7일 연속)
- [ ] Cache hit rate > 70% (안정)
- [ ] Distribution 차단 수 예상 범위 내
- [ ] Checkout 실패 패턴 정상 (error = 0)
- [ ] Slow request 경고 빈도 수용 가능
- [ ] DB/Redis 응답 시간 안정

---

*Generated: 2026-02-24*
*WO: WO-O4O-INTERNAL-BETA-ROLL-OUT-V1*
