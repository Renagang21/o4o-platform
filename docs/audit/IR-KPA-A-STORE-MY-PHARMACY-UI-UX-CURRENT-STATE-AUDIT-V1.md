# IR-KPA-A-STORE-MY-PHARMACY-UI-UX-CURRENT-STATE-AUDIT-V1

**작성일:** 2026-04-05
**대상:** KPA Society `/store` (내 약국) 영역 전체
**목적:** 현 상태 조사 → 정비 전략 판단 기반 확보

---

## 1. 전체 구조 요약

### 1.1 라우트 구조

```
/store                          ← PharmacyGuard → KpaStoreLayoutWrapper (StoreDashboardLayout)
├── /store (index)              → StoreMarketingDashboardPage
├── /store/dashboard            → StoreMarketingDashboardPage
├── /store/info                 → PharmacyInfoPage
├── /store/operation/library    → StoreLibraryPage (+new, :id, :id/edit)
├── /store/marketing/qr        → StoreQRPage
├── /store/marketing/pop        → StorePopPage
├── /store/marketing/signage    → StoreSignagePage
├── /store/commerce/products    → PharmacyB2BPage
├── /store/commerce/products/b2c → PharmacySellPage
├── /store/commerce/products/suppliers → SupplierListPage (+:id)
├── /store/commerce/products/:id/marketing → ProductMarketingPage
├── /store/commerce/local-products → StoreLocalProductsPage
├── /store/commerce/tablet-displays → StoreTabletDisplaysPage
├── /store/commerce/orders      → StoreOrdersPage (placeholder)
├── /store/analytics/marketing  → MarketingAnalyticsPage
├── /store/channels             → StoreChannelsPage (hidden)
├── /store/channels/tablet      → TabletRequestsPage (hidden)
├── /store/content              → StoreAssetsPage (hidden)
├── /store/content/blog         → PharmacyBlogPage (hidden)
├── /store/billing              → StoreBillingPage (hidden)
├── /store/settings             → PharmacyStorePage (hidden)
├── /store/settings/layout      → LayoutBuilderPage (hidden)
└── /store/settings/template    → PharmacyTemplatePage (hidden)
```

**Legacy 리다이렉트:** `/store/qr` → `/store/marketing/qr` 등 10개 이상의 이전 경로 리다이렉트 존재

### 1.2 레이아웃 구조

```
PharmacyGuard
└── KpaStoreLayoutWrapper (App.tsx:285-318)
    └── StoreDashboardLayout (packages/store-ui-core)
        ├── StoreTopBar (sticky 56px)
        │   ├── 서비스 로고 + 배지 ("KPA" / "약사 네트워크")
        │   ├── 네비게이션 링크 (홈/포럼/강의/콘텐츠/약국HUB)
        │   └── StoreUserDropdown (사용자 메뉴)
        ├── StoreSidebar (desktop: sticky / mobile: drawer)
        │   └── KPA_SOCIETY_STORE_CONFIG → 8 섹션 메뉴
        └── <Outlet /> (콘텐츠 영역)
```

**공유 레이아웃:** `StoreDashboardLayout`은 KPA/Cosmetics/GlycoPharm/GlucoseView 전 서비스 공유

### 1.3 인증/권한 가드

| 가드 | 조건 | 실패 시 |
|------|------|---------|
| `PharmacyGuard` | `isStoreOwner === true` 또는 API 승인 확인 | `/login` 또는 `/pharmacy` 게이트 |
| `PharmacyOwnerOnlyGuard` | `isStoreOwner` 또는 `activityType === 'pharmacy_owner'` | 차단 |
| `PharmacistOnlyGuard` | `membershipType !== 'student'` | 차단 |

### 1.4 메뉴 정의 소스

**파일:** `packages/store-ui-core/src/config/storeMenuConfig.ts`

`KPA_SOCIETY_STORE_CONFIG` — 8섹션 기반 메뉴:
1. (무제) — 대시보드
2. (무제) — 약국 정보
3. 운영 — 자료실, 콘텐츠 관리, 블로그
4. 마케팅 — QR 관리, POP 자료, 매장 사이니지, 마케팅 분석
5. 상품/판매 — 상품 관리(B2B), B2C 상품 판매, 자체 상품, 공급자, 주문 관리
6. 채널/디바이스 — 채널 관리, 태블릿 채널, 태블릿 디스플레이
7. 설정 — 매장 설정, 레이아웃 빌더, 템플릿 관리
8. 정산 — 정산/인보이스

