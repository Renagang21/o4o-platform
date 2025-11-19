# ✅ O4O Platform – C-2 구조 리팩토링 작업 요청서

### (Complexity Refactor Phase – Backend → Frontend 순서)

본 문서는 **C-2 단계(구조/가독성 중심 리팩토링)**를 공식적으로 시작하기 위한 작업 지시서입니다.
본 단계는 **비즈니스 로직의 변경 없이**,
C-1에서 발견된 복잡성 고위험 영역을 우선적으로 정비하는 것을 목표로 합니다.

**작성일**: 2025-11-19
**단계**: C-2 (구조 리팩토링)
**상태**: 준비 완료 ✅

---

# 📌 1. 리팩토링 목적

* 드랍쉬핑(판매자·공급자·파트너) 관련 핵심 기능들이
  **복잡한 구조 / 비대한 서비스 / 혼재된 책임 / 중복 코드**로 인해
  유지보수 비용이 급격히 증가한 상태임.

* C-2 단계의 목적은 다음과 같습니다:

  * **가독성 향상**
  * **파일/함수 구조 단순화**
  * **역할 분리(SRP 강화)**
  * **테스트 용이성 확보**
  * **후속 DS(도메인 리팩토링) 단계의 정확성 확보**

* **기능 동작은 변경하지 않는다.**
  UI, API 응답, 비즈니스 로직, 계산 공식은 그대로 유지한다.

---

# 📌 2. 리팩토링 전체 진행 순서 (권장 우선순위)

## ✔ A. Backend 핵심 서비스 정리

1. **C-2-A-1 — OrderService 구조 분리 (1순위)** 🔴 CRITICAL
2. **C-2-A-2 — CommissionEngine 구조 분리**
3. **C-2-A-3 — SettlementManagementService 구조 분리**
4. **C-2-A-4 — SellerProductService 구조 분리**

## ✔ B. Frontend Admin Dashboard 정리

5. **C-2-B-1 — LinkGenerator.tsx 분해**
6. **C-2-B-2 — SellerProducts.tsx 분해**
7. **C-2-B-3 — SharedPayoutRequests.tsx 분해**
8. **C-2-B-4 — ProductMarketplace.tsx 분해**

## ✔ C. Main Site 중복/비대한 페이지 정리

9. **C-2-C-1 — Seller/Supplier SettlementDetailPage 통합**
10. **C-2-C-2 — Seller/Supplier ProductsSection 공통화**

## ✔ D. ACF/설정 파일 정리

11. **C-2-D-1 — dropshipping-fields.ts 역할별 파일 분리**

---

# 📌 3. 공통 리팩토링 원칙 (모든 C-2 작업에 공통 적용)

모든 작업자는 아래 원칙을 반드시 준수해야 합니다.

## 3.1 절대 원칙 (MUST)

1. **비즈니스 로직은 절대 변경하지 않는다.**

   * 계산 공식
   * 주문 분리 기준
   * 정산 규칙
   * 커미션 적용 조건
   * API 응답 구조
     변경 금지.

2. **파일/클래스/함수 구조만 변경한다.**

3. **public 함수 시그니처는 그대로 유지한다.**

   * 외부 API 영향 최소화

4. **기존 로그/에러 메시지를 최대한 유지한다.**

5. **리팩토링은 작은 단위로 쪼개서 진행**

   * 하나의 PR은 하나의 목표만 포함
   * rollback 가능하도록 구성

6. **테스트/수동 검증은 시나리오 기반으로 수행**

   * C-1 기준 핵심 시나리오 확인

## 3.2 작업 단위 원칙

* **1 PR = 1 Service/Component 리팩토링**
* **커밋 단위는 최대한 작게** (예: "Extract OrderEventService", "Move commission calculation to OrderCommissionService")
* **각 단계마다 기능 테스트 수행**
* **리팩토링 전후 동작 비교 문서 작성**

## 3.3 코드 리뷰 원칙

* **비즈니스 로직 변경 여부 최우선 검토**
* **public API 변경 여부 확인**
* **트랜잭션 경계 유지 여부 확인**
* **에러 처리 로직 유지 여부 확인**

