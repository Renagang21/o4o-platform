# IR-KPI-SERVICE-KEY-ISOLATION-VERIFICATION-V1

> **KPI Service Key Isolation 검증 보고서**
> WO-KPI-SERVICE-KEY-ISOLATION-V1 구현 검증
> 2026-02-24

---

## 종합 판정

```
1. GlycoPharm KPI Filter: PASS
2. Cosmetics KPI Filter:  PASS
3. Legacy Metadata Check:  PASS (기존 코드에서 metadata.serviceKey 사용 확인)
4. Index Status:           CREATED (Migration 20260224500000)
5. Cross-Service Simulation: PASS

Final Status: SAFE
```

---

## 1. GlycoPharm KPI Filter 검증

**파일**: `glycopharm-store-data.adapter.ts`

| 메서드 | Line | 추가된 필터 | 상태 |
|--------|:----:|-----------|:----:|
| `getOrderStats()` | 41 | `AND metadata->>'serviceKey' = 'glycopharm'` | PASS |
| `getChannelBreakdown()` | 61 | `AND metadata->>'serviceKey' = 'glycopharm'` | PASS |
| `getTopProducts()` | 93 | `AND o.metadata->>'serviceKey' = 'glycopharm'` | PASS |
| `getRecentOrders()` | 115 | `AND metadata->>'serviceKey' = 'glycopharm'` | PASS |
| `getTotalOrderCount()` | 136 | `AND metadata->>'serviceKey' = 'glycopharm'` | PASS |
| `getRevenueBetween()` | 149 | `AND metadata->>'serviceKey' = 'glycopharm'` | PASS |

**전체 6/6 쿼리에 serviceKey 필터 적용 완료.**

---

## 2. Cosmetics KPI Filter 검증

**파일**: `cosmetics-store-summary.service.ts`

### Adapter 쿼리 (6건)

| 메서드 | Line | 추가된 필터 | 상태 |
|--------|:----:|-----------|:----:|
| `getOrderStats()` | 54 | `AND metadata->>'serviceKey' = 'cosmetics'` | PASS |
| `getChannelBreakdown()` | 74 | `AND metadata->>'serviceKey' = 'cosmetics'` | PASS |
| `getTopProducts()` | 106 | `AND o.metadata->>'serviceKey' = 'cosmetics'` | PASS |
| `getRecentOrders()` | 128 | `AND metadata->>'serviceKey' = 'cosmetics'` | PASS |
| `getTotalOrderCount()` | 149 | `AND metadata->>'serviceKey' = 'cosmetics'` | PASS |
| `getRevenueBetween()` | 162 | `AND metadata->>'serviceKey' = 'cosmetics'` | PASS |

### Admin Summary 쿼리 (3건)

| 쿼리 | Line | 추가된 필터 | 상태 |
|------|:----:|-----------|:----:|
| activeOrders count | 218 | `AND metadata->>'serviceKey' = 'cosmetics'` | PASS |
| monthlyRevenue sum | 227 | `AND metadata->>'serviceKey' = 'cosmetics'` | PASS |
| recentOrders list | 238 | `AND o.metadata->>'serviceKey' = 'cosmetics'` | PASS |

**전체 9/9 쿼리에 serviceKey 필터 적용 완료.**

---

## 3. Legacy Metadata Check

### metadata.serviceKey 사용 패턴 (기존 코드)

| 파일 | 사용 방식 | 값 |
|------|----------|-----|
| `checkout.controller.ts` | 주문 생성 시 metadata에 기록 | `'glycopharm'` |
| `checkout.controller.ts` | 주문 조회 시 필터 | `metadata->>'serviceKey' = 'glycopharm'` |
| `cosmetics-order.controller.ts` | 주문 생성 시 metadata에 기록 | `'cosmetics'` |
| `cosmetics-order.controller.ts` | 주문 조회 시 필터 | `metadata->>'serviceKey' = 'cosmetics'` |
| `kpa.routes.ts` | 공동구매 주문 필터 | `metadata->>'serviceKey' = 'kpa-groupbuy'` |

**결론**: `metadata.serviceKey`는 주문 생성 시 항상 기록되며,
주문 조회 엔드포인트에서도 이미 사용 중인 확립된 패턴이다.

### NULL 데이터 위험

