# O4O Store & Order Guardrails Rules (Mandatory)

> **CLAUDE.md §4 (E-commerce Core) · §5 (O4O Store & Order) 의 상세 규칙** (구 §19-21에서 분리)
> 이 문서는 CLAUDE.md의 보조 문서입니다.
> **상태**: ACTIVE · **최종 갱신**: 2026-10-04 (유효 규칙 = `checkoutService.createOrder()` 단일 지점 · `*_orders`/`*_payments` 금지 · Store Template. Tourism · `OrderType` · 런타임 Guard · 소비자 주문 controller 서술은 아래 `2026-10-04 정합` 주석으로 사실 정정)
>
> (2026-10-04 정합) 매장 commerce 의 사업 경계는 [O4O-STORE-COMMERCE-BOUNDARY-V1](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) 이 정한다 — 소비자→매장 O4O 주문은 현행 사업 기능이 아니며, 현재 살아 있는 내부 주문 경로는 공급자→매장 B2B([B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)) 뿐이다. 이 문서는 "주문을 만든다면 어디서 · 어떻게" 의 가드레일이며, 주문 기능의 존재 근거가 아니다.

---

## 1. Tourism Domain Rules (§19)

> (2026-10-04 정합) **Tourism 도메인은 은퇴했다.** `apps/api-server/src/routes/tourism` · `tourism_*` 엔티티/테이블은 존재하지 않으며(`canonical-schema-baseline.ts` 에 `tourism_*` 테이블 없음), DB enum `checkout_orders_order_type_enum` 에 `'TOURISM'` 값만 잔존한다. 아래 §1 은 과거 기록으로만 읽는다. 유효한 원칙(주문은 `checkoutService.createOrder()` 경유 · 서비스별 주문 테이블 금지)은 §2 에 그대로 있다.

> Tourism 도메인은 **O4O 표준 매장 패턴**을 따르며,
> 모든 주문은 E-commerce Core를 통해 처리한다.

### 1.1 Tourism 정체성 (확정)

| 질문 | 답변 |
|------|------|
| O4O 표준 매장인가? | **예** |
| 독립 Commerce인가? | **아니오** |
| E-commerce Core 사용? | **예** |
| OrderType | `TOURISM` |

> Tourism은 Cosmetics와 함께 **표준 매장 참조 구현(reference implementation)**입니다.

### 1.2 소유권 원칙

| 테이블 | 소유자 | 비고 |
|--------|--------|------|
| tourism_destinations | Tourism | 관광지/테마 정보 |
| tourism_packages | Tourism | 관광 패키지 |
| tourism_package_items | Tourism | 패키지 구성 아이템 |
| checkout_orders (orderType: TOURISM) | E-commerce Core | 주문 원장 |

### 1.3 주문 처리 원칙 (절대 규칙)

```typescript
// 허용 (Phase 5-C 표준)
const order = await checkoutService.createOrder({
  orderType: OrderType.TOURISM,
  buyerId,
  items,
  metadata: { packageId, tourDate, ... }
});

// 금지 (절대)
const order = tourismOrderRepository.save({ ... }); // ❌
```

### 1.4 상품 공급 연계 규칙

Tourism은 **상품을 소유하지 않습니다**.

| 역할 | 책임 |
|------|------|
| Tourism | 상품을 설명하는 서비스 (콘텐츠) |
| 상품 공급 (ProductMaster / SupplierProductOffer) | 상품을 공급하는 엔진 |
| E-commerce Core | 주문 원장 |

> `WO-O4O-DROPSHIPPING-LEGACY-REMOVAL-V1`: 구 Dropshipping 엔진(`@o4o/dropshipping-core` 계열)은 삭제되었다.
> 상품 공급 정본은 `ProductMaster` · `SupplierProductOffer` 이며, 아래 `dropshippingProductId` 는 미사용 soft FK 컬럼명이다.