**메뉴 필터링:** `useStoreCapabilities()` → `resolveStoreMenu()` 로 capability 기반 동적 표시

---

## 2. 화면별 현황 표

### 핵심 화면 (28개)

| # | 화면명 | 경로 | 목적 | 구현 상태 | LOC | API 연동 |
|---|--------|------|------|----------|-----|---------|
| 1 | StoreMarketingDashboardPage | `/store` | 대시보드 (QR KPI, 최근 스캔) | **정상** | 479 | getMarketingAnalytics, getRecentScans |
| 2 | PharmacyInfoPage | `/store/info` | 약국 정보 (읽기전용) | **정상** | 544 | getPharmacyInfo |
| 3 | PharmacyB2BPage | `/store/commerce/products` | B2B 상품 목록 (탭 필터) | **정상** | 539 | getListings |
| 4 | PharmacySellPage | `/store/commerce/products/b2c` | 판매 등록 신청 + 채널 관리 | **정상** | 855 | applyProduct, getApplications, updateListingChannels |
| 5 | StoreLocalProductsPage | `/store/commerce/local-products` | 자체 상품 CRUD | **정상** | 653 | localProducts CRUD API |
| 6 | StoreOrderableProductsPage | `/store/commerce/orderable` → `/hub/b2b` | 플랫폼 상품 검색/신청 | **정상** | 689 | getCatalog, applyBySupplyProductId |
| 7 | StoreOrdersPage | `/store/commerce/orders` | 주문 관리 | **Placeholder** | 205 | ❌ 미연결 |
| 8 | StoreQRPage | `/store/marketing/qr` | QR 코드 CRUD + 분석 | **정상** | 885 | QR CRUD + analytics |
| 9 | StorePopPage | `/store/marketing/pop` | POP 마케팅 자료 관리 | **정상** | 423 | POP CRUD |
| 10 | StoreSignagePage | `/store/marketing/signage` | 디지털 사이니지 관리 | **정상** | 1,355 | Signage multi-endpoint |
| 11 | StoreTabletDisplaysPage | `/store/commerce/tablet-displays` | 태블릿 디스플레이 설정 | **정상** | 474 | tablet config |
| 12 | StoreLibraryPage | `/store/operation/library` | 콘텐츠 자료실 목록 | **정상** | 583 | fetchContentLibrary |
| 13 | StoreLibraryNewPage | `/store/operation/library/new` | 자료 생성 | **정상** | 519 | createContent |
| 14 | StoreLibraryDetailPage | `/store/operation/library/:id` | 자료 상세 보기 | **정상** | 459 | getContent |
| 15 | StoreLibraryEditPage | `/store/operation/library/:id/edit` | 자료 수정 | **정상** | 555 | updateContent |
| 16 | StoreContentEditPage | `/store/content/:snapshotId/edit` | 콘텐츠 스냅샷 편집 | **정상** | 525 | snapshot API |
| 17 | PharmacyBlogPage | `/store/content/blog` | 블로그 관리 | **정상** | 383 | blog CRUD |
| 18 | MarketingAnalyticsPage | `/store/analytics/marketing` | 마케팅 분석 대시보드 | **정상** | 428 | analytics API |
| 19 | ProductMarketingPage | `/store/commerce/products/:id/marketing` | 개별 상품 마케팅 | **정상** | 463 | campaign API |
| 20 | StoreChannelsPage | `/store/channels` | 채널 관리 (B2C/태블릿/키오스크/사이니지) | **정상** | 910 | channel settings |
| 21 | TabletRequestsPage | `/store/channels/tablet` | 태블릿 요청/추적 | **정상** | 388 | tablet request API |
| 22 | SupplierListPage | `/store/commerce/products/suppliers` | 공급자 목록 | **정상** | 455 | getSuppliers |
| 23 | SupplierDetailPage | `/store/commerce/products/suppliers/:id` | 공급자 상세 + 상품 | **정상** | 592 | getSupplierDetail |
| 24 | PharmacyStorePage | `/store/settings` | 매장 설정 (템플릿/테마/컴포넌트) | **정상** | 1,075 | storeConfig API |
| 25 | LayoutBuilderPage | `/store/settings/layout` | 레이아웃 빌더 (드래그앤드롭) | **정상** | 422 | layout API |
| 26 | PharmacyTemplatePage | `/store/settings/template` | 템플릿 관리 | **부분구현** | 213 | redirect 가능성 |
| 27 | StoreBillingPage | `/store/billing` | 정산/인보이스 | **Placeholder** | 213 | ❌ 미연결 |
| 28 | StoreAssetsPage | `/store/content` | 에셋 관리 진입점 | **최소구현** | 82 | redirect |

