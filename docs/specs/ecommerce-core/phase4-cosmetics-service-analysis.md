# E-commerce Core Phase 4 - 화장품 서비스 분석 보고서

**Date**: 2025-12-13
**Branch**: `feature/ecommerce-core-application-phase4`
**Status**: Analysis Complete

---

## 1. 조사 개요

화장품 매장 기반 서비스의 주문 흐름을 조사하여
E-commerce Core 통합 지점을 파악했습니다.

---

## 2. 현재 주문 흐름 구조

### 2.1 주문 생성 흐름 (AS-IS)

```
클라이언트
    │
    │ POST /api/v1/dropshipping/core/orders
    ↓
Dropshipping Core (OrdersController)
    │
    │ OrderRelayService.createOrder()
    ↓
OrderRelay Entity 생성
    │
    │ Event: order.created
    ↓
이벤트 리스너
```

**문제점**:
- E-commerce Core 우회
- OrderType 개념 없음
- 판매 원장(Source of Truth) 부재

### 2.2 주문 조회 흐름 (AS-IS)

```
SellerOps (판매자)
    │
    │ OrderOpsService.getOrders()
    │
    ↓
OrderRelay Repository 직접 조회
    │
    │ JOIN: listing → offer → productMaster
    ↓
결과 반환

SupplierOps (공급자)
    │
    │ OrderMonitorService.getOrderRelays()
    │
    ↓
데모 데이터 반환 (실 DB 연결 없음)
```

### 2.3 통계 집계 흐름 (AS-IS)

```
SellerOps Dashboard
    │
    │ DashboardService.getDashboardSummary()
    │
    ↓
OrderRelay Repository
    │
    │ SUM(totalPrice) WHERE status IN ('delivered', 'completed')
    ↓
totalSales 반환
```

---

## 3. 관련 서비스 현황

### 3.1 SellerOps

| 서비스 | 파일 | E-commerce Core 사용 | 비고 |
|--------|------|---------------------|------|
| OrderOpsService | `services/OrderOpsService.ts` | ❌ | OrderRelay 직접 조회 |
| DashboardService | `services/DashboardService.ts` | ❌ | OrderRelay 직접 집계 |

### 3.2 SupplierOps

| 서비스 | 파일 | E-commerce Core 사용 | 비고 |
|--------|------|---------------------|------|
| OrderMonitorService | `services/OrderMonitorService.ts` | ❌ | 데모 데이터 |

### 3.3 Dropshipping-Cosmetics

| 서비스 | 파일 | 주문 관련 | 비고 |
|--------|------|----------|------|
| SellerWorkflowService | `services/seller-workflow.service.ts` | ❌ | 상담 세션 |
| RecommendationEngineService | `services/recommendation-engine.service.ts` | ❌ | 상품 추천 |
| CosmeticsFilterService | `services/cosmetics-filter.service.ts` | ❌ | 필터링 |

---

## 4. E-commerce Core 통합 계획 (TO-BE)

### 4.1 주문 생성 흐름 (TO-BE)

```
클라이언트
    │
    │ POST /api/v1/ecommerce/orders
    │ { orderType: 'dropshipping', ... }
    ↓
E-commerce Core (EcommerceOrderController)
    │
    │ EcommerceOrderService.create()
    │ Event: order.created
    ↓
EcommerceOrder 생성 (판매 원장)
    │
    │ orderType === 'dropshipping' ?
    ↓
Dropshipping Core (OrderRelayService)
    │
    │ createOrder({ ecommerceOrderId })
    ↓
OrderRelay 생성 (Relay 정보)
```

### 4.2 주문 조회 흐름 (TO-BE)

```
SellerOps (판매자)
    │
    │ 1. EcommerceOrderQueryService.findBySellerId()
    │    → 판매 원장 조회
    │
    │ 2. OrderRelayService.findByEcommerceOrderId()
    │    → Relay 정보 조회
    ↓
결과 병합 반환
```

### 4.3 통계 집계 흐름 (TO-BE)

```
SellerOps Dashboard
    │
    │ EcommerceOrderQueryService.getDailyOrderSummary()
    │ EcommerceOrderQueryService.getStatsBySeller()
    ↓
판매 원장 기준 통계
```

---

## 5. 전환 전략

### 5.1 단계별 전환

#### Phase 4-A: 주문 생성 통합
1. 신규 주문은 E-commerce Core 경유
2. 기존 OrderRelay는 ecommerceOrderId nullable 유지
3. 점진적 마이그레이션

#### Phase 4-B: 조회 서비스 전환
1. SellerOps 조회 로직 분리
   - 판매 원장: EcommerceOrderQueryService
   - Relay 정보: OrderRelayService
2. 기존 API 스펙 유지 (내부 구현만 변경)

#### Phase 4-C: 통계 서비스 전환
1. DashboardService 집계 로직 변경
2. EcommerceOrderQueryService 활용
3. Dropshipping 특화 통계는 별도 유지

### 5.2 전환 시 주의사항

| 항목 | 주의점 |
|------|--------|
| API 스펙 | 기존 API 응답 형식 유지 |
| 기존 데이터 | ecommerceOrderId nullable 유지 |
| 이벤트 | 중복 발행 방지 |
| 성능 | 조인 쿼리 최적화 |

---

## 6. 영향 범위

### 6.1 수정 필요 파일

| 패키지 | 파일 | 수정 내용 |
|--------|------|----------|
| sellerops | `services/OrderOpsService.ts` | E-commerce Core 조회 통합 |
| sellerops | `services/DashboardService.ts` | QueryService 활용 |
| dropshipping-core | `controllers/orders.controller.ts` | E-commerce Core 연계 |

### 6.2 신규 생성 필요

| 패키지 | 파일 | 용도 |
|--------|------|------|
| sellerops | `services/OrderIntegrationService.ts` | 통합 조회 서비스 |

---

## 7. 결론

현재 화장품 서비스는 Dropshipping Core에 직접 의존하여
E-commerce Core의 판매 원장 구조를 활용하지 않고 있습니다.

Phase 4에서는:
1. **주문 생성 시 E-commerce Core 경유** 구조 적용
2. **조회/통계는 두 Core 조합**으로 동작
3. **기존 API 스펙 유지**하며 내부 구현만 변경

이를 통해 OrderType 기반 분기가 가능해지고,
향후 retail, b2b 등 다른 판매 유형 지원이 용이해집니다.