```typescript
// tourism_package_items
@Column({ type: 'uuid', nullable: true })
dropshippingProductId?: string;  // Soft FK (참조만, FK 제약 없음)
```

---

## 2. Order Guardrails (§20)

> **"어떤 서비스도 E-commerce Core를 우회해 주문을 만들 수 없게 한다."**

### 2.1 3중 방어 체계

| 레이어 | 방어 수단 | 설명 |
|--------|----------|------|
| 런타임 | OrderCreationGuard | checkoutService 외 주문 생성 즉시 차단 |
| 계약 | OrderType 강제 | 누락/무효 시 Hard Fail |
| 스키마 | 금지 테이블 검사 | `*_orders`, `*_payments` 생성 차단 |

> (2026-10-04 정합) 현행 코드 기준 사실:
> - **런타임**: `OrderCreationGuard` · `apps/api-server/src/guards/` 는 존재하지 않는다. 주문 생성 단일 지점은 `apps/api-server/src/services/checkout.service.ts` `createOrder()` 이며, 여기서 의약품 포함 주문을 일괄 거부한다(`assertNoDrugItems`). 우회 저장을 런타임에서 막는 별도 guard 는 없다 — 규칙 준수는 코드 리뷰와 아래 스키마 검사에 의존한다.
> - **계약**: `CreateOrderDto` 에 `orderType` 필드가 없고 `CheckoutOrder` 엔티티는 `order_type` 컬럼을 매핑하지 않는다(DB 에는 enum 컬럼 `GENERIC`/`DROPSHIPPING`/`COSMETICS`/`TOURISM`, 기본값 `GENERIC` 만 잔존). 따라서 §2.3 · §3.3 의 "OrderType 강제 · enum 추가" 절차는 현행 코드와 맞지 않는다. 서비스 구분은 `metadata.serviceKey` 로 한다([B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)). [E-COMMERCE-ORDER-CONTRACT](../baseline/E-COMMERCE-ORDER-CONTRACT.md) 는 2026-10-07 SUPERSEDED — 주문 생성 기술 계약은 [CHECKOUT-STABLE-V2](../baseline/CHECKOUT-STABLE-DECLARATION-V2.md) §2.
> - **스키마**: `scripts/check-forbidden-tables.mjs` 는 존재하지만 현재 CI workflow · `package.json` 어디에서도 호출되지 않는다(수동 실행). `@Entity('x_orders')` 문자열 형태만 검사한다.

### 2.2 Guardrail 1: 런타임 차단 (Service Layer)

```typescript
// 허용
const order = await checkoutService.createOrder({
  orderType: OrderType.COSMETICS,
  buyerId,
  items,
  ...
});

// 금지 (런타임 에러 발생)
const order = await someOtherService.createOrder({ ... });  // ❌
const order = await orderRepository.save({ ... });          // ❌
```

**구현 파일**: `apps/api-server/src/guards/order-creation.guard.ts`

### 2.3 Guardrail 2: OrderType 강제 (Contract Layer)

| 규칙 | 동작 |
|------|------|
| OrderType 누락 | **Hard Fail** (400 Bad Request) |
| 무효한 OrderType | **Hard Fail** (400 Bad Request) |
| 차단된 OrderType | **Hard Fail** |

```typescript
// 허용된 OrderType
enum OrderType {
  GENERIC,      // 기본값 (경고 로깅)
  DROPSHIPPING,
  COSMETICS,
  TOURISM,
}

// 차단된 OrderType
const BLOCKED_ORDER_TYPES = [
];
```

### 2.4 Guardrail 3: 스키마 정책 (DB Layer)

**금지된 테이블 패턴**:

| 패턴 | 예시 | 이유 |
|------|------|------|
| `*_orders` | cosmetics_orders, tourism_orders | 주문 원장 분산 |
| `*_payments` | cosmetics_payments | 결제 원장 분산 |

**허용된 테이블**:

| 테이블 | 소유자 |
|--------|--------|
| checkout_orders | E-commerce Core |
| checkout_payments | E-commerce Core |