---

# 📌 4. 작업 단위 상세 지시서

아래는 "바로 작업 가능한 수준"으로 정리된 구체 지시서입니다.

---

# 4.1 **C-2-A-1 — OrderService 구조 리팩토링** 🔴

### 🎯 목표

* **1183 lines → 500 lines 이하**
* 역할별 서비스로 분리하여 SRP 개선
* 외부 public 메서드는 변경 금지

### 📁 대상 파일

`apps/api-server/src/services/OrderService.ts`

### 📊 현재 상태 (C-1 분석 결과)

* **Lines**: 1183
* **복잡성**: VERY HIGH
* **주요 문제**:
  * God Service - 너무 많은 책임
  * 주문/커미션/정산/알림이 모두 혼재
  * 트랜잭션 관리가 복잡하게 얽혀있음
  * 테스트 작성이 어려운 구조

### 📌 리팩토링 계획

아래 서비스들로 기능을 분리함:

| 새로운 서비스 | 파일 경로 | 책임 | 예상 Lines |
|--------------|----------|------|-----------|
| **OrderCreationService** | `services/order/OrderCreationService.ts` | 주문 생성, 기본 검증, 항목 검증 | ~200 |
| **OrderSplittingService** | `services/order/OrderSplittingService.ts` | 공급자별 주문 분리 (드랍쉬핑) | ~150 |
| **OrderCommissionService** | `services/order/OrderCommissionService.ts` | 주문 단위 커미션 계산 | ~150 |
| **OrderStatusService** | `services/order/OrderStatusService.ts` | 상태 변경, 취소/완료 검증 | ~200 |
| **OrderEventService** | `services/order/OrderEventService.ts` | 이벤트 생성/기록 | ~100 |
| **OrderNotificationService** | `services/order/OrderNotificationService.ts` | 알림 발송 래퍼 | ~80 |
| **OrderService (refactored)** | `services/OrderService.ts` | 코디네이터 - 위 서비스들 조합 | ~300 |

### 📌 분리 상세 계획

#### Phase 1: 이벤트 & 알림 분리
1. `OrderEventService` 추출
2. `OrderNotificationService` 추출
3. `OrderService`에서 이벤트/알림 로직 제거 → 새 서비스 호출로 대체

#### Phase 2: 커미션 계산 분리
1. `OrderCommissionService` 추출
2. 파트너 커미션 계산 로직 이동
3. `OrderService`에서 커미션 로직 제거 → 새 서비스 호출로 대체

#### Phase 3: 주문 분리 로직 추출
1. `OrderSplittingService` 추출
2. 공급자별 주문 분할 로직 이동
3. `OrderService`에서 분할 로직 제거 → 새 서비스 호출로 대체

#### Phase 4: 주문 생성 로직 정리
1. `OrderCreationService` 추출
2. 주문 생성, 검증 로직 이동
3. `OrderService.createOrder()`는 `OrderCreationService` + 기타 서비스 조합으로 재구성

#### Phase 5: 상태 관리 분리
1. `OrderStatusService` 추출
2. 상태 변경, 취소, 완료 로직 이동

#### Phase 6: 통합 및 정리
1. `OrderService`를 Coordinator로 재구성
2. public API 유지 확인
3. 트랜잭션 경계 재검토

### 📌 제약 조건

* ✅ public 메서드 이름/파라미터 변경 금지
* ✅ 트랜잭션 흐름 유지
* ✅ 기존 커미션/정산 생성 타이밍 유지
* ✅ 로그 메시지 유지
* ✅ 에러 처리 로직 유지

### 📌 테스트 시나리오

다음 시나리오들이 리팩토링 전후 동일하게 동작해야 함:

1. **일반 주문 생성** (드랍쉬핑 아님)
2. **드랍쉬핑 주문 생성** (공급자별 분할)
3. **파트너 추천 코드가 있는 주문 생성** (커미션 계산)
4. **장바구니에서 주문 생성**
5. **주문 상태 변경** (pending → confirmed → shipped → completed)
6. **주문 취소**
7. **주문 이벤트 생성 및 알림 발송**

