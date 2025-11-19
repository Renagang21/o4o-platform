# Dropshipping Complexity Audit (C-1)

본 문서는 o4o-platform 내 드랍쉬핑 관련 코드의 복잡성을 조사한 결과를 정리한 것입니다.
이 단계에서는 비즈니스 로직 변경 없이, 구조/가독성 중심으로 복잡성을 계량·기록합니다.

**작성일**: 2025-11-19
**분석 범위**: 드랍쉬핑(공급자-판매자-파트너), 주문, 정산, 커미션 관련 코드

---

## 1. 조사 범위(Scope)

### 1.1 프론트엔드
- **apps/main-site/src/pages/dashboard/** - 역할별 대시보드 페이지
- **apps/main-site/src/components/dashboard/** - 대시보드 컴포넌트
- **apps/admin-dashboard/src/components/shortcodes/dropshipping/** - 드랍쉬핑 Shortcode 컴포넌트
- **apps/admin-dashboard/src/pages/dropshipping/** - Admin 드랍쉬핑 페이지

### 1.2 API 서버
- **apps/api-server/src/services/** - 비즈니스 로직 서비스
  - OrderService, SellerService, SupplierService
  - SettlementService, SettlementManagementService
  - CommissionCalculator, CommissionEngine
  - SellerProductService, SellerAuthorizationService
- **apps/api-server/src/controllers/** - API 컨트롤러
- **apps/api-server/src/entities/** - 데이터 엔티티

### 1.3 CPT/ACF/Shortcodes
- **apps/api-server/src/services/acf/dropshipping-fields.ts** - ACF 필드 정의
- **apps/api-server/src/services/cpt/dropshipping-cpts.ts** - CPT 정의
- **packages/shortcodes/src/dropshipping/** - Shortcode 구현체

---

## 2. 파일 단위 복잡성 목록

### 2.1 프론트엔드 - Admin Dashboard Shortcodes

| ID | Path | Layer | Type | Lines | Responsibilities | ComplexityLevel | Notes |
|----|------|-------|------|-------|------------------|-----------------|-------|
| FE-SC-01 | apps/admin-dashboard/src/components/shortcodes/dropshipping/shared/LinkGenerator.tsx | frontend | Component | 906 | 링크 생성 + QR 코드 + 공유 기능 + 통계 + 폼 관리 + API 호출 | **High** | UI/로직/상태 관리가 하나의 거대한 컴포넌트에 집중. 역할 분리 필요 |
| FE-SC-02 | apps/admin-dashboard/src/components/shortcodes/dropshipping/seller/SellerProducts.tsx | frontend | Component | 852 | 상품 목록 + 가격 전략 관리 + 동기화 설정 + 벌크 편집 + 성능 통계 | **High** | 다중 기능이 한 컴포넌트에 집중, 5개 이상의 Dialog/Modal 관리 |
| FE-SC-03 | apps/admin-dashboard/src/components/shortcodes/dropshipping/shared/SharedPayoutRequests.tsx | frontend | Component | 808 | 정산 요청 목록 + 상태 관리 + 필터링 + 승인/거절 처리 | **High** | 복잡한 상태 로직과 API 호출이 혼재 |
| FE-SC-04 | apps/admin-dashboard/src/components/shortcodes/dropshipping/seller/ProductMarketplace.tsx | frontend | Component | 804 | 공급상품 마켓플레이스 + 검색 + 필터 + 인증 요청 + 상품 import | **High** | 마켓플레이스 전체 로직이 단일 컴포넌트 |
| FE-SC-05 | apps/admin-dashboard/src/components/shortcodes/dropshipping/seller/SellerSettlement.tsx | frontend | Component | 651 | 정산 내역 + 상세 모달 + 차트 + 통계 + 필터링 | **High** | 정산 관련 모든 UI가 집중 |
| FE-SC-06 | apps/admin-dashboard/src/components/shortcodes/dropshipping/partner/PartnerCommissionDashboard.tsx | frontend | Component | 614 | 파트너 커미션 대시보드 + 통계 + 차트 + 내역 | High | 대시보드 전체 로직 |
| FE-SC-07 | apps/admin-dashboard/src/components/shortcodes/dropshipping/seller/SellerDashboard.tsx | frontend | Component | 578 | 판매자 대시보드 + 통계 카드 + 차트 + 최근 활동 | High | 다중 섹션을 하나의 컴포넌트에서 렌더링 |
| FE-SC-08 | apps/admin-dashboard/src/components/shortcodes/dropshipping/RoleVerification.tsx | frontend | Component | 517 | 역할 검증 + 에러 핸들링 + 로딩 상태 | High | 인증/인가 로직이 UI와 혼재 |
| FE-SC-09 | apps/admin-dashboard/src/components/shortcodes/dropshipping/partner/PartnerCommissions.tsx | frontend | Component | 460 | 커미션 내역 + 필터 + 상세 보기 | Medium | 목록과 상세를 함께 처리 |
| FE-SC-10 | apps/admin-dashboard/src/components/shortcodes/dropshipping/UserDashboard.tsx | frontend | Component | 451 | 사용자 대시보드 라우팅 + 역할별 분기 | Medium | 역할별 라우팅 로직 |
| FE-SC-11 | apps/admin-dashboard/src/components/shortcodes/dropshipping/partner/PartnerProducts.tsx | frontend | Component | 430 | 파트너 상품 목록 + 링크 생성 | Medium | 상품 선택과 링크 생성 |
| FE-SC-12 | apps/admin-dashboard/src/components/shortcodes/dropshipping/supplier/SupplierProducts.tsx | frontend | Component | 362 | 공급자 상품 목록 + CRUD | Medium | 기본 CRUD 기능 |
| FE-SC-13 | apps/admin-dashboard/src/components/shortcodes/dropshipping/partner/PartnerDashboard.tsx | frontend | Component | 341 | 파트너 대시보드 개요 | Medium | 통계와 요약 정보 표시 |

### 2.2 프론트엔드 - Main Site Dashboard Pages

| ID | Path | Layer | Type | Lines | Responsibilities | ComplexityLevel | Notes |
|----|------|-------|------|-------|------------------|-----------------|-------|
| FE-PG-01 | apps/main-site/src/pages/dashboard/SellerSettlementDetailPage.tsx | frontend | Page | 598 | 정산 상세 + 항목 목록 + 차트 + 내역 다운로드 | **High** | 정산 상세 페이지의 모든 로직 |
| FE-PG-02 | apps/main-site/src/pages/dashboard/SupplierSettlementDetailPage.tsx | frontend | Page | 586 | 공급자 정산 상세 + 항목 목록 + 차트 | **High** | SellerSettlementDetailPage와 유사한 중복 구조 |
| FE-PG-03 | apps/main-site/src/pages/dashboard/SellerProductCreatePage.tsx | frontend | Page | 564 | 공급상품 선택 + 인증 요청 + 판매상품 생성 | **High** | 복잡한 워크플로우 (선택 → 인증 → 생성) |
| FE-PG-04 | apps/main-site/src/pages/dashboard/SupplierOrderDetailPage.tsx | frontend | Page | 443 | 주문 상세 + 상태 변경 + 배송 처리 | Medium | 주문 상세와 액션 처리 |
| FE-PG-05 | apps/main-site/src/pages/dashboard/SellerSettlementsPage.tsx | frontend | Page | 379 | 정산 목록 + 필터 + 정산 생성 요청 | Medium | 목록과 생성 기능 |
| FE-PG-06 | apps/main-site/src/pages/dashboard/SupplierProductAuthorizationsPage.tsx | frontend | Page | 373 | 인증 요청 목록 + 승인/거절 처리 | Medium | 인증 관리 페이지 |
| FE-PG-07 | apps/main-site/src/pages/dashboard/SupplierSettlementsPage.tsx | frontend | Page | 296 | 공급자 정산 목록 + 필터 | Medium | 목록 페이지 |
| FE-PG-08 | apps/main-site/src/pages/dashboard/SellerProductEditPage.tsx | frontend | Page | 292 | 판매상품 수정 폼 | Medium | 단일 폼 페이지 |

### 2.3 프론트엔드 - Dashboard Components

| ID | Path | Layer | Type | Lines | Responsibilities | ComplexityLevel | Notes |
|----|------|-------|------|-------|------------------|-----------------|-------|
| FE-CM-01 | apps/main-site/src/components/dashboard/seller/SellerProductsSection.tsx | frontend | Component | 569 | 판매상품 섹션 + 목록 + 상태 관리 + 액션 | **High** | 섹션 전체를 단일 컴포넌트로 구현 |
| FE-CM-02 | apps/main-site/src/components/dashboard/supplier/SupplierProductsSection.tsx | frontend | Component | 546 | 공급상품 섹션 + 목록 + CRUD | **High** | 유사한 구조로 중복 |
| FE-CM-03 | apps/main-site/src/components/dashboard/seller/SellerOrdersSection.tsx | frontend | Component | 490 | 판매자 주문 섹션 + 목록 + 상태 처리 | Medium | 주문 관리 섹션 |
| FE-CM-04 | apps/main-site/src/components/dashboard/supplier/SupplierOrdersSection.tsx | frontend | Component | 461 | 공급자 주문 섹션 + 목록 | Medium | 주문 관리 섹션 |
| FE-CM-05 | apps/main-site/src/components/dashboard/partner/PartnerLinksSection.tsx | frontend | Component | 451 | 파트너 링크 섹션 + 목록 + 통계 | Medium | 링크 관리 |
| FE-CM-06 | apps/main-site/src/components/dashboard/supplier/SupplierProductForm.tsx | frontend | Component | 384 | 공급상품 폼 + 검증 + 이미지 업로드 | Medium | 복잡한 폼 로직 |

### 2.4 API 서버 - Services

| ID | Path | Layer | Type | Lines | Responsibilities | ComplexityLevel | Notes |
|----|------|-------|------|-------|------------------|-----------------|-------|
| BE-SV-01 | apps/api-server/src/services/OrderService.ts | api | Service | 1183 | 주문 생성 + 주문 분할(드랍쉬핑) + 커미션 계산 + 주문 이벤트 + 상태 변경 + 정산 연동 + 알림 | **High** | God Service. 너무 많은 역할을 수행. 주문/커미션/정산/알림이 모두 혼재 |
| BE-SV-02 | apps/api-server/src/services/SettlementManagementService.ts | api | Service | 696 | 정산 생성 + 정산 완료 + 항목 관리 + 정산 계산 | **High** | 정산의 모든 비즈니스 로직을 포함 |
| BE-SV-03 | apps/api-server/src/services/CommissionEngine.ts | api | Service | 684 | 커미션 계산 + 정책 적용 + 커미션 이벤트 처리 | **High** | 커미션 엔진 전체 로직 |
| BE-SV-04 | apps/api-server/src/services/SellerProductService.ts | api | Service | 678 | 판매상품 CRUD + 가격 관리 + 재고 동기화 + 인증 검증 | **High** | 상품 관련 모든 로직 |
| BE-SV-05 | apps/api-server/src/services/SellerAuthorizationService.ts | api | Service | 539 | 판매자 인증 요청 + 승인/거절 + 상태 관리 + 알림 | **High** | 인증 워크플로우 전체 |
| BE-SV-06 | apps/api-server/src/services/SellerService.ts | api | Service | 434 | 판매자 정보 관리 + 통계 조회 | Medium | 기본 CRUD + 통계 |
| BE-SV-07 | apps/api-server/src/services/SettlementService.ts | api | Service | 316 | 정산 조회 + 필터링 + 상세 조회 | Medium | 조회 중심 서비스 |
| BE-SV-08 | apps/api-server/src/services/CommissionCalculator.ts | api | Service | 213 | 커미션 계산 로직 + 정책 적용 | Medium | 계산 유틸리티 |

### 2.5 API 서버 - Controllers

| ID | Path | Layer | Type | Lines | Responsibilities | ComplexityLevel | Notes |
|----|------|-------|------|-------|------------------|-----------------|-------|
| BE-CT-01 | apps/api-server/src/controllers/SellerController.ts | api | Controller | 453 | 판매자 API 엔드포인트 (상품, 주문, 정산 등) | Medium | 여러 엔드포인트를 하나의 컨트롤러에서 관리 |
| BE-CT-02 | apps/api-server/src/controllers/SupplierController.ts | api | Controller | 104 | 공급자 API 엔드포인트 | Low | 기본적인 엔드포인트 |

### 2.6 API 서버 - Entities

| ID | Path | Layer | Type | Lines | Responsibilities | ComplexityLevel | Notes |
|----|------|-------|------|-------|------------------|-----------------|-------|
| BE-EN-01 | apps/api-server/src/entities/Order.ts | api | Entity | 300 | 주문 엔티티 + 관계 + 타입 정의 | Medium | 복잡한 관계와 타입 |
| BE-EN-02 | apps/api-server/src/entities/Settlement.ts | api | Entity | 140 | 정산 엔티티 + 관계 | Low | 기본 엔티티 |
| BE-EN-03 | apps/api-server/src/entities/SellerProduct.ts | api | Entity | ~200 | 판매상품 엔티티 + 관계 | Medium | 다수의 관계 설정 |

### 2.7 CPT/ACF/Shortcodes

| ID | Path | Layer | Type | Lines | Responsibilities | ComplexityLevel | Notes |
|----|------|-------|------|-------|------------------|-----------------|-------|
| CP-01 | apps/api-server/src/services/acf/dropshipping-fields.ts | cpt-acf | ACF | 858 | 드랍쉬핑 관련 모든 ACF 필드 정의 (공급자, 판매자, 파트너, 커미션 등) | **High** | 모든 역할의 ACF 필드를 단일 파일에서 관리. 매우 긴 배열 구조 |
| CP-02 | apps/api-server/src/services/cpt/dropshipping-cpts.ts | cpt-acf | CPT | 174 | 드랍쉬핑 CPT 정의 + 등록 | Low | 기본 CPT 등록 로직 |
| SC-01 | packages/shortcodes/src/dropshipping/SellerDashboard.tsx | shortcode | Shortcode | ~250 | 판매자 대시보드 Shortcode | Medium | 기본 대시보드 |
| SC-02 | packages/shortcodes/src/dropshipping/SupplierDashboard.tsx | shortcode | Shortcode | ~250 | 공급자 대시보드 Shortcode | Medium | 기본 대시보드 |

---

## 3. 상위 복잡성 후보 (Top High-Complexity Targets)

드랍쉬핑 리팩토링(C-2 이후)의 우선 후보가 될, **복잡성이 특히 높은 파일/컴포넌트**를 정리합니다.

### 3.1 BE-SV-01: OrderService.ts

**Path**: `apps/api-server/src/services/OrderService.ts`
**Lines**: 1183
**ComplexityLevel**: **VERY HIGH**

**문제 요약:**
- 단일 서비스에서 너무 많은 책임을 수행하는 God Service
- 주요 역할:
  1. 주문 생성 (createOrder, createOrderFromCart)
  2. 드랍쉬핑 주문 분할 (split order by supplier)
  3. 파트너 커미션 계산 및 생성
  4. 주문 이벤트 생성 및 관리
  5. 주문 상태 변경 (updateOrderStatus, cancelOrder 등)
  6. 정산 연동 (Settlement 생성 트리거)
  7. 알림 발송 (notificationService 호출)
  8. 주문 조회 및 필터링
- 트랜잭션 관리가 복잡하게 얽혀있음
- 테스트 작성이 어려운 구조 (too many dependencies)

**예상 리팩토링 방향:**
1. **주문 생성**과 **커미션 계산**을 분리
   - `OrderCreationService`: 주문 생성 및 검증
   - `OrderCommissionService`: 주문 시 커미션 계산 및 기록
2. **주문 분할 로직** 분리
   - `DropshippingOrderSplitter`: 공급자별 주문 분할 전담
3. **이벤트 처리** 분리
   - `OrderEventHandler`: 주문 이벤트 생성/관리 전담
4. **상태 변경 로직** 분리
   - `OrderStatusManager`: 주문 상태 변경 및 검증
5. OrderService는 **코디네이터 역할**로 축소
   - 각 전담 서비스를 조합하여 워크플로우 관리

**영향 범위:**
- SellerController, SupplierController
- SettlementService
- CommissionEngine
- 주문 관련 모든 API 엔드포인트

---

### 3.2 FE-SC-01: LinkGenerator.tsx

**Path**: `apps/admin-dashboard/src/components/shortcodes/dropshipping/shared/LinkGenerator.tsx`
**Lines**: 906
**ComplexityLevel**: **VERY HIGH**

**문제 요약:**
- 단일 React 컴포넌트에서 너무 많은 기능을 처리
- 주요 역할:
  1. 링크 목록 표시 (Table UI)
  2. 링크 생성 폼 (Dialog)
  3. QR 코드 생성 및 표시
  4. 링크 공유 기능 (SNS 공유)
  5. 링크 통계 표시 (클릭, 전환 등)
  6. 필터링 및 검색
  7. API 호출 (fetch links, create link, delete link)
  8. 복잡한 상태 관리 (10+ useState)
- 900+ 라인의 단일 파일로 가독성이 매우 낮음
- 재사용성 없음 (partner와 affiliate에서 roleType prop만 다르게 전달)

**예상 리팩토링 방향:**
1. **UI 컴포넌트 분리**
   - `LinkList`: 링크 목록 테이블
   - `LinkCreateForm`: 링크 생성 폼
   - `LinkQRCodeModal`: QR 코드 모달
   - `LinkShareModal`: 공유 모달
   - `LinkStatsCard`: 통계 카드
2. **데이터 fetch 로직 분리**
   - Custom Hook: `useLinks()`, `useProducts()`
3. **비즈니스 로직 분리**
   - 유틸 함수: `generateQRCode()`, `copyToClipboard()`, `generateShareUrl()`
4. LinkGenerator는 **레이아웃 컴포넌트**로만 남김
   - 각 섹션 컴포넌트를 조합하여 배치

**영향 범위:**
- Partner 대시보드
- Affiliate 대시보드
- Link 관련 모든 기능

---

### 3.3 FE-SC-02: SellerProducts.tsx

**Path**: `apps/admin-dashboard/src/components/shortcodes/dropshipping/seller/SellerProducts.tsx`
**Lines**: 852
**ComplexityLevel**: **VERY HIGH**

**문제 요약:**
- 판매자 상품 관리의 모든 기능이 단일 컴포넌트에 집중
- 주요 역할:
  1. 상품 목록 표시 (Table)
  2. 가격 전략 관리 (PricingStrategy Dialog)
  3. 상품 설정 (Settings Dialog)
  4. 동기화 설정 (Sync Settings)
  5. 벌크 편집 (Bulk Edit Mode)
  6. 상품 상태 변경 (활성/비활성)
  7. 성능 통계 표시
  8. 필터링 및 탭 관리
- 5개 이상의 Dialog/Modal을 동시에 관리
- 복잡한 상태 관리 (15+ useState)

**예상 리팩토링 방향:**
1. **페이지 분리**
   - `SellerProductsListPage`: 목록 페이지
   - `SellerProductEditPage`: 개별 상품 편집
2. **Dialog/Modal 컴포넌트 분리**
   - `PricingStrategyDialog`
   - `ProductSettingsDialog`
   - `BulkEditDialog`
3. **Custom Hooks 분리**
   - `useSellerProducts()`: 상품 목록 fetch 및 상태
   - `usePricingStrategy()`: 가격 전략 로직
   - `useBulkEdit()`: 벌크 편집 로직
4. **UI 컴포넌트 분리**
   - `ProductTable`: 상품 테이블
   - `ProductCard`: 상품 카드 (옵션)
   - `ProductStatsCard`: 통계 카드

**영향 범위:**
- Seller 대시보드
- 상품 관리 워크플로우

---

### 3.4 CP-01: dropshipping-fields.ts

**Path**: `apps/api-server/src/services/acf/dropshipping-fields.ts`
**Lines**: 858
**ComplexityLevel**: **VERY HIGH**

**문제 요약:**
- 모든 드랍쉬핑 역할의 ACF 필드 정의가 단일 파일에 집중
- 포함 내역:
  - 공급자 (Supplier) ACF 필드
  - 판매자 (Seller) ACF 필드
  - 파트너 (Partner) ACF 필드
  - 커미션 정책 ACF 필드
  - 기타 드랍쉬핑 관련 필드
- 매우 긴 배열 구조로 가독성이 낮음
- 역할별 필드가 섞여있어 유지보수 어려움

**예상 리팩토링 방향:**
1. **역할별 파일 분리**
   - `supplier-fields.ts`: 공급자 ACF 필드
   - `seller-fields.ts`: 판매자 ACF 필드
   - `partner-fields.ts`: 파트너 ACF 필드
   - `commission-fields.ts`: 커미션 ACF 필드
2. **통합 export**
   - `dropshipping-fields.ts`는 각 파일을 import하여 통합 export
3. **필드 그룹 함수화**
   - 반복되는 필드 패턴을 함수로 추출
   - 예: `createPricingField()`, `createCommissionField()`

**영향 범위:**
- ACF 필드 등록
- CPT 관련 모든 기능

---

### 3.5 BE-SV-03: CommissionEngine.ts

**Path**: `apps/api-server/src/services/CommissionEngine.ts`
**Lines**: 684
**ComplexityLevel**: **HIGH**

**문제 요약:**
- 커미션 계산 및 이벤트 처리를 모두 수행
- 주요 역할:
  1. 커미션 계산 (파트너, 판매자 등)
  2. 커미션 정책 적용
  3. 커미션 이벤트 생성 및 발행
  4. 커미션 집계 및 통계
- 계산 로직과 이벤트 처리가 혼재
- 정책 적용 로직이 복잡

**예상 리팩토링 방향:**
1. **계산 로직 분리**
   - `CommissionCalculator`: 순수 계산 로직 (이미 존재하나 개선 필요)
2. **정책 적용 로직 분리**
   - `CommissionPolicyResolver`: 정책 조회 및 적용
3. **이벤트 처리 분리**
   - `CommissionEventPublisher`: 커미션 이벤트 발행 전담
4. CommissionEngine은 **코디네이터**로 역할 축소

**영향 범위:**
- OrderService
- SettlementService
- 파트너/판매자 커미션 관련 모든 기능

---

### 3.6 BE-SV-04: SellerProductService.ts

**Path**: `apps/api-server/src/services/SellerProductService.ts`
**Lines**: 678
**ComplexityLevel**: **HIGH**

**문제 요약:**
- 판매상품 관련 모든 로직을 포함
- 주요 역할:
  1. 판매상품 CRUD
  2. 가격 관리 (markup, pricing strategy)
  3. 재고 동기화 (공급자 → 판매자)
  4. 인증 검증 (authorization check)
  5. 상품 상태 관리
  6. 통계 조회
- 여러 책임이 혼재되어 있음

**예상 리팩토링 방향:**
1. **CRUD 로직** 유지
2. **가격 관리 분리**
   - `SellerProductPricingService`: 가격 전략, markup 계산
3. **재고 동기화 분리**
   - `SellerProductSyncService`: 공급자-판매자 재고 동기화
4. **인증 검증**은 Middleware 또는 별도 Guard로 분리

**영향 범위:**
- SellerController
- 상품 동기화 Job
- 주문 생성 시 재고 확인

---

### 3.7 FE-PG-01/02: SettlementDetailPage (Seller & Supplier)

**Path**:
- `apps/main-site/src/pages/dashboard/SellerSettlementDetailPage.tsx` (598 lines)
- `apps/main-site/src/pages/dashboard/SupplierSettlementDetailPage.tsx` (586 lines)

**ComplexityLevel**: **HIGH**

**문제 요약:**
- 판매자와 공급자의 정산 상세 페이지가 거의 동일한 구조로 중복
- 주요 역할:
  1. 정산 상세 정보 표시
  2. 정산 항목 목록 (SettlementItem)
  3. 차트 표시
  4. 정산 내역 다운로드
  5. 상태별 필터링
- 두 페이지의 차이는 역할(role)과 일부 필드명 뿐

**예상 리팩토링 방향:**
1. **공통 컴포넌트 추출**
   - `SettlementDetailLayout`: 공통 레이아웃
   - `SettlementItemsTable`: 항목 테이블
   - `SettlementChart`: 차트
   - `SettlementActions`: 액션 버튼
2. **Role-agnostic 구조**
   - roleType prop을 받아서 역할별로 분기
   - 또는 HOC/Wrapper로 감싸기
3. 두 페이지를 하나의 `SettlementDetailPage`로 통합

**영향 범위:**
- Seller 대시보드
- Supplier 대시보드
- 정산 관련 모든 페이지

---

## 4. 복잡성 분포 요약

### 4.1 파일 크기별 분포

| 크기 범위 | 분류 | 파일 수 (추정) | 예시 |
|-----------|------|----------------|------|
| 800+ lines | Very High | 5개 | OrderService, LinkGenerator, SellerProducts, dropshipping-fields, SharedPayoutRequests |
| 500-800 lines | High | 15개 | ProductMarketplace, CommissionEngine, SettlementManagementService, SellerProductService, 등 |
| 200-500 lines | Medium | 30개 | 대부분의 페이지, 컴포넌트, 중간 서비스들 |
| 0-200 lines | Low | 50개+ | 엔티티, 유틸, 작은 컴포넌트들 |

### 4.2 레이어별 복잡성

| 레이어 | Very High | High | Medium | Low | 총계 |
|--------|-----------|------|--------|-----|------|
| Frontend (Pages) | 0 | 3 | 8 | 5 | 16 |
| Frontend (Components) | 3 | 5 | 10 | 10 | 28 |
| API (Services) | 1 | 5 | 3 | 2 | 11 |
| API (Controllers) | 0 | 0 | 1 | 1 | 2 |
| API (Entities) | 0 | 0 | 3 | 5 | 8 |
| CPT/ACF | 1 | 0 | 0 | 1 | 2 |
| Shortcodes | 0 | 0 | 2 | 1 | 3 |
| **총계** | **5** | **13** | **27** | **25** | **70** |

### 4.3 역할별 파일 분포

| 역할 | 파일 수 (추정) | 주요 영역 |
|------|----------------|-----------|
| Seller (판매자) | 25개 | SellerController, SellerService, SellerProducts, SellerDashboard 등 |
| Supplier (공급자) | 20개 | SupplierController, SupplierProducts, SupplierOrders 등 |
| Partner (파트너) | 15개 | PartnerCommissions, PartnerLinks, LinkGenerator 등 |
| Order (주문) | 10개 | OrderService, OrderController, Order 엔티티 등 |
| Settlement (정산) | 12개 | SettlementService, SettlementManagementService, Settlement 페이지들 |
| Commission (커미션) | 8개 | CommissionEngine, CommissionCalculator 등 |
| Authorization (인증) | 6개 | SellerAuthorizationService, Authorization 페이지 등 |
| Common/Shared | 10개 | LinkGenerator, SharedPayoutRequests 등 |

---

## 5. 주요 복잡성 패턴 및 문제점

### 5.1 God Class/Service 패턴
- **OrderService** (1183 lines): 주문, 커미션, 정산, 알림까지 모든 것을 처리
- **LinkGenerator** (906 lines): 링크 생성, QR, 공유, 통계 모두 포함
- **SellerProducts** (852 lines): 상품 관리의 모든 기능이 단일 컴포넌트

**문제:**
- 단일 책임 원칙(SRP) 위반
- 테스트 작성 어려움
- 코드 재사용 불가능
- 유지보수 비용 증가

### 5.2 중복 코드 패턴
- **SettlementDetailPage**: Seller와 Supplier 버전이 거의 동일 (598 vs 586 lines)
- **SettlementsPage**: 역할별로 유사한 구조 반복
- **Dashboard 컴포넌트**: SellerDashboard, SupplierDashboard, PartnerDashboard가 유사한 패턴

**문제:**
- DRY(Don't Repeat Yourself) 원칙 위반
- 버그 수정 시 여러 곳을 동시에 수정해야 함
- 일관성 유지 어려움

### 5.3 UI/로직 혼재 패턴
- 대부분의 대시보드 컴포넌트에서 UI 렌더링과 비즈니스 로직이 혼재
- API 호출이 컴포넌트 내부에서 직접 발생
- 상태 관리 로직이 UI 컴포넌트에 밀접하게 결합

**문제:**
- 로직 재사용 불가능
- UI와 로직의 독립적인 테스트 불가
- 컴포넌트 복잡도 증가

### 5.4 거대한 설정 파일
- **dropshipping-fields.ts** (858 lines): 모든 역할의 ACF 필드가 한 파일에
- 긴 배열 구조로 가독성 저하

**문제:**
- 특정 역할의 필드를 찾기 어려움
- 수정 시 의도치 않은 영향 범위
- Merge conflict 가능성 높음

---

## 6. 요약 및 다음 단계 제안

### 6.1 복잡성 조사 요약

본 C-1 단계에서 드랍쉬핑 관련 코드의 복잡성을 조사한 결과:

1. **총 70개 이상의 파일**이 드랍쉬핑 클러스터에 속함
2. **5개의 Very High 복잡성 파일** 발견
   - OrderService.ts (1183 lines)
   - LinkGenerator.tsx (906 lines)
   - SellerProducts.tsx (852 lines)
   - dropshipping-fields.ts (858 lines)
   - SharedPayoutRequests.tsx (808 lines)
3. **13개의 High 복잡성 파일** 확인
4. 주요 문제 패턴:
   - God Class/Service
   - 중복 코드 (특히 역할별 유사 페이지)
   - UI/로직 혼재
   - 거대한 설정 파일

### 6.2 다음 단계 (C-2) 제안

C-2 단계에서는 **비즈니스 로직 변경 없이 구조/가독성 개선**을 수행할 것을 제안합니다.

**우선순위 1 (Critical):**
1. **OrderService 리팩토링**
   - 주문/커미션/정산/알림 책임 분리
   - 트랜잭션 관리 단순화
   - 테스트 가능한 구조로 개선
2. **LinkGenerator 리팩토링**
   - UI 컴포넌트 분리 (List, Form, QR, Share)
   - Custom Hook 분리 (useLinks, useProducts)
   - 재사용 가능한 컴포넌트로 분해

**우선순위 2 (High):**
3. **SellerProducts 리팩토링**
   - 페이지/컴포넌트 분리
   - Dialog 컴포넌트 독립화
   - Custom Hook 분리
4. **dropshipping-fields 리팩토링**
   - 역할별 파일 분리
   - 필드 그룹 함수화
5. **SettlementDetailPage 통합**
   - 중복 제거 (Seller/Supplier 통합)
   - 공통 컴포넌트 추출

**우선순위 3 (Medium):**
6. **CommissionEngine 리팩토링**
   - 계산/정책/이벤트 분리
7. **SellerProductService 리팩토링**
   - CRUD/가격/동기화 책임 분리

### 6.3 리팩토링 원칙

C-2 단계에서 준수할 원칙:

1. **비즈니스 로직 불변**: 기능 동작은 절대 변경하지 않음
2. **점진적 개선**: 한 번에 하나의 파일/영역씩 리팩토링
3. **테스트 우선**: 리팩토링 전후 동작 검증
4. **문서화**: 변경 사항 및 이유 기록
5. **커밋 단위**: 작은 단위로 커밋하여 되돌리기 쉽게 유지

### 6.4 예상 효과

C-2 완료 후 예상 효과:

- **가독성 향상**: 파일 크기가 50% 이상 감소
- **유지보수성 향상**: 책임 분리로 수정 범위 명확화
- **재사용성 향상**: 공통 컴포넌트/유틸 추출로 중복 제거
- **테스트 용이성**: 단위 테스트 작성 가능한 구조
- **협업 효율성**: Merge conflict 감소

### 6.5 DS-1/DS-2 단계 준비

C-2 완료 후, DS-1/DS-2 단계에서는:

- 정리된 구조를 기반으로 **드랍쉬핑 전체 흐름 분석**
  - 공급자 → 판매자 → 주문 → 배송 → 정산 워크플로우
  - 커미션 계산 및 분배 흐름
  - 역할별 권한 및 접근 제어
- **중복/불일치 분석**
  - API vs UI 데이터 흐름
  - 정책 적용 일관성
  - 상태 관리 일관성

---

## 부록 A: 전체 파일 목록

### A.1 프론트엔드 - Admin Dashboard Shortcodes (22개)

```
apps/admin-dashboard/src/components/shortcodes/dropshipping/
├── shared/
│   ├── LinkGenerator.tsx (906 lines)
│   └── SharedPayoutRequests.tsx (808 lines)
├── seller/
│   ├── SellerDashboard.tsx (578 lines)
│   ├── SellerProducts.tsx (852 lines)
│   ├── SellerSettlement.tsx (651 lines)
│   ├── ProductMarketplace.tsx (804 lines)
│   └── index.tsx (75 lines)
├── supplier/
│   ├── SupplierProducts.tsx (362 lines)
│   ├── SupplierProductEditor.tsx (~300 lines)
│   └── index.tsx
├── partner/
│   ├── PartnerDashboard.tsx (341 lines)
│   ├── PartnerCommissionDashboard.tsx (614 lines)
│   ├── PartnerCommissions.tsx (460 lines)
│   ├── PartnerProducts.tsx (430 lines)
│   ├── PartnerLinkGenerator.tsx (7 lines - wrapper)
│   ├── PayoutRequests.tsx (17 lines - wrapper)
│   └── index.tsx (91 lines)
├── affiliate/
│   ├── AffiliateCommissionDashboard.tsx (614 lines)
│   ├── AffiliateLinkGenerator.tsx (7 lines - wrapper)
│   └── PayoutRequests.tsx (17 lines - wrapper)
├── RoleVerification.tsx (517 lines)
├── UserDashboard.tsx (451 lines)
└── index.tsx
```

### A.2 프론트엔드 - Main Site Pages (27개)

```
apps/main-site/src/pages/dashboard/
├── Seller*
│   ├── SellerDashboard.tsx (23 lines)
│   ├── SellerDashboardPage.tsx (~100 lines)
│   ├── SellerProductsPage.tsx (44 lines)
│   ├── SellerProductCreatePage.tsx (564 lines)
│   ├── SellerProductEditPage.tsx (292 lines)
│   ├── SellerOrdersPage.tsx (~100 lines)
│   ├── SellerOrderDetailPage.tsx (~350 lines)
│   ├── SellerSettlementsPage.tsx (379 lines)
│   ├── SellerSettlementDetailPage.tsx (598 lines)
│   └── SellerChannelsPage.tsx (~200 lines)
├── Supplier*
│   ├── SupplierDashboard.tsx (23 lines)
│   ├── SupplierDashboardPage.tsx (13 lines)
│   ├── SupplierProductsPage.tsx (25 lines)
│   ├── SupplierProductCreatePage.tsx (56 lines)
│   ├── SupplierProductEditPage.tsx (132 lines)
│   ├── SupplierProductAuthorizationsPage.tsx (373 lines)
│   ├── SupplierOrdersPage.tsx (24 lines)
│   ├── SupplierOrderDetailPage.tsx (443 lines)
│   ├── SupplierSettlementsPage.tsx (296 lines)
│   └── SupplierSettlementDetailPage.tsx (586 lines)
└── Partner*
    ├── PartnerDashboard.tsx (~100 lines)
    ├── PartnerDashboardPage.tsx (~100 lines)
    ├── PartnerLinksPage.tsx (~150 lines)
    ├── PartnerLinkCreatePage.tsx (~200 lines)
    ├── PartnerLinkEditPage.tsx (~200 lines)
    ├── PartnerAnalyticsPage.tsx (~250 lines)
    ├── PartnerSettlementsPage.tsx (~300 lines)
    └── PartnerSettlementDetailPage.tsx (~500 lines)
```

### A.3 API 서버 - Services (10개)

```
apps/api-server/src/services/
├── OrderService.ts (1183 lines)
├── SellerService.ts (434 lines)
├── SellerProductService.ts (678 lines)
├── SellerAuthorizationService.ts (539 lines)
├── SellerDashboardService.ts (~200 lines)
├── SupplierService.ts (~300 lines)
├── SettlementService.ts (316 lines)
├── SettlementManagementService.ts (696 lines)
├── CommissionCalculator.ts (213 lines)
└── CommissionEngine.ts (684 lines)
```

### A.4 API 서버 - Controllers (5개)

```
apps/api-server/src/controllers/
├── SellerController.ts (453 lines)
├── SupplierController.ts (104 lines)
├── SellerSettlementController.ts (~200 lines)
├── SupplierSettlementController.ts (~200 lines)
└── SellerProductController.ts (~300 lines)
```

### A.5 API 서버 - Entities (14개)

```
apps/api-server/src/entities/
├── Order.ts (300 lines)
├── OrderItem.ts (~100 lines)
├── OrderEvent.ts (~150 lines)
├── Seller.ts (~150 lines)
├── SellerProduct.ts (~200 lines)
├── SellerProfile.ts (~100 lines)
├── SellerAuthorization.ts (~150 lines)
├── Supplier.ts (~150 lines)
├── SupplierProfile.ts (~100 lines)
├── Partner.ts (~150 lines)
├── PartnerProfile.ts (~100 lines)
├── Settlement.ts (140 lines)
├── SettlementItem.ts (~100 lines)
└── Commission.ts (~150 lines)
```

### A.6 CPT/ACF (2개)

```
apps/api-server/src/services/
├── acf/
│   └── dropshipping-fields.ts (858 lines)
└── cpt/
    └── dropshipping-cpts.ts (174 lines)
```

### A.7 Shortcodes (4개)

```
packages/shortcodes/src/dropshipping/
├── SellerDashboard.tsx (~250 lines)
├── SupplierDashboard.tsx (~250 lines)
├── AffiliateDashboard.tsx (~250 lines)
└── index.ts
```

---

## 부록 B: 복잡성 계산 기준

본 문서에서 사용한 복잡성 평가 기준:

### B.1 정량 기준

| Lines | 복잡성 레벨 | 설명 |
|-------|-------------|------|
| 0-200 | Low | 단순한 파일, 단일 책임 |
| 200-500 | Medium | 중간 크기, 여러 기능 포함 |
| 500-800 | High | 큰 파일, 다수의 책임 |
| 800+ | Very High | 매우 큰 파일, God Class/Service 후보 |

### B.2 정성 기준

다음 항목이 많을수록 복잡성이 높음:

1. **책임 수**: 하나의 파일/컴포넌트가 수행하는 독립적인 역할의 수
2. **의존성**: 다른 서비스/컴포넌트에 대한 의존성 수
3. **상태 관리**: useState, useEffect 등의 수 (React)
4. **분기 복잡도**: if/else, switch, 삼항 연산자의 중첩 깊이
5. **API 호출**: 직접 API 호출하는 수
6. **Modal/Dialog**: 관리하는 모달/다이얼로그의 수
7. **중복 코드**: 유사한 패턴의 반복

### B.3 복잡성 레벨 정의

- **Very High**: 즉시 리팩토링 필요, God Class/Service
- **High**: 우선적으로 개선 필요
- **Medium**: 필요 시 개선
- **Low**: 현재 상태 유지 가능

---

**문서 끝**