**검사 스크립트**: `scripts/check-forbidden-tables.mjs`

### 2.5 금지 패턴 목록

| 금지 패턴 | 이유 |
|-----------|------|
| `tourism_orders` | Tourism은 Core 위임 |
| `cosmetics_orders` | Cosmetics는 Core 위임 |
| `yaksa_orders` | Yaksa는 주문 기능 없음 |
| `neture_orders` | Neture는 Read-only Hub |
| Service 내 `createOrder()` | 책임 침범 |
| 서비스별 결제 API | Core 책임 |

> (2026-10-04 정합) `neture_orders` 는 현재 **공급자 fulfillment 원장**으로 존재한다 — 주문 정본(`checkout_orders`)이 아니라 결제 확정 후 `CheckoutFulfillmentBridgeService` 가 투영하는 파생 기록이다([B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) 불변식 T1 · A2). "주문 원장을 서비스별로 만들지 않는다" 는 원칙은 그대로 유효하다. `tourism_orders` 행은 Tourism 은퇴로 과거 기록이다.

## 3. O4O Store Template Rules (§21)

> **모든 매장형 O4O 서비스는 O4O Store Template를 기반으로 생성한다.**
> 템플릿 없이 임의로 매장을 생성하는 것은 금지된다.

### 3.1 O4O 표준 매장 정의

| 항목 | 표준 |
|------|------|
| 주문 생성 | **E-commerce Core 전용** (`checkoutService.createOrder()`) |
| 주문 원장 | `checkout_orders` |
| 구분 키 | `OrderType` enum |
| 매장 책임 | 상품/콘텐츠/가격/패키지 관리 |
| 결제/정산 | Core 책임 |
| 독립 주문 테이블 | **금지** |

### 3.2 Reference Implementation

