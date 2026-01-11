# O4O Store & Order Guardrails Rules (Mandatory)

> **CLAUDE.md §19-21에서 분리된 상세 규칙**
> 이 문서는 CLAUDE.md의 보조 문서입니다.

---

## 1. Tourism Domain Rules (§19)

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

### 1.4 Dropshipping 연계 규칙

Tourism은 **상품을 소유하지 않습니다**.

| 역할 | 책임 |
|------|------|
| Tourism | 상품을 설명하는 서비스 (콘텐츠) |
| Dropshipping | 상품을 공급하는 엔진 |
| E-commerce Core | 주문 원장 |

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
| 차단된 OrderType | **Hard Fail** (GLYCOPHARM 등) |

```typescript
// 허용된 OrderType
enum OrderType {
  GENERIC,      // 기본값 (경고 로깅)
  DROPSHIPPING,
  COSMETICS,
  TOURISM,
  GLYCOPHARM,   // 차단됨 (조회만 가능)
}

// 차단된 OrderType
const BLOCKED_ORDER_TYPES = [
  OrderType.GLYCOPHARM,  // Phase 5-A에서 차단
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
| `glycopharm_orders` | Phase 5-A에서 폐기 |
| `yaksa_orders` | Yaksa는 주문 기능 없음 |
| `neture_orders` | Neture는 Read-only Hub |
| Service 내 `createOrder()` | 책임 침범 |
| 서비스별 결제 API | Core 책임 |

### 2.6 GlycoPharm Legacy (Phase 9-A Frozen)

GlycoPharm은 독립 주문 구조로 인해 **영구 차단**된 서비스입니다.

| 상태 | 설명 |
|------|------|
| `glycopharm_orders` | READ-ONLY (역사 데이터 보존) |
| `glycopharm_order_items` | READ-ONLY (역사 데이터 보존) |
| `OrderType.GLYCOPHARM` | **BLOCKED** (신규 주문 차단) |

**교훈**: 독립 주문 구조가 왜 플랫폼 전체에 문제가 되는지 기록됨

> 📄 상세 분석: `docs/_platform/legacy/GLYCOPHARM-LEGACY-POSTMORTEM.md`

---

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

| 매장 | OrderType | 상태 |
|------|-----------|------|
| Cosmetics | `COSMETICS` | Active (참조 구현) |
| Tourism | `TOURISM` | Active (참조 구현) |

### 3.3 새 매장 생성 시 필수 절차

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
- [ ] ESM 호환 Entity 패턴 준수 (§4.1)
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

---

## 참조 문서

- 📄 템플릿 디렉터리: `docs/templates/o4o-store-template/`
- 📄 주문 위임 패턴: `docs/templates/o4o-store-template/ORDER-DELEGATION.md`
- 📄 도메인 경계: `docs/templates/o4o-store-template/DOMAIN-BOUNDARY.md`
- 📄 Tourism 도메인: `apps/api-server/src/routes/tourism/DOMAIN-BOUNDARY.md`
- 📄 가드 구현: `apps/api-server/src/guards/order-creation.guard.ts`
- 📄 검사 스크립트: `scripts/check-forbidden-tables.mjs`
- 📄 주문 계약: `docs/_platform/E-COMMERCE-ORDER-CONTRACT.md`

---

*Phase 9-A (2026-01-11) - CLAUDE.md 정리*