### 📌 Done 기준

* ✅ OrderService.ts가 500 lines 이하로 감소
* ✅ 6개의 새로운 서비스 파일 생성
* ✅ 모든 public API가 동일하게 동작
* ✅ 위 7개 테스트 시나리오가 모두 통과
* ✅ 트랜잭션 경계가 유지됨
* ✅ 로그/에러 메시지가 유지됨

### 📌 상세 실행 계획

별도 문서 참조: `C2_A1_OrderService_Detailed_Plan.md`

---

# 4.2 **C-2-A-2 — CommissionEngine 구조 분리**

### 🎯 목표

* **684 lines → 400 lines 이하**
* 계산/정책/이벤트를 분리하여 가독성 향상

### 📁 대상 파일

`apps/api-server/src/services/CommissionEngine.ts`

### 새로운 파일 구조

| 서비스 | 파일 경로 | 책임 |
|--------|----------|------|
| **CommissionCalculator** (개선) | `services/commission/CommissionCalculator.ts` | 순수 계산 로직 |
| **CommissionPolicyResolver** | `services/commission/CommissionPolicyResolver.ts` | 정책 조회 및 적용 |
| **CommissionEventPublisher** | `services/commission/CommissionEventPublisher.ts` | 커미션 이벤트 발행 |
| **CommissionEngine** (refactored) | `services/CommissionEngine.ts` | 코디네이터 |

### Done 기준

* CommissionEngine.ts가 400 lines 이하
* 계산/정책/이벤트 로직이 명확히 분리됨
* 기존 커미션 계산 결과가 동일함

---

# 4.3 **C-2-A-3 — SettlementManagementService 구조 분리**

### 🎯 목표

* **696 lines → 400 lines 이하**
* 정산 생성/계산/확정 로직 분리

### 📁 대상 파일

`apps/api-server/src/services/SettlementManagementService.ts`

### 새로운 파일 구조

| 서비스 | 파일 경로 | 책임 |
|--------|----------|------|
| **SettlementCreationService** | `services/settlement/SettlementCreationService.ts` | 정산 생성 |
| **SettlementCalculationService** | `services/settlement/SettlementCalculationService.ts` | 정산 항목 계산 |
| **SettlementFinalizationService** | `services/settlement/SettlementFinalizationService.ts` | 정산 확정/폐기 |
| **SettlementManagementService** (refactored) | `services/SettlementManagementService.ts` | 코디네이터 |

### Done 기준

* SettlementManagementService.ts가 400 lines 이하
* 정산 생성/계산/확정 로직이 분리됨
* 정산 금액 계산이 동일함

---

# 4.4 **C-2-A-4 — SellerProductService 분해**

### 🎯 목표

* **678 lines → 400 lines 이하**
* CRUD/가격/동기화 책임 분리

### 📁 대상 파일

`apps/api-server/src/services/SellerProductService.ts`

### 새로운 파일 구조

| 서비스 | 파일 경로 | 책임 |
|--------|----------|------|
| **SellerProductPricingService** | `services/seller-product/SellerProductPricingService.ts` | 가격 전략, markup 계산 |
| **SellerProductSyncService** | `services/seller-product/SellerProductSyncService.ts` | 공급자-판매자 재고 동기화 |
| **SellerProductService** (refactored) | `services/SellerProductService.ts` | CRUD + 코디네이터 |

### Done 기준

* SellerProductService.ts가 400 lines 이하
* 가격/동기화 로직이 분리됨
* 상품 동기화가 정상 작동함

---

# 4.5 **C-2-B-1 — LinkGenerator.tsx 분해**

### 🎯 목표

* **906 lines → 300 lines 이하**
* UI/로직/상태 분리

### 📁 대상 파일

`apps/admin-dashboard/src/components/shortcodes/dropshipping/shared/LinkGenerator.tsx`

### 새 컴포넌트 구조