> **PH 전용 판정 부분 대체 (2026-10-11 · #427):** 이 절의 PH 활성 주문 경로·capability 추가·parity/향후 구현·호환 보존 계약은 [완전 폐기 정책](../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) 1~6항으로 대체한다. PH 기능을 유지/확장/복구하지 않는다. 공용 QR 계약·인쇄 QR 연결·Neture와 다른 서비스 기능·법정 보유 판단은 유지한다. 아래 PH 구조/구현 표기는 폐기 전 이력이다.


| 매장 | OrderType | 상태 |
|------|-----------|------|
| Cosmetics | `COSMETICS` | Active (참조 구현) |
| Tourism | `TOURISM` | Active (참조 구현) |

> (2026-10-04 정합) 위 표는 과거 기록이다. Tourism 은 은퇴했고, Cosmetics 의 소비자 주문 생성(`POST /cosmetics/orders`)은 `410 STORE_CONSUMER_ORDER_RETIRED` 로 닫혔다(`apps/api-server/src/routes/cosmetics/controllers/cosmetics-order.controller.ts` · `WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1`). 현행 `createOrder()` 호출 경로는 공급자→매장 B2B(event-offer · Neture B2B · PharmacyHub → `store_cart_items → checkout_orders`)다.

### 3.3 새 매장 생성 시 필수 절차

> (2026-10-04 정합) 아래 2·3 단계(`OrderType` enum 추가 · `routes/{new-store}` 소비자 Order Controller 생성)는 현행 코드(`OrderType` 미매핑 · §2 정합 주석)와 [COMMERCE-BOUNDARY](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)(소비자→매장 commerce 없음 · 개발 금지선)에 맞지 않으므로 **그대로 실행하지 않는다**. 새 주문 경로가 필요하면 COMMERCE-BOUNDARY §15 절차와 B2B 계약을 먼저 따른다. §3.4 의 "`checkoutService.createOrder()` 만 사용" 원칙과 §3.5 의 "자체 주문 테이블 없음" 항목은 유효하다.

```bash
# 1. 템플릿 복사
cp -r docs/templates/o4o-store-template/* docs/services/{new-store}/

# 2. OrderType enum 추가
# apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts
export enum OrderType {
  ...
  {NEW_STORE} = '{NEW_STORE}',
}

# 3. Order Controller 생성 (템플릿 패턴 필수)
# apps/api-server/src/routes/{new-store}/controllers/{new-store}-order.controller.ts
```

### 3.4 Order Controller 필수 패턴

```typescript
import { checkoutService } from '../../../services/checkout.service.js';
import { OrderType } from '../../../entities/checkout/CheckoutOrder.entity.js';

// 유일하게 허용되는 주문 생성 패턴
const order = await checkoutService.createOrder({
  orderType: OrderType.{STORE_TYPE},   // 필수: 매장 타입
  buyerId,                              // 필수: 구매자 ID
  sellerId,                             // 필수: 판매자 ID
  supplierId,                           // 필수: 공급자 ID
  items,                                // 필수: 주문 아이템
  metadata: { ... },                    // 선택: 매장별 메타데이터
});
```

### 3.5 매장 생성 체크리스트

새 매장 생성 시 반드시 확인:

- [ ] OrderType enum에 추가됨
- [ ] `checkoutService.createOrder()`만 사용
- [ ] 자체 주문 테이블 없음
- [ ] ESM 호환 Entity 패턴 준수 (CLAUDE.md §2 — 구 §4.1)
- [ ] CLAUDE.md §7 규칙 준수
- [ ] 템플릿 문서 생성 (DOMAIN-BOUNDARY.md)

---

## 4. 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| tourism_orders 테이블 생성 | 즉시 삭제 |
| checkoutService 미사용 주문 | 즉시 수정 |
| orderType 누락 | 빌드 실패 |
| 금지 테이블 생성 시도 | CI 실패, PR 차단 |
| checkoutService 우회 | 런타임 에러, 즉시 수정 |
| OrderType 누락/무효 | 400 Bad Request |
| 차단된 OrderType 사용 | 400 Bad Request |
| 템플릿 미사용 | 개발 중단, 템플릿에서 재시작 |
| 금지 테이블 생성 | 마이그레이션 롤백, 테이블 삭제 |

> (2026-10-04 정합) "CI 실패, PR 차단" · "OrderType 누락/무효 → 400" · "런타임 에러" 는 현행 코드에 자동 장치가 없다(§2 정합 주석). 위반은 리뷰에서 막고, 테이블 삭제 · 롤백은 [PRODUCTION-MIGRATION-STANDARD](../baseline/operations/PRODUCTION-MIGRATION-STANDARD.md) 와 사용자 승인 절차를 따른다.

---

## 참조 문서

- 📄 템플릿 디렉터리: `docs/templates/o4o-store-template/`
- 📄 주문 위임 패턴: `docs/templates/o4o-store-template/ORDER-DELEGATION.md`
- 📄 도메인 경계: `docs/templates/o4o-store-template/DOMAIN-BOUNDARY.md`
- 📄 ~~Tourism 도메인: `apps/api-server/src/routes/tourism/DOMAIN-BOUNDARY.md`~~ (2026-10-04 정합: 은퇴 — 파일 없음)
- 📄 ~~가드 구현: `apps/api-server/src/guards/order-creation.guard.ts`~~ (2026-10-04 정합: 파일 없음 — 주문 생성 단일 지점은 `apps/api-server/src/services/checkout.service.ts`)
- 📄 검사 스크립트: `scripts/check-forbidden-tables.mjs`
- 📄 주문 계약: [`docs/baseline/E-COMMERCE-ORDER-CONTRACT.md`](../baseline/E-COMMERCE-ORDER-CONTRACT.md) (이동된 경로 정정)
- 📄 매장 commerce 경계: [`O4O-STORE-COMMERCE-BOUNDARY-V1`](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) · B2B 주문: [`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)

---

*Phase 9-A (2026-01-11) - CLAUDE.md 정리*
