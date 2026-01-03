# H4-1: Checkout vs EcommerceOrder 도메인 비교 결정

> **Status**: Decision Complete
> **Date**: 2025-01-02
> **Work Order**: H4-1 (조사 전용, 코드 수정 금지)
> **Scope**: Checkout/EcommerceOrder 책임 비교 및 권고

---

## 1. 조사 대상

### 1.1 EcommerceOrder 도메인 (ecommerce-core)

| 파일 | 위치 | 역할 |
|------|------|------|
| `EcommerceOrder.entity.ts` | packages/ecommerce-core/src/entities/ | 주문 엔티티 (판매 원장) |
| `EcommerceOrderItem.entity.ts` | packages/ecommerce-core/src/entities/ | 주문 아이템 엔티티 |
| `EcommercePayment.entity.ts` | packages/ecommerce-core/src/entities/ | 결제 엔티티 |
| `EcommerceOrderService.ts` | packages/ecommerce-core/src/services/ | 주문 CRUD 서비스 |
| `CosmeticsOrderService.ts` | packages/ecommerce-core/src/services/ | Cosmetics 도메인 전용 주문 서비스 |

### 1.2 Checkout 도메인 (api-server)

| 파일 | 위치 | 역할 |
|------|------|------|
| `CheckoutOrder.entity.ts` | apps/api-server/src/entities/checkout/ | MVP 체크아웃 주문 |
| `CheckoutPayment.entity.ts` | apps/api-server/src/entities/checkout/ | MVP 결제 (Toss 연동) |
| `OrderLog.entity.ts` | apps/api-server/src/entities/checkout/ | 감사 로그 |
| `checkout.routes.ts` | apps/api-server/src/routes/ | 체크아웃 API 엔드포인트 |
| `checkoutController.ts` | apps/api-server/src/controllers/ | Toss 결제 통합 컨트롤러 |

---

## 2. 질문별 답변 표

### Q1. 두 도메인 간 책임 중복 여부

| 비교 항목 | EcommerceOrder | CheckoutOrder | 중복 여부 |
|-----------|----------------|---------------|-----------|
| **주문 생성** | ✅ 범용 (모든 OrderType) | ✅ MVP 전용 (Phase N-1/N-2) | **중복** |
| **주문 상태 관리** | ✅ 10개 상태 | ✅ 5개 상태 | **중복** |
| **아이템 저장** | 별도 테이블 (EcommerceOrderItem) | JSONB 컬럼 (items) | 구조 상이 |
| **결제 연동** | 범용 (PaymentMethod enum) | Toss 전용 (paymentKey) | **중복** |
| **금액 계산** | ✅ totalAmount, shippingFee, discount | ✅ totalAmount, shippingAmount, discountAmount | **중복** |
| **판매자 정보** | sellerId | supplierId, partnerId, platformSellerId | 목적 상이 |

**결론**: 핵심 기능(주문 생성, 상태 관리, 금액 계산)에서 **기능 중복 존재**

---

### Q2. H1-H3 결정과의 호환성

| 결정 | 내용 | EcommerceOrder 호환 | CheckoutOrder 호환 |
|------|------|---------------------|-------------------|
| **H1-0** | K-Shopping FROZEN | ✅ 무관 | ✅ 무관 |
| **H1-2** | 단일 Order Source of Truth | ✅ **판매 원장으로 설계** | ⚠️ MVP 한정, 통합 언급 |
| **H2-0** | OrderType RETAIL 고정 | ✅ RETAIL 타입 지원 | ❌ OrderType 개념 없음 |
| **H2-0** | metadata.channel 분기 | ✅ CosmeticsOrderService 구현 | ❌ channel 개념 없음 |
| **H2-3** | TaxRefund Rate-based | ✅ CosmeticsOrderService 검증 | ❌ TaxRefund 없음 |
| **H3-0** | Travel Channel + TaxRefund | ✅ 완전 구현 | ❌ 미지원 |

**결론**: EcommerceOrder는 H1-H3 결정과 **완전 호환**, CheckoutOrder는 **미호환**

---

### Q3. 실제 사용처 분석

#### EcommerceOrder 사용처

| 사용처 | 파일 | 용도 |
|--------|------|------|
| Cosmetics 주문 | `CosmeticsOrderService.ts` | Local/Travel 채널 주문 생성 |
| 주문 조회 | `EcommerceOrderQueryService.ts` | 채널별, 상태별 조회 |
| 이벤트 발행 | `EcommerceOrderService.ts` | order.created, order.status_changed |

#### CheckoutOrder 사용처

| 사용처 | 파일 | 용도 |
|--------|------|------|
| main-site Checkout | `checkout.ts` (shortcode) | 체크아웃 폼 렌더링 |
| main-site Hook | `useCheckout.ts` | API 호출 (/api/checkout) |
| Toss 결제 | `checkoutController.ts` | preparePayment, confirmPayment |

#### 사용처 비교