| 컴포넌트 | 파일 경로 | 책임 |
|----------|----------|------|
| **LinkList** | `shared/LinkGenerator/LinkList.tsx` | 링크 목록 테이블 |
| **LinkCreateForm** | `shared/LinkGenerator/LinkCreateForm.tsx` | 링크 생성 폼 |
| **LinkQRCodeModal** | `shared/LinkGenerator/LinkQRCodeModal.tsx` | QR 코드 모달 |
| **LinkShareModal** | `shared/LinkGenerator/LinkShareModal.tsx` | 공유 모달 |
| **LinkStatsCard** | `shared/LinkGenerator/LinkStatsCard.tsx` | 통계 카드 |
| **LinkGenerator** (refactored) | `shared/LinkGenerator/index.tsx` | 레이아웃 컴포넌트 |

### Custom Hooks

| Hook | 파일 경로 | 책임 |
|------|----------|------|
| **useLinks** | `hooks/useLinks.ts` | 링크 목록 fetch 및 상태 |
| **useLinkStats** | `hooks/useLinkStats.ts` | 링크 통계 fetch |
| **useLinkGenerator** | `hooks/useLinkGenerator.ts` | 링크 생성 로직 |

### Done 기준

* LinkGenerator.tsx가 300 lines 이하
* 5개의 하위 컴포넌트로 분리됨
* 3개의 custom hook으로 로직 분리됨
* partner와 affiliate에서 모두 정상 작동

---

# 4.6 **C-2-B-2 — SellerProducts.tsx 분해**

### 🎯 목표

* **852 lines → 300 lines 이하**

### 분해 구조

| 컴포넌트 | 파일 경로 | 책임 |
|----------|----------|------|
| **SellerProductsList** | `seller/SellerProducts/ProductsList.tsx` | 상품 목록 테이블 |
| **PricingStrategyDialog** | `seller/SellerProducts/PricingStrategyDialog.tsx` | 가격 전략 다이얼로그 |
| **ProductSettingsDialog** | `seller/SellerProducts/ProductSettingsDialog.tsx` | 상품 설정 다이얼로그 |
| **BulkEditDialog** | `seller/SellerProducts/BulkEditDialog.tsx` | 벌크 편집 다이얼로그 |
| **ProductStatsCard** | `seller/SellerProducts/ProductStatsCard.tsx` | 성능 통계 카드 |
| **SellerProducts** (refactored) | `seller/SellerProducts/index.tsx` | 레이아웃 컴포넌트 |

### Custom Hooks

* `useSellerProducts()`
* `usePricingStrategy()`
* `useBulkEdit()`

### Done 기준

* SellerProducts.tsx가 300 lines 이하
* 6개의 하위 컴포넌트로 분리됨
* 모든 다이얼로그가 정상 작동함

---

# 4.7 **C-2-B-3 — SharedPayoutRequests.tsx 분해**

### 🎯 목표

* **808 lines → 300 lines 이하**

### 분해 구조

| 컴포넌트 | 파일 경로 | 책임 |
|----------|----------|------|
| **PayoutRequestsList** | `shared/PayoutRequests/RequestsList.tsx` | 요청 목록 테이블 |
| **PayoutRequestFilters** | `shared/PayoutRequests/Filters.tsx` | 필터 UI |
| **PayoutRequestActions** | `shared/PayoutRequests/Actions.tsx` | 승인/거절 액션 |
| **PayoutRequestDetailModal** | `shared/PayoutRequests/DetailModal.tsx` | 상세 모달 |
| **SharedPayoutRequests** (refactored) | `shared/PayoutRequests/index.tsx` | 레이아웃 |

### Done 기준

* SharedPayoutRequests.tsx가 300 lines 이하
* 4개의 하위 컴포넌트로 분리됨

---

# 4.8 **C-2-B-4 — ProductMarketplace.tsx 분해**

### 🎯 목표

* **804 lines → 300 lines 이하**

### 분해 구조

| 컴포넌트 | 책임 |
|----------|------|
| **ProductMarketplaceGrid** | 상품 그리드 |
| **ProductMarketplaceFilters** | 검색 및 필터 |
| **ProductMarketplaceCard** | 상품 카드 |
| **AuthorizationRequestModal** | 인증 요청 모달 |
| **ProductMarketplace** (refactored) | 레이아웃 |

