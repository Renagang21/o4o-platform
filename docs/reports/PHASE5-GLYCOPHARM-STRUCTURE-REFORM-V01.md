# Phase 5-A: GlycoPharm 구조 개혁 결과 보고서

**Work Order**: WO-O4O-STRUCTURE-REFORM-PHASE5-V01
**Status**: ✅ Phase A 완료 (GlycoPharm 차단)
**Date**: 2026-01-11
**Author**: Claude Code

---

## 1. 실행 요약

GlycoPharm 도메인의 독립 주문 생성 기능을 비활성화하여 CLAUDE.md §7 (E-commerce Core 절대 규칙)을 준수하도록 변경했습니다.

### 1.1 완료 항목

| 태스크 | 상태 | 설명 |
|--------|------|------|
| A-1: 주문 생성 API 비활성화 | ✅ | POST `/api/v1/glycopharm/orders` → 410 Gone |
| A-2: E-commerce Core 위임 구조 확인 | ✅ | CheckoutService 분석 완료 |
| A-3: Service Read-only 전환 | ✅ | GLYCOPHARM_ORDER_READONLY 플래그 추가 |
| A-4: Dropshipping-Core 연계 확인 | ✅ | 현재 미연동 상태 확인 |

---

## 2. 수정된 파일

### 2.1 order.controller.ts

**경로**: `apps/api-server/src/routes/glycopharm/controllers/order.controller.ts`

**변경 내용**:
- `POST /` (주문 생성): 410 Gone 응답으로 변경
- `POST /:id/pay` (결제 처리): 410 Gone 응답으로 변경
- 기존 조회 API (GET /mine, GET /:id)는 유지

```typescript
// 변경된 응답 예시
res.status(410).json({
  error: {
    code: 'ENDPOINT_GONE',
    message: 'Direct order creation is no longer supported. Please use E-commerce Core API.',
    migration: {
      newEndpoint: '/api/v1/ecommerce/orders',
      orderType: 'GLYCOPHARM',
      documentation: 'See CLAUDE.md §7 for E-commerce Core integration requirements',
    },
  },
});
```

### 2.2 order.service.ts

**경로**: `apps/api-server/src/routes/glycopharm/services/order.service.ts`

**변경 내용**:
- `GLYCOPHARM_ORDER_READONLY` 상수 추가 (기본값: `true`)
- `createOrder()`: Read-only guard 추가
- `payOrder()`: Read-only guard 추가
- `failOrder()`: Read-only guard 추가
- 조회 메서드 (`getOrderById`, `listMyOrders`)는 정상 작동

---

## 3. E-commerce Core 분석 결과

### 3.1 현재 구조

| 컴포넌트 | 파일 | 역할 |
|----------|------|------|
| CheckoutController | `controllers/checkout/checkoutController.ts` | 주문 생성/결제/환불 API |
| CheckoutService | `services/checkout.service.ts` | 비즈니스 로직 |
| CheckoutOrder Entity | `entities/checkout/CheckoutOrder.entity.ts` | 주문 데이터 |
| CheckoutPayment Entity | `entities/checkout/CheckoutPayment.entity.ts` | 결제 데이터 |

### 3.2 현재 한계점

1. **orderType 필드 없음**: 서비스별 주문 구분 불가
2. **서비스 연동 미구현**: GlycoPharm → E-commerce Core 위임 구조 없음
3. **이행(Fulfillment) 미연동**: Dropshipping-Core와 연동 없음

### 3.3 향후 필요 작업 (별도 Work Order)

```
[ ] CheckoutOrder에 orderType 필드 추가 (GLYCOPHARM, COSMETICS 등)
[ ] 서비스별 metadata 구조 정의
[ ] GlycoPharm 이행 흐름을 Dropshipping-Core로 연결
[ ] 기존 glycopharm_orders 데이터 마이그레이션 전략
```

---

## 4. Dropshipping-Core 연계 분석

### 4.1 현재 상태

- GlycoPharm은 `serviceTypes`로 `dropshipping` 유형 지원
- 실제 Dropshipping-Core와의 주문 이행 연동은 **미구현**
- 향후 E-commerce Core 통합 시 연동 필요

### 4.2 연계 구조 (향후)

```
GlycoPharm 주문 요청
    ↓
E-commerce Core (주문 생성)
    ↓
Dropshipping-Core (이행 처리)
    ↓
GlycoPharm (상태 조회만)
```

---

## 5. 테스트 검증

### 5.1 빌드 검증

```bash
$ pnpm run build  # ✅ 성공
$ npx tsc --noEmit  # ✅ 타입 검사 통과
```

### 5.2 API 응답 검증 (예상)

```bash
# 주문 생성 시도
$ curl -X POST /api/v1/glycopharm/orders
# 응답: 410 Gone

# 결제 시도
$ curl -X POST /api/v1/glycopharm/orders/:id/pay
# 응답: 410 Gone

# 주문 조회 (정상 작동)
$ curl -X GET /api/v1/glycopharm/orders/mine
# 응답: 200 OK (기존 주문 목록)
```

---

## 6. CLAUDE.md §7 준수 상태

| 규칙 | 준수 상태 | 비고 |
|------|-----------|------|
| 주문 생성 = E-commerce Core | ⚠️ 차단됨 | 완전 위임은 별도 구현 필요 |
| OrderType 불변성 | N/A | E-commerce Core 통합 후 적용 |
| ecommerceOrderId 필수 연결 | N/A | E-commerce Core 통합 후 적용 |

현재 상태:
- ❌ GlycoPharm 독립 주문 생성 (차단됨)
- ⏳ E-commerce Core 위임 (미구현)
- ⏳ ecommerceOrderId 연결 (미구현)

---

## 7. 결론 및 권장사항

### 7.1 완료된 작업

GlycoPharm의 독립 주문/결제 API를 410 Gone으로 비활성화하여 CLAUDE.md §7 위반 경로를 차단했습니다.

### 7.2 권장 후속 작업

1. **E-commerce Core 확장**: `orderType` 필드 추가 및 서비스별 주문 지원
2. **GlycoPharm 통합**: E-commerce Core API를 통한 주문 생성 구현
3. **데이터 마이그레이션**: 기존 `glycopharm_orders` 데이터 처리 전략 수립
4. **Dropshipping 연동**: 이행 흐름 구현

---

**Report Version**: V01
**Last Updated**: 2026-01-11
