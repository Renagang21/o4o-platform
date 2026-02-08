# Cosmetics Order Positioning

**Work Order**: WO-O4O-STRUCTURE-REFORM-PHASE5-B-V01
**Decision Date**: 2026-01-11
**Status**: DECIDED
**Decision**: Option B - 표준 주문 위임 (Standard Order Delegation)

---

## 1. Executive Summary

Cosmetics 서비스의 주문 구조를 재판정한 결과, **Option B (표준 주문 위임)**을 선택합니다.

> **결정**: Cosmetics는 O4O 플랫폼의 **표준 매장**이며,
> 주문 생성은 **E-commerce Core**를 통해 처리됩니다.

---

## 2. 조사 결과 (Investigation Findings)

### 2.1 현재 Cosmetics 구조 분석

| 항목 | 발견 내용 |
|------|-----------|
| Order Entity | **미존재** - cosmetics 엔티티에 Order 없음 |
| cosmetics_orders 테이블 | **미존재** - DB 스키마에 없음 |
| Order Controller | **Mock 구현** - API 검증만, DB 저장 없음 |
| 설계 의도 | **E-commerce Core 통합 예정** |

### 2.2 Cosmetics 엔티티 목록

```
cosmetics_brands        - 브랜드 정보
cosmetics_lines         - 제품 라인
cosmetics_products      - 상품 정보
cosmetics_price_policies - 가격 정책
cosmetics_product_logs  - 상품 변경 이력
cosmetics_price_logs    - 가격 변경 이력
```

**주문 관련 엔티티: 없음**

### 2.3 Order Controller 코드 분석

```typescript
// cosmetics-order.controller.ts (Line 503-506)
// 주문 응답 생성 (실제 DB 저장은 EcommerceOrderService 통해 처리)
// H2-0에서는 API 레이어 검증만 구현
const orderResponse = {
  id: `order-${Date.now()}`, // 임시 ID (실제 구현 시 DB에서 생성)
  // ...
};
```

**핵심 발견**:
- 현재 Controller는 Mock 응답만 반환
- 설계 문서에 "실제 DB 저장은 EcommerceOrderService 통해 처리"라고 명시
- **Option B가 원래 설계 의도였음**

---

## 3. 결정 (Decision)

### 3.1 선택된 옵션: Option B - 표준 주문 위임

| 항목 | 정책 |
|------|------|
| 주문 생성 | E-commerce Core (`POST /api/checkout/initiate`) |
| OrderType | `COSMETICS` |
| 주문 원장 | `checkout_orders` 테이블 |
| Cosmetics 책임 | 상품/브랜드/라인/가격 관리만 |

### 3.2 Option B 선택 이유

1. **원래 설계 의도와 일치**
   - Cosmetics Order Controller에 이미 "EcommerceOrderService 통해 처리" 명시
   - cosmetics_orders 테이블이 없음 = 독립 원장 의도 없었음

2. **플랫폼 일관성 확보**
   - GlycoPharm, Dropshipping과 동일한 패턴
   - 향후 Tourism 등 새 서비스와 동일 구조

3. **통합 리포트/정산 가능**
   - 단일 checkout_orders 테이블에서 모든 주문 조회
   - orderType으로 서비스별 필터링

4. **CLAUDE.md §11-14 호환**
   - Cosmetics는 "독립 DB 스키마"를 가지되, **상품 데이터만**
   - 주문은 Core에서 처리해도 규칙 위반 아님

### 3.3 버린 대안

#### Option A (완전 독립 유지) - 기각

| 이유 | 설명 |
|------|------|
| 설계 의도와 불일치 | 원래 E-commerce Core 통합 예정이었음 |
| 통합 리포트 불가 | 별도 원장 시 플랫폼 차원 분석 어려움 |
| 중복 구현 | 주문/결제 로직 재구현 필요 |

#### Option C (하이브리드) - 해당 없음

| 이유 | 설명 |
|------|------|
| cosmetics_orders 없음 | 기존 주문 데이터 자체가 없어 마이그레이션 불필요 |

---

## 4. Cosmetics 플랫폼 내 지위 확정

### 4.1 공식 분류

> **Cosmetics는 O4O 플랫폼의 표준 매장입니다.**

| 질문 | 답변 |
|------|------|
| O4O 표준 매장인가? | **예** |
| 독립 Commerce 실험군인가? | **아니오** |
| E-commerce Core 사용? | **예** |

### 4.2 책임 범위 정의

| 영역 | Cosmetics | E-commerce Core |
|------|-----------|-----------------|
| 상품 관리 | ✅ | - |
| 브랜드/라인 관리 | ✅ | - |
| 가격 정책 | ✅ | - |
| 주문 생성 | - | ✅ |
| 결제 처리 | - | ✅ |
| 주문 원장 | - | ✅ |

---

## 5. 구현 요구사항 (Phase 5-B′)

현재 Phase 5-B는 **판정만** 수행합니다.
아래 구현은 **다음 Phase**에서 진행됩니다.

### 5.1 Cosmetics Order Controller 수정 필요

```typescript
// 현재 (Mock)
const orderResponse = { id: `order-${Date.now()}`, ... };
res.status(201).json({ data: orderResponse });

// 변경 후 (E-commerce Core 위임)
const order = await checkoutService.createOrder({
  orderType: OrderType.COSMETICS,
  buyerId,
  items: orderItems,
  metadata: dto.metadata,
  // ...
});
res.status(201).json({ data: order });
```

### 5.2 변경 대상 파일

| 파일 | 변경 내용 |
|------|-----------|
| cosmetics-order.controller.ts | Mock → E-commerce Core 호출 |
| cosmetics.routes.ts | 변경 없음 (API 경로 유지) |

---

## 6. CLAUDE.md 반영 사항

### 6.1 §11 Cosmetics Domain Rules 업데이트

현재:
```markdown
### 11.1 DB 소유권 원칙
| 원칙 | 설명 |
| 독립 스키마 | cosmetics 도메인은 자체 DB 스키마를 가진다 |
```

추가 (Phase 5-B 결정):
```markdown
### 11.6 주문 처리 원칙 (Phase 5-B 확정)
| 원칙 | 설명 |
| 주문 생성 | E-commerce Core 통해 처리 |
| OrderType | COSMETICS |
| 주문 원장 | checkout_orders (Core 소유) |
| Cosmetics 책임 | 상품/브랜드/가격 관리만 |

> Cosmetics는 상품 데이터에 대해 독립 스키마를 유지하되,
> 주문/결제는 E-commerce Core를 통해 처리한다.
```

---

## 7. Decision Log

| 항목 | 내용 |
|------|------|
| 결정일 | 2026-01-11 |
| 결정자 | Claude Code (Phase 5-B) |
| 결정 | Option B - 표준 주문 위임 |
| 근거 | 원래 설계 의도, 플랫폼 일관성, cosmetics_orders 부재 |
| 변경 조건 | Cosmetics가 완전 독립 Commerce로 분리 결정 시 재검토 |

---

## 8. 관련 문서

- [E-COMMERCE-ORDER-CONTRACT.md](E-COMMERCE-ORDER-CONTRACT.md) - 주문 표준 계약
- CLAUDE.md §7 - E-commerce Core 절대 규칙
- CLAUDE.md §11-14 - Cosmetics Domain Rules
- WO-O4O-STRUCTURE-REFORM-PHASE5-A′-V01 - E-commerce Core 표준화

---

**Document Version**: 1.0
**Last Updated**: 2026-01-11
