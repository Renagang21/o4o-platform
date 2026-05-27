# IR-O4O-NETURE-SUPPLIER-STORE-OWNER-ENTITY-DRIFT-AUDIT-V1

> **조사 유형:** Entity/Role 의미 Drift 감사  
> **조사 일자:** 2026-05-27  
> **조사 대상:** NetureSupplier entity, SellerController, neture-identity.middleware — supplier/store_owner 혼용 여부  
> **코드 수정:** 없음 (조사 전용)  
> **선행 WO:** WO-O4O-NETURE-SELLER-LEGACY-CLEANUP-TO-STORE-OWNER-PARTICIPANT-V1 (2026-05-26)

---

## 1. 조사 배경

최근 WO에서 Neture 신규 가입 payload와 Market Trial `participantType`이 `seller` → `store_owner`로 정리되었다. 단, 다음은 명시적으로 보류했다:
- `neture:store_owner` role 미생성
- `SellerController`, `seller.service.ts`, `/seller/*` route 미변경
- `NetureSupplier` entity 미변경

본 IR은 이 보류된 영역이 현재 정책과 얼마나 충돌하는지, 그리고 후속 정비 범위를 판단하기 위한 조사다.

**현재 정책 원칙 (재확인):**
- Neture의 `store_owner`는 Market Trial 참여자 구분값 — 다른 서비스의 `store_owner` role과 무관
- `supplier`는 제품 공급자, Market Trial 개설 주체
- `store_owner`는 Market Trial 참여자, 커뮤니티/회원제 포럼 참여 대상
- `neture:store_owner` role 생성 금지

---

## 2. 조사 대상 파일 목록

### Backend
| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts` | Neture 공급자 entity |
| `apps/api-server/src/modules/neture/middleware/neture-identity.middleware.ts` | Supplier/Partner identity gate |
| `apps/api-server/src/modules/neture/controllers/seller.controller.ts` | 셀러/매장경영자 controller |
| `apps/api-server/src/modules/neture/services/seller.service.ts` | 셀러 비즈니스 로직 |
| `apps/api-server/src/modules/neture/services/supplier.service.ts` | 공급자 비즈니스 로직 |
| `apps/api-server/src/modules/neture/services/operator-registration.service.ts` | 가입/승인 흐름 |
| `apps/api-server/src/modules/neture/neture.routes.ts` | Neture route 마운트 |
| `apps/api-server/src/controllers/market-trial/marketTrialController.ts` | Market Trial 개설/참여 |
| `apps/api-server/src/controllers/market-trial/marketTrialOperatorController.ts` | Market Trial 운영자 조회 |
| `packages/market-trial/src/entities/MarketTrialParticipant.entity.ts` | 참여자 entity |
| `apps/api-server/src/modules/auth/controllers/auth-register.controller.ts` | 가입 처리 |
| `apps/api-server/src/database/migrations/1736950000000-CreateNetureTables.ts` | 초기 테이블 생성 |

### Frontend
| 파일 | 역할 |
|------|------|
| `services/web-neture/src/config/dashboard.ts` | 역할별 대시보드 라우팅 |
| `services/web-neture/src/pages/seller/` | 셀러/매장경영자 페이지 |
| `services/web-neture/src/pages/supplier/` | 공급자 페이지 |
| `services/web-neture/src/lib/api/seller.ts` | 셀러 API client |
| `services/web-neture/src/lib/api/supplier.ts` | 공급자 API client |
| `services/web-neture/src/App.tsx` | 프론트엔드 라우터 |

---

## 3. NetureSupplier Entity 분석

### 3-1. 컬럼 목록 (전체)

```typescript
// NetureSupplier.entity.ts — neture_suppliers 테이블