| 구분 | EcommerceOrder | CheckoutOrder |
|------|----------------|---------------|
| **Core 패키지** | ✅ ecommerce-core | ❌ api-server 로컬 |
| **서비스 통합** | ✅ CosmeticsOrderService 위임 | ❌ 독립 |
| **Frontend** | ❌ 직접 연동 없음 | ✅ main-site 연동 |
| **PG 연동** | ❌ 범용 인터페이스 | ✅ Toss 전용 |

**결론**: CheckoutOrder는 **MVP Phase N-1/N-2 한정** 사용, EcommerceOrder는 **플랫폼 표준**

---

### Q4. 단일 모델 유지 시 영향도

#### CheckoutOrder 제거 시 영향

| 영향 대상 | 파일 | 필요 작업 |
|-----------|------|-----------|
| main-site checkout | `checkout.ts`, `useCheckout.ts` | EcommerceOrder API로 전환 |
| Toss 결제 연동 | `checkoutController.ts` | EcommercePayment에 Toss 필드 추가 |
| checkout.routes.ts | 5개 엔드포인트 | ecommerce-core 라우트로 통합 |
| OrderLog | 감사 로그 | EcommerceOrder에 통합 |

#### 영향도 평가

| 항목 | 수준 | 설명 |
|------|------|------|
| **코드 변경량** | 중간 | 5개 파일 수정, 라우트 이관 |
| **데이터 마이그레이션** | 낮음 | checkout_orders 테이블 → ecommerce_orders |
| **API 호환성** | 중간 | main-site checkout shortcode 수정 필요 |
| **PG 연동** | 중간 | Toss paymentKey 필드 EcommercePayment에 추가 |

---

## 3. 비교 요약 표

| 항목 | EcommerceOrder (ecommerce-core) | CheckoutOrder (api-server) |
|------|--------------------------------|---------------------------|
| **설계 목적** | 판매 원장 (Source of Truth) | MVP Phase N-1/N-2 |
| **OrderType 지원** | ✅ RETAIL, DROPSHIPPING, B2B, SUBSCRIPTION | ❌ 없음 |
| **Channel 지원** | ✅ metadata.channel (local/travel) | ❌ 없음 |
| **상태 수** | 10개 | 5개 |
| **아이템 구조** | 별도 테이블 (정규화) | JSONB (비정규화) |
| **결제 연동** | 범용 (PaymentMethod enum) | Toss 전용 (paymentKey) |
| **이벤트 발행** | ✅ EventEmitter2 | ❌ 없음 |
| **H1-H3 호환** | ✅ 완전 | ❌ 미호환 |
| **확장성** | ✅ 높음 | ❌ 낮음 (MVP 한정) |
| **코드 주석** | - | "향후 EcommerceOrder와 통합 가능" |

---

## 4. 최종 권고

### 권고: **DEPRECATE** (CheckoutOrder 도메인)

#### 근거

1. **H1-2 결정 위반**: 단일 Order Source of Truth 원칙에 위배
2. **기능 중복**: 주문 생성, 상태 관리, 금액 계산 모두 중복
3. **H2-H3 미호환**: OrderType, channel, TaxRefund 전혀 미지원
4. **설계 의도**: CheckoutOrder 자체에 "향후 EcommerceOrder와 통합 가능" 명시
5. **MVP 한정**: Phase N-1/N-2 임시 구현으로 설계됨

#### DEPRECATE 실행 조건 (순차 진행)

```
1. [H4-2] EcommercePayment에 Toss 연동 필드 추가 (paymentKey 등)
2. [H4-3] main-site checkout shortcode를 EcommerceOrder API로 전환
3. [H4-4] checkout.routes.ts 엔드포인트 ecommerce-core로 이관
4. [H4-5] checkout_orders 데이터 마이그레이션
5. [H4-6] CheckoutOrder, CheckoutPayment 엔티티 삭제
```

#### 유지 대상

| 항목 | 판정 | 사유 |
|------|------|------|
| `OrderLog.entity.ts` | **KEEP** | 감사 로그 기능, EcommerceOrder에 통합 가능 |
| Toss 연동 로직 | **MIGRATE** | checkoutController의 Toss 로직 → ecommerce-core |

---

## 5. 위험 평가

| 위험 | 수준 | 완화 방안 |
|------|------|-----------|
| main-site checkout 중단 | 중간 | 단계적 전환, 병렬 운영 기간 |
| 데이터 손실 | 낮음 | 마이그레이션 스크립트 + 백업 |
| Toss 결제 장애 | 중간 | EcommercePayment 확장 선행 |

---

## 6. 다음 단계

본 문서는 **조사 결과 및 권고**만 포함합니다.

실제 코드 수정은 **별도 Work Order**에서 진행해야 합니다:

```
H4-2: EcommercePayment Toss 필드 확장 (선행 작업)
H4-3: main-site Checkout 전환
H4-4: Checkout Routes Migration
H4-5: Data Migration
H4-6: CheckoutOrder Domain Removal
```

---

*Document Version: 1.0*
*Created by: H4-1 Investigation*
*Investigation Only - No Code Modification Performed*