- 모든 checkout 컨트롤러가 주문 생성 시 `serviceKey`를 metadata에 하드코딩
- Phase N-1 레거시 checkout만 metadata 없이 주문 생성 가능
- Phase N-1 주문은 비활성 서비스이며, 프로덕션 주문 생성 경로에서 제외
- **metadata IS NULL인 주문이 존재할 경우**: 어떤 서비스 KPI에도 포함되지 않음 (안전한 방향)

---

## 4. Index Status

**Migration**: `20260224500000-AddEcommerceOrdersServiceKeyIndex.ts`

```sql
CREATE INDEX "IDX_ecommerce_orders_service_key"
  ON "ecommerce_orders" ((metadata->>'serviceKey'))
  WHERE metadata IS NOT NULL
```

| 항목 | 값 |
|------|-----|
| 인덱스 타입 | Expression index (JSONB accessor) |
| Partial 조건 | `WHERE metadata IS NOT NULL` |
| 적용 대상 | 모든 KPI 집계 쿼리 (15건) |
| 상태 | Migration 생성 완료, 배포 시 자동 실행 |

---

## 5. Cross-Service Simulation

### Scenario: 매장 X가 GlycoPharm + Cosmetics 동시 운영

**Before (수정 전)**:
```sql
-- GlycoPharm KPI
SELECT COUNT(*) FROM ecommerce_orders WHERE store_id = 'X'
-- 결과: GlycoPharm 100건 + Cosmetics 50건 = 150건 (오염)
```

**After (수정 후)**:
```sql
-- GlycoPharm KPI
SELECT COUNT(*) FROM ecommerce_orders
WHERE store_id = 'X'
  AND metadata->>'serviceKey' = 'glycopharm'
-- 결과: GlycoPharm 100건만 (정확)

-- Cosmetics KPI
SELECT COUNT(*) FROM ecommerce_orders
WHERE store_id = 'X'
  AND metadata->>'serviceKey' = 'cosmetics'
-- 결과: Cosmetics 50건만 (정확)
```

**교차 집계**: 구조적으로 불가능.

---

## 변경 파일 요약

| 파일 | 변경 내용 | 쿼리 수 |
|------|----------|:------:|
| `glycopharm-store-data.adapter.ts` | 모든 KPI 쿼리에 serviceKey 필터 추가 | 6 |
| `cosmetics-store-summary.service.ts` | 모든 KPI + Admin 쿼리에 serviceKey 필터 추가 | 9 |
| `20260224500000-AddEcommerceOrdersServiceKeyIndex.ts` | Expression index 생성 | 1 |

**총 15건 쿼리 수정, 1건 인덱스 Migration 생성.**

---

## 준수 사항 확인

| 금지 사항 | 준수 |
|----------|:----:|
| store_id 조건 제거 금지 | PASS — 모든 쿼리에 store_id 유지 |
| service_key OR 조건 추가 금지 | PASS — 단일 값 일치만 사용 |
| fallback 조건 추가 금지 | PASS — metadata NULL 시 미포함 (안전 방향) |
| 기존 KPI 계산 로직 변경 금지 | PASS — WHERE 절 추가만 수행 |
| metadata 구조 변경 금지 | PASS — 읽기 전용 접근 |

---

## TypeScript 검사

```
tsc --noEmit --project apps/api-server/tsconfig.json
```

- 수정 파일 에러: **0건**
- 기존 에러 (pre-existing): `@o4o/*` 모듈 해석 (변경 없음)

---

## 결론

**WO-KPI-SERVICE-KEY-ISOLATION-V1: 구현 완료**

멀티서비스 매장에서의 KPI 교차 집계가 구조적으로 차단되었다.

| 항목 | 수정 전 | 수정 후 |
|------|--------|--------|
| GlycoPharm KPI | store_id만 필터 | store_id + serviceKey='glycopharm' |
| Cosmetics KPI | store_id만 필터 | store_id + serviceKey='cosmetics' |
| Admin Summary | store_id IN cosmetics_stores | + serviceKey='cosmetics' |
| 인덱스 | 없음 | Expression index on metadata->>'serviceKey' |

**IR-MULTI-SERVICE-PRODUCT-VISIBILITY-VALIDATION-V1에서 보고된
I-1, I-2 ISSUE 항목이 모두 해결되었다.**

---

*Generated: 2026-02-24*
*Status: Verification Complete*
*Classification: Investigation Report*