### Done 기준

* ProductMarketplace.tsx가 300 lines 이하
* 4개의 하위 컴포넌트로 분리됨

---

# 4.9 **C-2-C-1 — SettlementDetailPage 통합**

### 🎯 목표

* Seller/Supplier 정산 상세 페이지 중복 제거 (598 vs 586 lines → 공통 컴포넌트 + 각 300 lines)

### 📁 대상 파일

* `apps/main-site/src/pages/dashboard/SellerSettlementDetailPage.tsx` (598 lines)
* `apps/main-site/src/pages/dashboard/SupplierSettlementDetailPage.tsx` (586 lines)

### 새 파일 구성

| 컴포넌트 | 파일 경로 | 책임 |
|----------|----------|------|
| **SettlementDetailLayout** | `components/dashboard/settlement/SettlementDetailLayout.tsx` | 공통 레이아웃 |
| **SettlementItemsTable** | `components/dashboard/settlement/SettlementItemsTable.tsx` | 항목 테이블 |
| **SettlementCharts** | `components/dashboard/settlement/SettlementCharts.tsx` | 차트 |
| **SettlementActionsPanel** | `components/dashboard/settlement/SettlementActionsPanel.tsx` | 액션 버튼 |
| **SellerSettlementDetailPage** (refactored) | `pages/dashboard/SellerSettlementDetailPage.tsx` | Seller 전용 래퍼 (300 lines) |
| **SupplierSettlementDetailPage** (refactored) | `pages/dashboard/SupplierSettlementDetailPage.tsx` | Supplier 전용 래퍼 (300 lines) |

### Done 기준

* 두 페이지의 중복 코드가 공통 컴포넌트로 추출됨
* 각 페이지가 300 lines 이하
* Seller와 Supplier 페이지 모두 정상 작동

---

# 4.10 **C-2-C-2 — Seller/Supplier ProductsSection 공통화**

### 🎯 목표

* 중복 제거 (569 vs 546 lines → 공통 컴포넌트 + 각 250 lines)

### 📁 대상 파일

* `apps/main-site/src/components/dashboard/seller/SellerProductsSection.tsx` (569 lines)
* `apps/main-site/src/components/dashboard/supplier/SupplierProductsSection.tsx` (546 lines)

### 새 파일 구성

| 컴포넌트 | 파일 경로 | 책임 |
|----------|----------|------|
| **ProductsTableCommon** | `components/dashboard/common/ProductsTableCommon.tsx` | 공통 상품 테이블 |
| **ProductsFiltersCommon** | `components/dashboard/common/ProductsFiltersCommon.tsx` | 공통 필터 |
| **SellerProductsSection** (refactored) | `components/dashboard/seller/SellerProductsSection.tsx` | Seller 전용 래퍼 (250 lines) |
| **SupplierProductsSection** (refactored) | `components/dashboard/supplier/SupplierProductsSection.tsx` | Supplier 전용 래퍼 (250 lines) |

### Done 기준

* 중복 코드가 공통 컴포넌트로 추출됨
* 각 섹션이 250 lines 이하
* Seller와 Supplier 섹션 모두 정상 작동

---

# 4.11 **C-2-D-1 — dropshipping-fields.ts 역할별 파일 분리**

### 🎯 목표

* **858 lines → 역할별 파일로 분할 (각 200 lines 이하)**

### 📁 대상 파일

`apps/api-server/src/services/acf/dropshipping-fields.ts`

### 새 구조

```
apps/api-server/src/services/acf/dropshipping-fields/
  supplier-fields.ts      (~200 lines)
  seller-fields.ts        (~200 lines)
  partner-fields.ts       (~200 lines)
  commission-fields.ts    (~150 lines)
  common-fields.ts        (~100 lines)
  index.ts                (통합 export, ~50 lines)
```

### index.ts 구조

```typescript
import { supplierFields } from './supplier-fields.js';
import { sellerFields } from './seller-fields.js';
import { partnerFields } from './partner-fields.js';
import { commissionFields } from './commission-fields.js';
import { commonFields } from './common-fields.js';

export const dropshippingFields = [
  ...supplierFields,
  ...sellerFields,
  ...partnerFields,
  ...commissionFields,
  ...commonFields
];
```