### 구현 상태 요약

| 상태 | 수 | 비율 |
|------|---|------|
| **정상 작동** | 23 | 82% |
| **정상 (hidden route)** | 2 | 7% |
| **Placeholder (API 미연결)** | 2 | 7% |
| **부분구현/최소구현** | 1 | 4% |

---

## 3. 사이드바 메뉴 현황 표

| 섹션 | 메뉴명 | 연결 경로 | 실제 사용 | 문제점 | 판단 |
|------|--------|----------|----------|--------|------|
| — | 대시보드 | `/store/dashboard` | ✅ 정상 | QR 중심 KPI (약국 전반 아님) | **유지** (내용 개선 필요) |
| — | 약국 정보 | `/store/info` | ✅ 정상 | 읽기전용, 편집 링크 조건부 | **유지** |
| 운영 | 자료실 | `/store/operation/library` | ✅ 정상 | CRUD 완비 | **유지** |
| 운영 | 콘텐츠 관리 | `/store/content` | ⚠️ 최소구현 | 82줄, 실질적 redirect | **제거 후보** (자료실에 통합) |
| 운영 | 블로그 | `/store/content/blog` | ✅ 정상 | 독립 페이지 | **유지** |
| 마케팅 | QR 관리 | `/store/marketing/qr` | ✅ 정상 | 885줄, 기능 풍부 | **유지** |
| 마케팅 | POP 자료 | `/store/marketing/pop` | ✅ 정상 | | **유지** |
| 마케팅 | 매장 사이니지 | `/store/marketing/signage` | ✅ 정상 | 1,355줄, 가장 복잡 | **유지** |
| 마케팅 | 마케팅 분석 | `/store/analytics/marketing` | ✅ 정상 | | **유지** |
| 상품/판매 | 상품 관리(B2B) | `/store/commerce/products` | ✅ 정상 | 카드형, 비표준 UX | **수정** (표 형식 전환) |
| 상품/판매 | B2C 상품 판매 | `/store/commerce/products/b2c` | ✅ 정상 | 855줄, 2탭 복합 | **유지** (복잡하나 기능 완비) |
| 상품/판매 | 자체 상품 | `/store/commerce/local-products` | ✅ 정상 | CRUD 완비, 검색/페이지네이션 | **유지** |
| 상품/판매 | 공급자 | `/store/commerce/products/suppliers` | ✅ 정상 | | **유지** |
| 상품/판매 | 주문 관리 | `/store/commerce/orders` | ❌ Placeholder | "주문 기능이 연결되면..." | **유지** (API 연결 대기) |
| 채널 | 채널 관리 | `/store/channels` | ✅ 정상 (hidden) | 910줄 | **유지** |
| 채널 | 태블릿 채널 | `/store/channels/tablet` | ✅ 정상 (hidden) | | **유지** |
| 채널 | 태블릿 디스플레이 | `/store/commerce/tablet-displays` | ✅ 정상 | | **유지** |
| 설정 | 매장 설정 | `/store/settings` | ✅ 정상 (hidden) | 1,075줄, 라이브 프리뷰 | **유지** |
| 설정 | 레이아웃 빌더 | `/store/settings/layout` | ✅ 정상 (hidden) | 드래그앤드롭 | **유지** |
| 설정 | 템플릿 관리 | `/store/settings/template` | ⚠️ 부분구현 | 213줄, redirect 가능성 | **제거 후보** (settings에 통합) |
| 정산 | 정산/인보이스 | `/store/billing` | ❌ Placeholder | 213줄, 구조만 | **유지** (API 연결 대기) |

### 메뉴 이슈 요약

- **제거 후보 2개:** 콘텐츠 관리 (자료실에 통합), 템플릿 관리 (매장 설정에 통합)
- **hidden 메뉴 5개:** 채널관리, 태블릿채널, 콘텐츠, 매장설정, 레이아웃빌더 — capability 기반 동적 표시로 해소
- **Placeholder 2개:** 주문 관리, 정산/인보이스 — API 연결 시 활성화
- **메뉴 총 21개** → 약국 개설자에게 과도 (실제 표시는 capability 필터링에 따라 감소)

---

## 4. 상품 리스트 집중 분석

### 4.1 현재 UI 구조

**4개 상품 관련 화면이 존재:**