id: uuid (PK)
slug: varchar (UNIQUE)
logoUrl: varchar (nullable)
category: varchar (nullable)
shortDescription: text (nullable)
description: text (nullable)
pricingPolicy: text (nullable)
moq: varchar (nullable)
shippingStandard / shippingIsland / shippingMountain: text (nullable)
contactEmail / contactPhone / contactWebsite / contactKakao: (nullable)
contactEmailVisibility / contactPhoneVisibility / ... : varchar (default: 'public'/'private')
businessNumber: varchar(20) (nullable)
representativeName: varchar(100) (nullable)
businessAddress: text (nullable)
managerName / managerPhone: (nullable)
businessType: varchar(100) (nullable)
taxInvoiceEmail: varchar(255) (nullable)
businessItem: varchar(100) (nullable)
minOrderAmount / minOrderSurcharge: int (nullable)
orderConditionNote: text (nullable)
status: ENUM (PENDING, ACTIVE, INACTIVE, REJECTED) — default: PENDING
userId: uuid (nullable) ← 사용자 연결
approvedBy: uuid (nullable)
approvedAt: timestamp (nullable)
rejectedReason: text (nullable)
organizationId: uuid (nullable)
createdAt / updatedAt: timestamp
```

### 3-2. 의미 분석

**판정: NetureSupplier는 supplier 전용 entity다.**

- `participantType`, `role`, `userType`, `memberType` 등 구분 필드 없음
- 모든 필드는 B2B 공급자(사업자번호, 대표자, 배송 정책, MOQ, 가격 정책 등) 전용
- store_owner 사용자를 위한 필드 없음
- `status` enum은 공급자 승인 상태 (PENDING/ACTIVE/INACTIVE/REJECTED)

**결론:** 이 테이블에 store_owner 성격의 데이터가 저장되는 구조가 아니다.

### 3-3. store_owner와의 Row 생성 관계

```
가입 flow (auth-register.controller.ts):
  role='store_owner' → service_memberships 생성 (role='store_owner', status=pending)
  → neture_suppliers row 생성 안 됨

승인 flow (operator-registration.service.ts):
  role='store_owner' 승인 → service_memberships.status='active'
  → role_assignments에 역할 부여
  → neture_suppliers row 생성 안 됨 (role='supplier'일 때만 생성)
```

**판정:** store_owner 사용자는 현재 neture_suppliers row를 가지지 않는다.

---

## 4. neture-identity.middleware 분석

### 4-1. 4개 미들웨어 팩토리

| 팩토리 | 조회 대상 | 조건 | 용도 |
|--------|-----------|------|------|
| `createRequireActiveSupplier` | neture_suppliers WHERE user_id | status='ACTIVE' 필수 | 쓰기 작업 (상품 등록, 계약 해지) |
| `createRequireLinkedSupplier` | neture_suppliers WHERE user_id | row 존재 여부만 | 읽기 작업 (상품 조회, 대시보드) |
| `createRequireActivePartner` | neture_partners WHERE user_id | status='ACTIVE' 필수 | 파트너 쓰기 |
| `createRequireLinkedPartner` | neture_partners WHERE user_id | row 존재 여부만 | 파트너 읽기 |

**store_owner와의 관계:**
- store_owner를 위한 미들웨어 없음
- store_owner는 neture_suppliers row 없음 → requireLinkedSupplier 호출 시 401 반환
- store_owner 전용 접근은 `resolveStoreAccess()` 유틸리티가 별도 처리 (role_assignments + organization_members 기반)

### 4-2. 실제 route 사용

```
SellerController에서의 혼용 (핵심 Drift 지점):
  GET  /seller/contracts       → requireLinkedSupplier (supplier만 접근)
  POST /seller/contracts/:id/terminate → requireActiveSupplier (supplier만 접근)
  POST /seller/contracts/:id/commission → requireActiveSupplier (supplier만 접근)

  POST /seller/service-products/:id/apply → resolveStoreAccess() (store_owner 접근)
  GET  /seller/service-applications       → resolveStoreAccess() (store_owner 접근)
  GET  /seller/my-products                → resolveStoreAccess() 또는 userId 직접 사용
  POST /seller/orders                     → resolveStoreAccess() (store_owner 접근)
