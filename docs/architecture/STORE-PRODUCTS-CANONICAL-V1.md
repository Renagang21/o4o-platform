# STORE-PRODUCTS-CANONICAL-V1

> O4O Store Products 라우트 canonical 구조
>
> Status: Active
> Version: 1.0
> Created: 2026-05-07
> 관련 작업: WO-O4O-STORE-PRODUCTS-UI-CANONICAL-ALIGNMENT-V2
> 선행 문서:
>   - `docs/architecture/STORE-LAYER-ARCHITECTURE.md` (F3 frozen)
>   - `docs/baseline/EVENT-OFFER-STORE-INTEGRATION-V1.md`

---

## 1. 왜 이 문서가 필요한가

O4O Platform에는 3개 서비스(KPA-Society, GlycoPharm, K-Cosmetics)가
각자 독자적인 `/store/products` 화면을 유지하고 있었다.

- KPA → `/store/my-products` (StoreProductsManagerPage) canonical
- GlycoPharm → `/store/products` (PharmacyProducts, AI Tag 포함)
- K-Cosmetics → `/store/products` (Event Offer 탭 + 내 주문 제품 placeholder)

이 상황에서 두 가지 문제가 발생했다:

1. **중복**: K-Cosmetics `/store/products`의 Event Offer 탭이
   `/store-hub/event-offers` canonical route와 동일 데이터를 표시
2. **비정렬**: GlycoPharm이 KPA와 다른 UX 구조를 독자적으로 유지,
   "서비스별 유사 기능을 각자 구현" 패턴 고착화

→ **KPA canonical 기준으로 모든 서비스를 정렬**하기로 결정.
   KPA는 O4O 공통 구조의 reference implementation이다 (CLAUDE.md §13).

---

## 2. Canonical Route 구조

### 2.1 내 매장 상품 관리

```
/store/my-products  →  StoreProductsManagerPage (@o4o/store-products-ui)
```

| 항목 | 내용 |
|------|------|
| **역할** | 매장 경영자의 상품 목록 관리 (ProductMaster + Listing) |
| **진입 대상** | store_owner, pharmacy_owner, cosmetics_store_owner |
| **공유 패키지** | `@o4o/store-products-ui` (StoreProductsManagerPage) |
| **서비스별 wrapper** | Guard props (allowedRoles) + headerSlot |
| **기준 구현** | KPA-Society (`/store/my-products`) |

### 2.2 Event Offer 탐색

```
/store-hub/event-offers  →  서비스별 HubEventOffersPage
```

| 항목 | 내용 |
|------|------|
| **역할** | 승인된 Event Offer 목록 조회 및 매장 추가 진입 |
| **진입 대상** | store_owner, pharmacy_owner (허브 접근 권한 있는 역할) |
| **공급 데이터** | 서비스별 eventOfferApi.listActive() |
| **기준 구현** | KPA-Society (`/store-hub/event-offers`) |

### 2.3 /store/products — redirect 의미

```
/store/products  →  Navigate replace to /store/my-products
```

- GlycoPharm, K-Cosmetics 모두 redirect로 전환됨
- 기존 navigation 링크(StoreMainPage, StoreOverviewPage 등)가
  `/store/products`를 참조하더라도 자동으로 canonical로 진입
- **삭제 대상이 아니라 backward compat 진입점으로 유지**

---

## 3. 서비스별 정렬 결과

| 서비스 | /store/products 처리 | /store/my-products | /store-hub/event-offers |
|--------|---------------------|--------------------|------------------------|
| **KPA-Society** | → /store/commerce/products redirect | StoreProductsManagerPage ✓ | KpaEventOfferPage ✓ |
| **GlycoPharm** | → /store/my-products redirect ✓ | StoreProductsManagerPage ✓ | (구현 예정) |
| **K-Cosmetics** | → /store/my-products redirect ✓ | StoreProductsManagerPage ✓ | HubEventOffersPage ✓ |

> **Neture**: 공급자 역할 서비스로 Store Products 구조 적용 범위 외.
> Neture의 `/operator/all-registered-products` = 공급자 상품 승인 화면 (별도 도메인).

---

## 4. Guard 구조 — service-aware

### 4.1 원칙

모든 서비스의 `/store` 진입 Guard는 **service-aware** 구조를 사용한다.

```typescript
// ❌ 이전: 서비스 무관 공통 guard
requireAdmin()

// ✅ 현재: service scope 기반 guard
requireKpaScope('kpa-society:pharmacy_owner')
requireNetureScope('neture:operator')
requireCosmeticsScope('k-cosmetics:store_owner')
```

### 4.2 StoreProductsManagerPage guard 패턴

```tsx
// 서비스별 wrapper (thin)
<Route path="my-products" element={
  <RoleGuard allowedRoles={['glycopharm:store_owner', GLYCOPHARM_ROLES.ADMIN]}>
    <StoreProductsManagerPage />
  </RoleGuard>
} />
```

### 4.3 cross-service mutation 차단

- 각 서비스의 store API는 자신의 serviceKey scope 내에서만 동작
- cross-service mutation은 API Guard에서 차단됨
- **Shared endpoint 유지 정책**: `/store-hub/*` 계열 API는
  serviceKey 파라미터로 격리되므로 공유 endpoint 유지가 허용됨

---

## 5. 용어 정책

### 5.1 long-term canonical 용어

| 개념 | Canonical 용어 | 비고 |
|------|--------------|------|
| 매장 | **store** | DB 스키마, API endpoint, 공유 패키지 |
| 매장 경영자 | **store_owner** | role name canonical |
| 약국 | pharmacy | GlycoPharm 표시 용어 (DB는 store) |

### 5.2 서비스별 표시 용어

| 서비스 | 표시 용어 | 이유 |
|--------|---------|------|
| KPA-Society | 약국 / 약국 경영자 | 약사 대상 서비스, 의미 명확 |
| GlycoPharm | 약국 / 약국 경영자 | KPA canonical 기준 정렬 |
| K-Cosmetics | 매장 / 매장 경영자 | 비-의약품 서비스 |

### 5.3 pharmacy/store 동일 데이터 구조

`pharmacy`와 `store`는 **같은 데이터 구조**를 가리키는 서로 다른 표시 용어다.

```
DB: stores (table)          ← canonical
  web-kpa-society: pharmacy ← display alias
  web-glycopharm: pharmacy  ← display alias
  web-k-cosmetics: store    ← canonical with display
```

- 의약품 여부는 **공급자 등록 정책**으로 제어 (스키마 분리 아님)
- 새 서비스는 `store` 용어를 기본으로 사용

---

## 6. 관련 문서

| 문서 | 관계 |
|------|------|
| `docs/architecture/STORE-LAYER-ARCHITECTURE.md` (F3) | Store 패키지 계층 구조 (frozen) |
| `docs/baseline/EVENT-OFFER-STORE-INTEGRATION-V1.md` | Event Offer → Store 통합 설계 |
| `docs/baseline/EVENT-OFFER-COMMON-DOMAIN-V1.md` | Event Offer 공통 도메인 정의 |
| `docs/architecture/O4O-STORE-RULES.md` | Store/Order 생성 규칙 |
| `docs/architecture/USER-OPERATOR-FREEZE-V1.md` (F11) | Operator=membership 기반 구조 |

---

*Created: 2026-05-07*
*Status: Active*