| 화면 | 형태 | 핵심 기능 |
|------|------|----------|
| PharmacyB2BPage | **카드형** 그리드 | 도메인별 탭 필터 (All/B2B/Groupbuy/GlycoPharm/Cosmetics) |
| StoreLocalProductsPage | **리스트형** + 모달 CRUD | 검색, 페이지네이션(20개), 활성/비활성 필터 |
| StoreOrderableProductsPage | **테이블형** | 정렬 가능 컬럼, 상태별 탭, 신청 버튼 |
| PharmacySellPage | **탭 2개** (신청폼+진열목록) | 판매 등록 신청 + 채널 토글 |

### 4.2 표준 운영 UX와의 차이

| 항목 | 표준 운영 UX | 현재 KPA `/store` |
|------|------------|------------------|
| **리스트 형태** | DataTable (정렬/필터/검색/일괄작업) | 화면마다 다름 (카드/리스트/테이블 혼재) |
| **일괄 작업** | 체크박스 선택 → 일괄 상태변경/삭제 | ❌ 없음 |
| **인라인 편집** | 테이블 내 직접 가격/재고 수정 | ❌ 없음 (모달 또는 별도 페이지) |
| **실시간 검색** | debounce + API 서버사이드 검색 | 일부만 (LocalProducts는 클라이언트사이드) |
| **상태 필터** | 사이드 필터 패널 또는 드롭다운 | 탭 기반 필터 (일부 화면만) |
| **정렬** | 컬럼 헤더 클릭 정렬 | StoreOrderableProductsPage만 지원 |
| **Export** | CSV/Excel 다운로드 | ❌ 없음 |
| **공통 테이블** | 공유 DataTable 컴포넌트 재사용 | ❌ 각 화면 커스텀 구현 |

### 4.3 핵심 문제 5개

1. **UI 일관성 부재** — 4개 상품 화면이 각각 다른 리스트 패턴 사용 (카드/리스트/테이블/탭). 사용자가 화면마다 다른 조작 방식을 학습해야 함.

2. **공통 테이블 미사용** — `packages/operator-ux-core/src/list/DataTable.tsx`, `EditableDataTable.tsx`가 존재하나 store 영역에서 전혀 사용하지 않음. 각 화면이 인라인 스타일로 자체 테이블 구현.

3. **일괄 작업 불가** — 상품 상태변경, 가격변경, 채널설정 등을 건별로만 처리. 상품 수가 많아지면 운영 효율 심각히 저하.

4. **PharmacyB2BPage 카드형 한계** — 도메인별 5탭 필터는 좋으나, 카드형 UI는 비교/정렬에 불리. 상품 수 증가 시 스크롤 과다.

5. **검색/필터 파편화** — LocalProducts는 클라이언트사이드 검색, OrderableProducts는 서버사이드, B2BPage는 탭 필터만. 통합된 검색/필터 패턴 없음.

### 4.4 재사용 가능한 부분

- **StoreLocalProductsPage** — CRUD 패턴이 가장 완성도 높음 (검색+페이지네이션+모달CRUD+토스트). 다른 상품 화면의 기반으로 활용 가능.
- **StoreOrderableProductsPage** — 테이블형 정렬이 유일하게 구현된 화면. 테이블 패턴 참조 가능.
- **PharmacySellPage 채널 토글** — 상품별 채널 설정 토글 UI는 재사용 가치 있음.

### 4.5 폐기 후보

- **PharmacyB2BPage 카드형 그리드** — 테이블형으로 전환 권장. 카드 코드는 폐기 가능.
- **각 화면의 커스텀 테이블 구현** — DataTable 공통 컴포넌트로 통합 후 개별 구현 폐기.

---

## 5. 재구성 판단

### 옵션 비교

| 옵션 | 설명 | 장점 | 단점 | 비용 |
|------|------|------|------|------|
| **A. 부분 개선** | 현재 구조 유지, 상품 리스트 UI만 개선 | 리스크 최소 | 근본적 일관성 문제 미해결 | 낮음 |
| **B. 중간 재구성** | 메뉴 정리 + 상품 리스트 DataTable 전환 + 죽은 코드 제거 | 일관성 확보, 유지보수 개선 | 테스트 범위 중간 | 중간 |
| **C. 전면 재구성** | `/store` 전체를 새 설계로 재구축 | 최적의 UX | 기존 23개 정상 화면 재작성 비용 과대 | 매우 높음 |

### 판단: **B. 중간 수준 재구성** 권장