```

**판정: SellerController는 두 가지 사용자 유형을 혼용한다.**
- 상단 3개 엔드포인트: supplier 전용 (neture_suppliers row 필요)
- 하단 엔드포인트: store_owner 전용 (role_assignments 기반)

---

## 5. SellerController / seller.service 분석

### 5-1. 기능 목록과 정책 정합성

| 엔드포인트 | Guard | 실제 사용자 | 정책상 맞는가 |
|-----------|-------|-------------|---------------|
| GET /my-products | resolveStoreAccess() | store_owner | ✅ store_owner 기능 |
| GET /available-supply-products | resolveStoreAccess() | store_owner | ✅ store_owner 기능 |
| POST /service-products/:id/apply | resolveStoreAccess() | store_owner | ✅ store_owner 기능 |
| GET /service-applications | resolveStoreAccess() | store_owner | ✅ store_owner 기능 |
| GET /dashboard/ai-insight | requireAuth | 불명확 | ⚠️ 대상 불분명 |
| GET /contracts | requireLinkedSupplier | supplier | ⚠️ /seller 경로에 supplier 기능 |
| POST /contracts/:id/terminate | requireActiveSupplier | supplier | ⚠️ /seller 경로에 supplier 기능 |
| POST /contracts/:id/commission | requireActiveSupplier | supplier | ⚠️ /seller 경로에 supplier 기능 |
| POST /orders | resolveStoreAccess() | store_owner | ✅ store_owner 기능 |
| GET /orders / GET /orders/:id | resolveStoreAccess() | store_owner | ✅ store_owner 기능 |

### 5-2. 혼용의 의미

`SellerController`는 현재:
- **store_owner 기능** (`/seller/my-products`, `/seller/orders`, `/seller/service-products`)
- **supplier 기능** (`/seller/contracts`, `/seller/contracts/:id/terminate`)

이 두 가지 기능이 하나의 controller에서 다른 middleware/guard 조합으로 처리된다.  
`seller`라는 이름이 이 두 가지를 모두 포괄하려 했지만, 정책상 양쪽은 다른 개념이다.

### 5-3. seller.service.ts 기능

- `getMyProducts(sellerId)` — store_owner의 승인된 상품 목록
- `getAvailableSupplyProducts(sellerId)` — store_owner가 볼 수 있는 공급자 상품 카탈로그
- `getServiceApplications(organizationId)` — store_owner의 SERVICE 상품 신청 목록
- `enrichOrderItems()` — 주문 아이템에 공급자 정보를 붙임
- `resolveServiceKey()` — organization → service enrollment 매핑

**판정:** seller.service는 store_owner 중심의 기능이지만, 일부 supplier 데이터 참조가 섞여있다.  
"seller"라는 이름이 store_owner 기능에 붙어있어 의미 혼선이 생긴다.

---

## 6. SupplierController와의 관계

| 항목 | SupplierController | SellerController |
|------|-------------------|-----------------|
| 기본 Guard | requireActiveSupplier / requireLinkedSupplier | resolveStoreAccess() + requireLinkedSupplier 혼용 |
| 주요 기능 | 상품 등록/수정, 주문 수신, 정산, 견적 | 취급 상품 조회, 발주, 서비스 신청, 계약 조회 |
| Entity | NetureSupplier (neture_suppliers) | 주로 organization/user 기반 |
| 데이터 소스 | neture_suppliers | organization_members + role_assignments (store_owner 부분) |
| 공급자 계약 | NetureSellerPartnerContract | NetureSellerPartnerContract (같은 entity) |

**판정:** 공급자 계약(`neture_seller_partner_contracts`)은 SellerController에 있지만 사용자는 supplier다.  
계약의 "seller"는 store_owner(user_id 기준)이고, "partner"는 파트너이며, 계약 조회/해지는 supplier(공급자)가 하는 것으로 보인다.  
**이 구조는 "seller"가 어떤 역할인지 불명확하게 만드는 주요 원인이다.**

---

## 7. Dashboard / Guard / Route 분석

### 7-1. 대시보드 라우팅

```typescript
// services/web-neture/src/config/dashboard.ts
NETURE_ROLE_PRIORITY = [
  'platform:super_admin',
  'neture:admin',
  'neture:operator',
  'neture:supplier', 'supplier',     // → /supplier/dashboard
  'neture:partner', 'partner',       // → /partner/dashboard
  'store_owner',                     // → /seller/overview  (canonical)
  'neture:seller', 'seller',         // → /seller/overview  (legacy fallback)
]
```

**판정:** store_owner와 supplier는 **이미 분리된 대시보드**에 착지한다. 혼용 없음.

### 7-2. SUPPLIER_ROLES 상수

```typescript
export const SUPPLIER_ROLES: string[] = [
  'neture:supplier',
  'supplier',
  'partner',
  'seller',      // ← legacy 포함
  // 'store_owner' 없음 ← 올바른 분리
]
```

`store_owner`는 SUPPLIER_ROLES에 없음 → supplier 보호 route 접근 불가. 정책과 일치.

### 7-3. Frontend Route 구조

```
/seller/*      → MainLayout (seller 교육 + MyHandledProductsPage)
/supplier/*    → SupplierSpaceLayout (supplier 전용 운영 공간)
/store/*       → Store owner 운영 (별도 분리)
/partner/*     → 파트너 운영
```

`/seller/*`는 현재 store_owner가 착지하는 경로이지만 이름이 "seller"다.

---

## 8. Market Trial 분석

### 8-1. participantType 현황

```typescript
// MarketTrialParticipant.entity.ts (미변경)
export enum ParticipantType {
  SELLER = 'seller',    // ← enum 값이 여전히 'seller'
  PARTNER = 'partner',
}
// 'store_owner'는 enum에 없음
```

```typescript
// marketTrialController.ts (WO 이후 변경됨)
participantType: 'store_owner'   // 신규 row는 store_owner로 생성
```

**Drift:** enum에는 'seller'만 있고, 실제 코드는 'store_owner'를 생성하는 불일치 상태.

### 8-2. 개설 vs 참여 주체

```
Market Trial 개설: supplier만 가능
  - createTrial() → supplierId = req.user.id (supplier로 처리)

Market Trial 참여: 일반 인증 사용자 (KPA 회원 등)
  - joinTrial() → participantType: 'store_owner' (신규), 'seller' (레거시)
  - store_owner가 supplier 권한 없이 참여자로만 동작 ← 정책 일치
```

### 8-3. 운영자 UI 라벨

```typescript
// marketTrialOperatorController.ts
const participantTypeLabel = (v: string) => {
  if (v === 'store_owner' || v === 'seller') return '매장 경영자';
  if (v === 'partner') return '파트너';
  return v;
};
```

**판정:** 운영자 UI는 양쪽을 "매장 경영자"로 표시 — 사용자 대면 정합성 유지.  
그러나 entity enum 미업데이트는 기술 부채.

---

## 9. 잔존 seller 레거시 위치 (WO 이후)

| 파일 | 잔존 내용 | 심각도 |
|------|-----------|--------|
| `MarketTrialParticipant.entity.ts` | `SELLER = 'seller'` enum — 'store_owner'가 enum에 없음 | P1 |
| `NetureSellerPartnerContract.entity.ts` | `SELLER = 'seller'` 계약 당사자 타입 enum | P2 |
| `partner-contract.service.ts` | `actorType: 'seller' \| 'partner'` | P2 |
| `SellerController` contract 엔드포인트 | /seller/contracts에 supplier 기능 혼용 | P1 |
| `NETURE_ROLE_PRIORITY` | `'neture:seller', 'seller'` legacy 항목 | P3 (fallback 유지) |
| `SUPPLIER_ROLES` 상수 | `'seller'` 포함 (legacy role용) | P3 (의도적 유지) |
| `service_memberships.role` | 과거 'seller' 값이 DB에 존재 가능 | P2 (read-only 확인 필요) |

---

## 10. DB/test data 영향

### 확인된 사항
- `service_memberships.role = 'seller'` : 과거 가입자 row 존재 가능 (read-only DB 확인 필요)
- `market_trial_participants.participant_type = 'seller'` : WO 이전 생성 row 존재 가능
- `role_assignments.role = 'seller'` 또는 `'neture:seller'` : 존재 여부 불명확

### 판정
- 레거시 'seller' row 유지 필요 (운영자 UI가 backward compatible하게 처리 중)
- seed/test data에 'seller' 포함 가능 — 변경 전 확인 필요
- migration 없이 seed/test 정리만으로 충분한 경우는 test data만인 경우에 한정

---

## 11. 현재 구조 vs O4O 철학 충돌 체크

| 기준 | 현재 상태 | 판정 |
|------|-----------|------|
| Neture와 개별 서비스 분리 | store_owner가 다른 서비스 store_owner와 연결 안 됨 | ✅ 정합 |
| neture:store_owner role 미생성 | role_assignments에 neture:store_owner 없음 | ✅ 정합 |
| supplier ≠ store_owner | entity 레벨에서 분리됨 (neture_suppliers는 supplier 전용) | ✅ 정합 |
| Market Trial 개설/참여 boundary | supplier=개설, store_owner=참여 — 코드 분리됨 | ✅ 정합 |
| seller legacy O4O 정책 충돌 | 판매자/셀러 개념이 공급자와 혼용되는 명칭 잔존 | ⚠️ 명칭 Drift |
| SellerController 역할 명확성 | store_owner 기능과 supplier 계약 기능이 같은 컨트롤러에 | ⚠️ 구조 Drift |
| MarketTrialParticipant enum | 'seller' enum이 'store_owner' 신규 값과 불일치 | ⚠️ 기술 부채 |

---

## 12. 정리 후보안

### Option A: 현 구조 유지

store_owner는 legacy seller fallback으로만 처리하고 NetureSupplier entity, SellerController, /seller route 미변경.

| 항목 | 내용 |
|------|------|
| 장점 | 변경 없음, 리스크 최소 |
| 단점 | SellerController 역할 혼용 지속, enum 불일치 지속, 신규 개발자 혼란 |
| 수정 범위 | 없음 |
| DB migration | 불필요 |
| Market Trial 영향 | 없음 (현재 동작 유지) |
| O4O 정합성 | ⚠️ 명칭 Drift 지속 |

### Option B: SellerController 역할 분리 + enum 정합 (권장 최소 범위)

store_owner 기능(`/seller/my-products`, `/seller/orders`, `/seller/service-products`)은 `/store-owner/` 또는 `/seller/` 유지하되,  
supplier 계약 기능(`/seller/contracts`)은 `/supplier/contracts`로 이동.  
MarketTrialParticipant enum에 `STORE_OWNER = 'store_owner'` 추가.

| 항목 | 내용 |
|------|------|
| 장점 | supplier/store_owner 역할 경계 명확화, enum 정합, 기존 기능 유지 |
| 단점 | /seller/contracts → /supplier/contracts 이동 시 frontend 변경 필요 |
| 수정 범위 | SellerController(contract 엔드포인트 이동), MarketTrialParticipant enum, seller.ts API client |
| DB migration | 불필요 |
| Market Trial 영향 | enum 추가만 (레거시 row 그대로 유지) |
| O4O 정합성 | ✅ 개선 |

### Option C: NetureSupplier supplier 전용 정리 + store_owner 별도 participant 구조

NetureSupplier는 supplier 전용으로 명시하고,  
store_owner는 별도의 `neture_store_owner_profiles` 또는 Market Trial participant profile 구조로 분리.  
SellerController → `StoreOwnerController` 재설계. /seller/* → /store-owner/*.

| 항목 | 내용 |
|------|------|
| 장점 | O4O 철학 완전 정렬, 구조 명확, 향후 확장 용이 |
| 단점 | 대규모 변경, frontend 라우트 전면 변경, migration 가능성 |
| 수정 범위 | SellerController 재설계, seller.service 재설계, frontend /seller/* → /store-owner/*, App.tsx |
| DB migration | store_owner 관련 profile 테이블 생성 시 필요 |
| Market Trial 영향 | participantType 정리 완료 가능 |
| O4O 정합성 | ✅ 완전 정렬 |

---

## 13. 최종 권고

### 즉시 정리 권장 (Option B 범위)

| 항목 | 조치 |
|------|------|
| `MarketTrialParticipant` enum | `STORE_OWNER = 'store_owner'` 추가 — 'seller' 유지(레거시) |
| `/seller/contracts` 엔드포인트 | SupplierController 또는 별도 계약 controller로 이동 |
| SellerController 주석 | supplier 기능 혼용 명시 또는 분리 |

### 후속 WO 분리 권장

| WO | 내용 |
|----|------|
| `WO-O4O-NETURE-MARKET-TRIAL-PARTICIPANT-ENUM-FIX-V1` | MarketTrialParticipant enum에 STORE_OWNER 추가, 코드 참조 정리 |
| `WO-O4O-NETURE-SELLER-CONTRACT-TO-SUPPLIER-MIGRATION-V1` | /seller/contracts → /supplier/contracts 이동, frontend 조정 |

### 유지 항목

| 항목 | 이유 |
|------|------|
| `/seller/*` route 이름 | store_owner 착지 경로로 기능 중. 사용자 경험 영향 최소화. 점진적 rename은 Option C에서. |
| NETURE_ROLE_PRIORITY의 legacy 'seller' | 과거 가입자 대시보드 호환성 |
| SUPPLIER_ROLES의 'seller' | legacy role assignment 역방향 호환 |
| NetureSupplier entity | 변경 불필요 — supplier 전용으로 이미 명확 |
| neture-identity.middleware | supplier/partner 분리가 이미 올바름 |

### 삭제/rename 검토

| 항목 | 검토 사항 |
|------|----------|
| `seller.service.ts` 파일명 | 내용 대부분이 store_owner 기능 — `store-owner.service.ts` rename 검토 (Option C) |
| `SellerController` 명칭 | 혼용 지속 시 `StoreOwnerController`로 점진적 rename 검토 |

### DB 상태 확인 (read-only)

다음은 운영 DB에서 read-only 확인이 필요하다:
```sql
-- seller/store_owner role assignment 현황
SELECT role, COUNT(*) FROM role_assignments 
WHERE role IN ('seller', 'neture:seller', 'store_owner') GROUP BY role;

-- Market Trial seller participantType 잔존 현황
SELECT participant_type, COUNT(*) FROM market_trial_participants 
GROUP BY participant_type;

-- service_memberships seller role 현황
SELECT role, COUNT(*) FROM service_memberships 
WHERE service_key = 'neture' AND role IN ('seller', 'store_owner') GROUP BY role;
```

---

## 14. 현재 구조 요약

```
Neture 사용자 유형 (정책 기준):

supplier (공급자)
  저장: neture_suppliers (entity)
  role: neture:supplier
  대시보드: /supplier/dashboard
  미들웨어: requireActiveSupplier / requireLinkedSupplier
  기능: 상품 등록, 주문 수신, Market Trial 개설

store_owner (매장 경영자 — Market Trial 참여자 구분값)
  저장: service_memberships.role='store_owner' (가입) + role_assignments (승인)
  role: 별도 role 없음 (neture:store_owner 미생성)
  대시보드: /seller/overview (route 이름은 seller)
  미들웨어: resolveStoreAccess() (별도 유틸리티)
  기능: 취급 상품 조회, Market Trial 참여, 발주

SellerController (현재 혼용 상태)
  store_owner 기능: /my-products, /orders, /service-products (resolveStoreAccess)
  supplier 기능:   /contracts, /contracts/:id/terminate  (requireLinkedSupplier)
  → 분리 필요 (Option B 권장)
```

---

**작성:** IR-O4O-NETURE-SUPPLIER-STORE-OWNER-ENTITY-DRIFT-AUDIT-V1  
**상태:** 조사 완료, 후속 WO 대기  
**다음 단계:** 사용자 확인 후 Option B 범위(WO-O4O-NETURE-MARKET-TRIAL-PARTICIPANT-ENUM-FIX-V1, WO-O4O-NETURE-SELLER-CONTRACT-TO-SUPPLIER-MIGRATION-V1) 또는 Option C 전면 재설계 결정