### Done 기준

* dropshipping-fields.ts가 5개의 파일로 분리됨
* 각 파일이 200 lines 이하
* ACF 필드 등록이 정상 작동함
* 역할별 필드를 찾기 쉬워짐

---

# 📌 5. Done 기준 (C-2 전체)

## 5.1 정량적 기준

* 각 God 파일의 크기 **40–60% 이상 감소**:
  * OrderService: 1183 → 500 lines 이하 (58% 감소)
  * LinkGenerator: 906 → 300 lines 이하 (67% 감소)
  * SellerProducts: 852 → 300 lines 이하 (65% 감소)
  * dropshipping-fields: 858 → 각 200 lines 이하 (파일 분리)

## 5.2 정성적 기준

* ✅ 역할별 책임이 명확히 분리됨
* ✅ public API는 모든 단계에서 이전과 동일하게 유지됨
* ✅ 동작 테스트 결과 **기존 기능과 100% 동일**
* ✅ 코드 구조가 DS(도메인 리팩토링) 단계 분석에 적합한 상태로 정비됨

## 5.3 검증 기준

각 작업마다 다음을 확인:

1. **기능 테스트**: 핵심 시나리오가 모두 통과
2. **API 테스트**: public API 응답이 동일
3. **로그 검증**: 로그 메시지가 유지됨
4. **에러 처리**: 에러 케이스가 동일하게 처리됨
5. **트랜잭션**: 트랜잭션 경계가 유지됨

---

# 📌 6. 사후 단계 (C-2 이후)

C-2가 완료되면,
이제 편안한 상태에서 **DS-1/DS-2**를 시작하게 됩니다.

## DS-1: 드랍쉬핑 도메인 흐름 분석

* 공급자 → 판매자 → 주문 → 배송 → 정산 전체 흐름 분석
* 데이터 구조 정합성 분석
* 역할별 권한 및 접근 제어 분석

## DS-2: 드랍쉬핑 도메인 리팩토링

* 중복 정책/중복 계산 제거
* 데이터 모델 정규화
* 드랍쉬핑 도메인 전체 재정렬

---

# 📌 7. 작업 시작 방법

## 7.1 첫 번째 작업 시작

```bash
# 1. 브랜치 생성
git checkout -b refactor/c2-a1-order-service

# 2. 상세 계획 확인
cat docs/dev/investigations/dropshipping/C2_A1_OrderService_Detailed_Plan.md

# 3. Phase 1 시작 (이벤트 & 알림 분리)
# ...
```

## 7.2 작업 순서

1. **C-2-A-1** (OrderService) 먼저 시작 (가장 critical)
2. 완료 후 **C-2-A-2, C-2-A-3, C-2-A-4** 순차 진행
3. Backend 완료 후 **C-2-B** 시리즈 진행
4. **C-2-C, C-2-D**는 병렬 진행 가능

## 7.3 각 작업의 진행 방식

1. **상세 계획 문서 확인**
2. **Phase별로 작은 커밋 단위로 진행**
3. **각 Phase 완료 후 기능 테스트**
4. **전체 완료 후 최종 검증**
5. **PR 생성 및 리뷰**

---

# 📌 8. 참고 문서

* **C-1 복잡성 분석**: `docs/dev/investigations/dropshipping/dropshipping_complexity_audit.md`
* **C-2-A-1 상세 계획**: `docs/dev/investigations/dropshipping/C2_A1_OrderService_Detailed_Plan.md`
* **테스트 시나리오**: `docs/dev/investigations/dropshipping/C2_Test_Scenarios.md`
* **리팩토링 체크리스트**: `docs/dev/investigations/dropshipping/C2_Refactoring_Checklist.md`

---

**작업 시작 준비 완료 ✅**

이 문서 그대로 작업을 시작할 수 있습니다.
각 작업 단위별 상세 실행 계획은 별도 문서로 제공됩니다.

**문서 끝**