**근거:**
1. **23개 화면이 이미 정상 동작** (82%) — 전면 재구성은 동작하는 코드를 불필요하게 재작성하게 됨
2. **핵심 문제는 상품 리스트 UI와 메뉴 구조에 집중** — 이 두 영역만 정비하면 체감 UX가 크게 개선됨
3. **레이아웃 인프라(StoreDashboardLayout, StoreSidebar)는 이미 공유 자산** — 재구성 불필요
4. **죽은 코드/API 12개**가 존재하나 동작에 영향 없음 — 코드 정리 수준
5. **DataTable 공통 컴포넌트 존재** — 상품 리스트를 DataTable로 전환하면 일관성 확보 가능

---

## 6. 추천 정비 방향

### 1차 정비 우선순위

| 우선순위 | 작업 | 범위 | 효과 |
|---------|------|------|------|
| **P0** | 상품 관리(B2B) 카드→테이블 전환 | PharmacyB2BPage | 핵심 UX 개선 |
| **P0** | 메뉴 정리: 죽은 메뉴 2개 제거 | storeMenuConfig | 탐색 복잡도 감소 |
| **P1** | DataTable 도입 (상품 리스트 통합) | B2B + LocalProducts | UI 일관성 확보 |
| **P1** | 대시보드 KPI 범위 확대 | StoreMarketingDashboardPage | QR만→약국 전반 KPI |
| **P2** | 죽은 API 파일 정리 | storePlaylist.ts, pharmacyStoreConfig.ts | 코드베이스 정리 |
| **P2** | PharmacyInfoPage 편집 기능 강화 | PharmacyInfoPage | 약국 정보 직접 수정 |

### 유지할 것

- **StoreDashboardLayout / StoreSidebar / StoreTopBar** — 공유 인프라, 변경 불필요
- **StoreQRPage / StoreSignagePage / StorePopPage** — 마케팅 3종은 완성도 높음
- **StoreLibrary CRUD 4페이지** — 자료실 완비
- **PharmacySellPage** — 복잡하나 기능 완비, 유지
- **StoreLocalProductsPage** — CRUD 패턴 양호
- **PharmacyGuard / PharmacyOwnerOnlyGuard** — 인증 구조 안정

### 제거할 것

- **사이드바 메뉴:** 콘텐츠 관리 (StoreAssetsPage 82줄 → 자료실에 통합), 템플릿 관리 (settings에 통합)
- **죽은 API:** `storePlaylist.ts` (전체 미사용), `pharmacyStoreConfig.ts` (전체 미사용)
- **죽은 API 엔드포인트:** `storeHub.createChannel()`, `storeHub.fetchStoreKpiSummary()`, `pharmacyProducts.getListingChannels()`, `pharmacyProducts.updateListingChannels()`
- **Legacy 리다이렉트 10개** — 충분한 기간 경과 후 정리

### 공통화할 것

- **상품 리스트 UI** → `DataTable` 또는 `EditableDataTable` 적용 (operator-ux-core 재사용)
- **검색/필터 패턴** → 서버사이드 검색 + debounce 통합 패턴
- **토스트 알림** → 이미 대부분 사용 중이나 일부 누락 화면 보완
- **에러 처리** → 401/403/5xx 분류 패턴 전 화면 통일

### Neture/O4O 자산 재사용 후보

| 자산 | 위치 | 재사용 방법 |
|------|------|------------|
| `DataTable` | `packages/operator-ux-core/src/list/` | 상품 리스트 테이블 전환 |
| `EditableDataTable` | `packages/operator-ux-core/src/list/` | 가격/재고 인라인 편집 |
| `B2BTableList` | `packages/hub-exploration-core/src/components/` | B2B 상품 카탈로그 참조 |
| `operatorMenuGroups.ts` | `services/web-neture/src/config/` | 메뉴 그룹화 패턴 참조 |
| `StoreDashboardLayout` | `packages/store-ui-core/src/layout/` | 이미 사용 중 ✅ |

---

## 부록: 코드 통계

| 영역 | 파일 수 | 총 LOC |
|------|---------|--------|
| `/store` 페이지 | 28 | ~14,000 |
| `/pharmacy` 게이트/허브 | 8 | ~3,500 |
| `/store` 컴포넌트 | 4 | ~930 |
| Store API 레이어 | 10 | ~1,200 |
| Store UI Core (공유) | 5 | ~1,200 |
| **합계** | **55** | **~20,830** |

**활성 API 엔드포인트:** 36개
**미사용 API 엔드포인트:** 12개 (33% 미사용율)
