# IR-O4O-NETURE-SUPPLIER-DUAL-DASHBOARD-AND-IA-AUDIT-V1

> 조사 문서 전용. 코드 변경 0 / DB write 0 / route 변경 0 / 메뉴 변경 0 / redirect 적용 0

- 작성일: 2026-07-25
- 범위: Neture 공급자 운영 공간의 `/supplier/*` 및 `/account/supplier/*`
- 조사 기준: 실제 라우트 선언, 레이아웃, 페이지 컴포넌트, 메뉴 구성, 대시보드 페이지, API 호출 코드
- 본문은 코드 기준으로 작성되며, 운영 데이터·정산 의미가 불명확한 항목은 `NEEDS_MORE_EVIDENCE`로 표시한다.

---

## 1. Executive Summary

현재 Neture 공급자 기능은 두 개의 별도 운영 공간으로 분기되어 있다.

- `/supplier/*` 는 공급자 운영 허브로서 제품·콘텐츠·유통·커뮤니티·운영 기능이 집약된 영역이다.
- `/account/supplier/*` 는 주문·재고·정산 중심의 운영 업무 영역이다.

코드 기준으로 보면 두 공간은 서로 겹치지만, 실제 사용자 진입점은 `/supplier/*` 쪽이 더 강하다. `getNetureDashboardRoute()` 와 Global Header / AccountMenu 는 공급자 역할의 기본 진입 경로를 `/supplier/dashboard` 로 가리키고 있다. 반면 `/account/supplier/*` 는 주문·재고·정산 페이지에 대한 직접 접근 경로를 제공하지만, 메인 공급자 홈으로는 노출되지 않는다.

핵심 결론은 다음과 같다.

1. Canonical 공급자 운영 공간은 `/supplier/*` 로 정하는 것이 적절하다.
2. `/account/supplier/*` 는 대체로 legacy/compatibility 역할로 유지하되, 실기능은 `/supplier/*` 로 통합하는 방향이 적절하다.
3. 재고와 정산은 현재 `/account/supplier/*` 에서만 실기능을 제공하므로, `/supplier/*` 로 편입하는 것이 사용자 이해도와 운영 일관성 측면에서 더 낫다.
4. `/supplier/dashboard` 는 현재 가장 가까운 공급자 홈이며, `/account/supplier` 는 운영 업무 대시보드로 유지하되 독립 홈으로는 보지 않는 것이 좋다.
5. Sidebar IA는 현재 기능이 너무 분산되어 있어, “상품 / 콘텐츠 / 유통 / 주문·정산 / 커뮤니티 / 설정” 축으로 재편하는 것이 자연스럽다.

---

## 2. 현재 공급자 구조

### 2.1 `/supplier/*` 영역

- 레이아웃: `SupplierSpaceLayout`
- 범위: 공급자 운영 공간 전체
- 주요 특징:
  - 제품 관리, 공급 오퍼, 매장용 태블렛, 디지털 사이니지, 판매자 모집, 유통참여형 펀딩, 이벤트 오퍼, 주문, 파트너 수수료, 포럼, 내 포럼 등 다양한 기능 포함
  - 최근 기능(매장용 설명서, Screen Set, 디지털 사이니지, 유통참여형 펀딩, 이벤트 오퍼 등)이 비교적 잘 반영되어 있음
  - Sidebar 구조가 기능별로 분산되어 있으나, 공급자 운영 허브 취지와 잘 맞음

### 2.2 `/account/supplier/*` 영역

- 레이아웃: `SupplierAccountLayout`
- 범위: 주문·재고·정산 중심의 계정형 운영 대시보드
- 주요 특징:
  - Dashboard / Products / Orders 만 기본 메뉴로 노출
  - 주문 처리, 재고 관리, 정산 관리가 실제 기능으로 구현되어 있음
  - `/supplier/*` 대비 기능 범위가 좁고, 공급자 홈으로서의 역할보다 “업무 실행 영역”에 가깝다.

### 2.3 공통 연결 요소

- 기본 대시보드 진입: `getNetureDashboardRoute()` → `'/supplier/dashboard'`
- Global Header / AccountMenu: 공급자 대시보드 진입은 `/supplier/dashboard` 로 연결
- `SupplierDashboardPage` 는 AI Copilot 스타일의 운영 대시보드이며, 최근 기능과 AI 분석을 보여줌
- `SupplierAccountDashboardPage` 는 주문·재고·정산 요약과 빠른 작업을 제공함

---

## 3. Route Inventory

### 3.1 `/supplier/*` route inventory

| Route | Layout | Page component | 기능 | 메뉴 노출 | 진입 링크 | 실사용 가능성 | 중복 여부 |
|---|---|---|---|---|---|---|---|
| `/supplier/dashboard` | `SupplierSpaceLayout` | `SupplierDashboardPage` | AI Copilot 대시보드, KPI, AI 요약, 상품/유통/이벤트 현황 | 예 | Global Header / AccountMenu / guide / dashboard CTA | 높음 | `/account/supplier` 와 중복되는 “공급자 홈” 성격이 있음 |
| `/supplier/products` | `SupplierSpaceLayout` | `SupplierProductsPage` | 제품 목록/검색/필터/관리 | 예 | Sidebar | 높음 | `/account/supplier/products` 와 기능 중복 |
| `/supplier/products/register` | `SupplierSpaceLayout` | `SupplierProductRegisterEntryPage` | 제품 등록 진입 | 예 | Sidebar | 높음 | `/supplier/products/new` 와 유사하지만 등록 진입 UX로 분리 |
| `/supplier/products/bulk` | `SupplierSpaceLayout` | `SupplierBulkRegisterPage` | 대량 등록 | 예 | Sidebar | 높음 | 등록 경로의 하위 기능 |
| `/supplier/products/import-assistant` | `SupplierSpaceLayout` | `SupplierProductImportPage` | 등록 도우미 | 예 | Sidebar | 높음 | 상품 등록 흐름의 보조 기능 |
| `/supplier/supply-offers` | `SupplierSpaceLayout` | `SupplierSupplyOffersPage` | 공급 오퍼 관리 | 예 | Sidebar | 높음 | 공급자 운영 핵심 기능 |
| `/supplier/orders` | `SupplierSpaceLayout` | `SupplierOrdersPage` | 주문 허브, 서비스별 주문 현황 | 예 | Sidebar / dashboard link | 높음 | `/account/supplier/orders` 와 중복되는 주문 처리 기능 |
| `/supplier/b2b-content` | `SupplierSpaceLayout` | `SupplierB2BContentPage` | 제품 콘텐츠 관리 | 예 | Sidebar | 높음 | 새 기능이지만 계정 공간에는 미노출 |
| `/supplier/store-descriptions` | `SupplierSpaceLayout` | `SupplierStoreDescriptionsPage` | 매장용 설명서 | 예 | Sidebar | 높음 | 최근 기능이지만 메인 대시보드와의 연결은 약함 |
| `/supplier/tablet-screen-sets` | `SupplierSpaceLayout` | `SupplierTabletScreenSetsPage` | 매장용 태블렛 Screen Set | 예 | Sidebar | 높음 | 최근 기능이며 별도 독립 영역 |
| `/supplier/signage` | `SupplierSpaceLayout` | `SupplierSignagePage` | 디지털 사이니지 | 예 | Sidebar | 높음 | 최근 기능이며 독립 영역 |
| `/supplier/recruitments` | `SupplierSpaceLayout` | `SupplierRecruitmentsPage` | 판매자 모집 현황 | 예 | Sidebar | 높음 | 공급자 운영의 비즈니스 확장 기능 |
| `/supplier/market-trial` | `SupplierSpaceLayout` | `SupplierTrialListPage` | 유통참여형 펀딩 | 예 | Sidebar / dashboard CTA | 높음 | 최근 기능이지만 대시보드/메뉴 연결은 제한적 |
| `/supplier/event-offers` | `SupplierSpaceLayout` | `SupplierEventOfferPage` | 이벤트 오퍼 | 예 | Sidebar / dashboard stats | 높음 | 최근 기능이며 대시보드에서 일부 반영 |
| `/supplier/partner-commissions` | `SupplierSpaceLayout` | `SupplierPartnerCommissionsPage` | 파트너 수수료/정산 정책 | 예 | Sidebar | 높음 | 정산 기능과 이름이 유사하지만 데이터 의미가 다름 |
| `/supplier/forum` | `SupplierSpaceLayout` | `ForumPage` | 공급자 포럼 | 예 | Sidebar | 높음 | 커뮤니티 기능 |
| `/supplier/my-forum` | `SupplierSpaceLayout` | `MyForumDashboardPage` | 내 포럼 | 예 | Sidebar | 높음 | 커뮤니티 기능 |
| `/supplier/profile` | `SupplierSpaceLayout` | redirect to `/mypage/business-profile` | 프로필 이동 | 예 | Sidebar (설정) | 높음 | redirect 대상이 명확함 |

### 3.2 `/account/supplier/*` route inventory

| Route | Layout | Page component | 기능 | 메뉴 노출 | 진입 링크 | 실사용 가능성 | 중복 여부 |
|---|---|---|---|---|---|---|---|
| `/account/supplier` | `SupplierAccountLayout` | `SupplierAccountDashboardPage` | 주문/재고/정산 요약, 빠른 작업 | 예 | AccountMenu/직접 URL | 높음 | `/supplier/dashboard` 와 홈 기능 중복 |
| `/account/supplier/products` | `SupplierAccountLayout` | `SupplierProductsListPage` | 상품 목록, 검색, 필터, 가격 수정, 상태 변경 | 예 | Sidebar / dashboard quick action | 높음 | `/supplier/products` 와 중복 |
| `/account/supplier/orders` | `SupplierAccountLayout` | `SupplierOrdersListPage` | 주문 목록, 상태 필터, 상태 전환 | 예 | Sidebar / dashboard quick action | 높음 | `/supplier/orders` 와 중복 |
| `/account/supplier/orders/:id` | `SupplierAccountLayout` | `SupplierOrderDetailPage` | 주문 상세/배송 정보 | 예 | 리스트 페이지 | 높음 | `/supplier/orders` 와 중복 |
| `/account/supplier/inventory` | `SupplierAccountLayout` | `SupplierInventoryPage` | 재고 조회/추적/수정 | 예 | Sidebar / dashboard alert | 높음 | `/supplier/*` 에 동등 기능 없음 |
| `/account/supplier/settlements` | `SupplierAccountLayout` | `SupplierSettlementsPage` | 정산 조회/필터/상세 | 예 | Sidebar / dashboard summary | 높음 | `/supplier/partner-commissions` 와 개념이 다름 |

---

## 4. Dashboard 비교

### 4.1 비교 표

| 항목 | `/supplier/dashboard` | `/account/supplier` |
|---|---|---|
| 대시보드 목적 | 공급자 AI Copilot/운영 허브 | 주문·재고·정산 중심의 운영 요약 |
| 사용 API | `supplierCopilotApi` + `supplierKpaEventOfferApi` | `supplierApi` + `dashboardApi` |
| 표시 KPI | 등록 상품, 판매 중, 최근 7일 주문, 이벤트/특가 현황 | 오늘 주문, 처리 대기, 배송 대기, 재고 부족/등록 상품 |
| 빠른 작업 | 유통참여형 펀딩 생성/관리, 제품/오퍼 관련 CTA | 상품 등록, 상품 관리, 주문 관리, 재고 관리, 정산 관리 |
| 주문 표시 | AI/상품 성과 섹션과 간접 링크 | 최근 주문 목록 직접 표시 |
| 상품 표시 | 상품 성과 TOP 5 | 상품 현황 요약 |
| 재고 표시 | 없음 | 재고 알림/재고 부족 표시 |
| 정산 표시 | 없음 | 정산 현황 카드 |
| AI 분석 | 강함 | 없음 |
| 프로필·승인 안내 | `SupplierActivationGate` 로 일부 반영 | 없음 |
| 최근 기능 반영 | 매장용 설명서, Screen Set, 디지털 사이니지, 유통참여형 펀딩, 이벤트 오퍼 등 반영 | 주문/재고/정산 운영 위주로 반영 |
| 실제 공급자 업무 적합성 | 공급자 운영 허브 관점에서 더 적합 | 주문 처리·재고·정산 작업 관점에서 더 적합 |

### 4.2 판단

- `/supplier/dashboard` 가 현재 canonical 공급자 홈에 더 가깝다.
- `/account/supplier` 는 운영 업무용 대시보드로 유지하되, 독립 메인 홈으로는 부적합하다.
- 두 화면이 각각 독립적으로 유지될 이유는 제한적이다. 다만 `/account/supplier` 의 재고·정산·주문 업무는 `/supplier/*` 에 통합되더라도 충분히 유지 가능하다.
- `/account/supplier` 대시보드에 있는 실기능 중 `/supplier/dashboard` 에 없는 항목은 주로 다음과 같다.
  - 재고 알림 및 재고 관리 진입
  - 정산 현황 및 정산 관리 진입
  - 주문 처리 대기/배송 대기 요약
  - 빠른 작업으로서 재고/정산 진입

---

## 5. 상품·주문·재고·정산 중복 분석

### 5.1 상품

| 항목 | `/supplier/products` | `/account/supplier/products` |
|---|---|---|
| 조회 API | `supplierApi` 기반 제품 목록/상태/가격 관리 | `supplierApi` 기반 상품 목록 |
| 검색·필터 | 강함 | 있음 |
| 등록 진입 | 제품 등록 / 대량 등록 / 등록 도우미로 분산 | 단순 상품 관리 진입 |
| 가격 수정 | 있음 | 있음 |
| 활성 상태 변경 | 있음 | 있음 |
| 분배 유형 | 있음 | 없음 또는 제한적 |
| 공급 오퍼 연결 | 있음 | 없음 |
| 승인 상태 | 있음 | 있음 |
| 재고 표시 | 일부 | 일부 |
| 행 액션 | 다양함 | 비교적 단순 |

판단: `/supplier/products` 가 더 진보된 상품 운영 페이지다. `/account/supplier/products` 는 기능이 단순하고, `/supplier/products` 로 흡수하는 것이 자연스럽다.

### 5.2 주문

| 항목 | `/supplier/orders` | `/account/supplier/orders` | `/account/supplier/orders/:id` |
|---|---|---|---|
| 목록 기능 | 서비스별 주문 허브/통합 주문 보기 | 주문 목록 + 상태 필터 | 상세 페이지 |
| 상태 필터 | 있음(통합 조회 기준) | 있음 | 없음 |
| 상태 전이 | 읽기 중심 | 처리 상태 변경 가능 | 없음 |
| 주문 상세 | 서비스별/통합 읽기 | 상세 페이지 | 상세 페이지 |
| 배송 정보 | 일부 | 상세 페이지에서 가능 | 상세 페이지 |
| 택배사·운송장 | 현재 코드상 직접 UI는 제한적 | 주문 상세 페이지가 해당 기능을 담당할 가능성 있음 | 상세 페이지 |
| 매장 정보 | 있음 | 있음 | 있음 |
| 페이지네이션 | 있음 | 있음 | 없음 |
| API | `/neture/supplier/orders/summary`, `/orders/unified` | `/neture/supplier/orders`, `/orders/:id/status` | `/neture/supplier/orders/:id` |

판단: 주문은 `/supplier/orders` 와 `/account/supplier/orders` 가 서로 다른 역할을 가진다. `/supplier/orders` 는 운영 허브/요약, `/account/supplier/orders` 는 실제 처리 워크플로우에 가깝다. 두 경로를 하나의 IA 아래 통합하는 것이 적절하지만, 처리 전환 기능은 `/supplier/orders` 쪽으로 이관하는 것이 자연스럽다.

### 5.3 재고

- `/account/supplier/inventory` 는 실제 재고 조회/추적/수정 기능을 가진 유일한 화면이다.
- `/supplier/*` 에는 동등한 재고 화면이 없다.
- 현재 코드상 `/supplier` 메뉴에 “재고” 항목은 없다.
- 판단: 재고는 `/supplier/*` 로 편입해야 한다. 특히 `/supplier/dashboard` 또는 `주문·정산` 축에 재고 알림/재고 관리 진입을 포함하는 것이 적절하다.

### 5.4 정산

- `/account/supplier/settlements` 는 공급자 거래 정산(미정산/지급완료/정산내역)의 실제 조회 화면이다.
- `/supplier/partner-commissions` 는 파트너 수수료/지급 정책과 관련되어 있어, 정산과 같은 개념이지만 데이터 의미가 다르다.
- 판단: 두 화면은 혼동하면 안 되지만, 공급자 업무 관점에서 정산은 `/supplier/*` 로 이동하는 것이 자연스럽고, 파트너 수수료는 `Finance` 또는 별도 메뉴에서 유지하는 것이 좋다.

---

## 6. 진입점 조사

### 6.1 로그인 후 기본 진입

- `getNetureDashboardRoute()` 는 공급자 역할의 기본 경로를 `/supplier/dashboard` 로 반환한다.
- `AccountMenu` 는 로그인 후 `dashboardPath` 를 사용해 공급자 대시보드 항목을 추가한다.
- `NetureUserMenu` 도 공급자 대시보드 링크를 `/supplier/dashboard` 로 제공한다.
- 즉, 공급자의 기본 홈은 코드상 `/supplier/dashboard` 로 해석된다.

### 6.2 실제 진입점 분석

- 사용자가 공급자 역할로 로그인하면 기본적으로 `/supplier/dashboard` 를 보게 된다.
- `/account/supplier` 는 직접 URL 접근은 가능하지만, Global Header / AccountMenu / 주요 공급자 메뉴에서 기본 진입점으로 노출되지 않는다.
- `/account/supplier` 안의 메뉴는 대시보드 카드와 링크를 통해서만 간접적으로 발견할 수 있다.
- 특정 화면만 사실상 숨겨져 있는 것은 `/account/supplier/inventory` 와 `/account/supplier/settlements` 로 보인다. 이들은 기능은 있으나 메인 공급자 IA에서 노출되지 않는다.

### 6.3 결론

- 공급자의 기본 홈은 실제로 `/supplier/dashboard` 이다.
- 사용자가 두 대시보드를 모두 발견할 수 있는 구조는 아니다. `/account/supplier` 는 메인 진입점이 아니므로, 사실상 숨겨진 운영 공간으로 남아 있다.
- 두 화면 사이의 이동 링크는 일부 존재하지만, 명시적/일관적이지 않다.

---

## 7. Sidebar IA 분석

현재 `SupplierSpaceLayout` 의 Sidebar는 아래 축으로 구성되어 있다.

- Overview / Dashboard
- 제품 관리
- 공급 오퍼
- 매장용 태블렛
- 디지털 사이니지
- 판매자 모집
- 유통참여형 펀딩
- 이벤트 오퍼
- 주문·배송
- Finance
- 설정
- Community

### 7.1 문제점

1. `Inventory` 와 `Settlement` 이 메인 공급자 IA에 없다.
2. `Finance` 그룹이 파트너 수수료만 맡고 있어, 정산/지급과 분리되어 있어 사용자 이해가 떨어진다.
3. `Community` 는 포럼/내 포럼으로 나뉘지만, 다른 운영 기능과의 관계가 분리되어 있다.
4. 최근 추가 기능(매장용 설명서, Screen Set, 디지털 사이니지, 유통참여형 펀딩, 이벤트 오퍼)이 메뉴에는 있으나, 대시보드/빠른 작업/알림과의 연결이 약하다.
5. 한글·영문 혼용(예: `Overview`, `Finance`)과 `Dashboard`/`Overview`의 중복이 있다.

### 7.2 권장 구조 축

향후 IA는 아래 6축으로 재편하는 것이 적절하다.

- 상품
- 콘텐츠
- 유통
- 주문·정산
- 커뮤니티
- 설정

이 구조는 현재 기능 분포와 잘 맞고, `/account/supplier` 의 실기능을 `/supplier/*` 로 흡수하는 과정과도 자연스럽게 연결된다.

---

## 8. 최근 공급자 기능 반영 현황

| 기능 | 메뉴 있음 | 대시보드 상태 표시 | 빠른 작업 | 알림/미처리 안내 | 실제 route 연결 |
|---|---|---|---|---|---|
| 매장용 설명서 | 예 | 없음 | 없음 | 없음 | `/supplier/store-descriptions` |
| 공급자 태블렛 Screen Set | 예 | 없음 | 없음 | 없음 | `/supplier/tablet-screen-sets` |
| 디지털 사이니지 | 예 | 없음 | 없음 | 없음 | `/supplier/signage` |
| 판매자 모집 | 예 | 없음 | 없음 | 없음 | `/supplier/recruitments` |
| 공급 오퍼 | 예 | 없음 | 없음 | 없음 | `/supplier/supply-offers` |
| 이벤트 오퍼 | 예 | 예(대시보드 stats) | 없음 | 없음 | `/supplier/event-offers` |
| 유통참여형 펀딩 | 예 | 예(CTA) | 예 | 없음 | `/supplier/market-trial` |
| 프로필 보완 | 예(설정) | 일부(Activation Gate) | 없음 | 없음 | `/mypage/business-profile` |
| 배송정책 | 없음 | 없음 | 없음 | 없음 | NEEDS_MORE_EVIDENCE |
| 주문·배송 | 예 | 예 | 일부 | 없음 | `/supplier/orders`, `/account/supplier/orders` |
| 재고 | 없음 | `/account/supplier` 에서만 일부 | 없음 | 예(`/account/supplier`) | `/account/supplier/inventory` |
| 정산 | 없음 | `/account/supplier` 에서만 일부 | 없음 | 없음 | `/account/supplier/settlements` |

결론: 최근 기능은 공급자 공간에는 반영되었지만, 대시보드/알림/빠른 작업과 연결되는 수준은 아직 불균형하다. 재고·정산은 특히 메인 공급자 홈에서 거의 보이지 않는다.

---

## 9. 레거시·통합·redirect 후보

| Route / 페이지 | 분류 | 이유 |
|---|---|---|
| `/supplier/dashboard` | CANONICAL | 현재 기본 진입점이며 실제 메인 홈 역할을 수행 |
| `/account/supplier` | MERGE | 대시보드 성격이 겹치고, `/supplier/dashboard` 로 통합 가능 |
| `/account/supplier/products` | MERGE | `/supplier/products` 와 기능이 중복 |
| `/account/supplier/orders` | MERGE | `/supplier/orders` 와 역할이 겹침 |
| `/account/supplier/orders/:id` | MERGE | 주문 상세 기능은 `/supplier/orders` 쪽으로 통합 가능 |
| `/account/supplier/inventory` | MERGE | `/supplier/*` 로 이동해야 할 실기능 |
| `/account/supplier/settlements` | MERGE | `/supplier/*` 로 이동해야 할 실기능 |
| `/supplier/partner-commissions` | KEEP | 파트너 수수료/정산 정책의 의미가 다름 |
| `/supplier/forum` / `/supplier/my-forum` | KEEP | 커뮤니티 기능으로 독립 유지 가능 |
| `/supplier/profile` | REDIRECT | 이미 `/mypage/business-profile` 로 이동하도록 구현됨 |
| `/supplier/products/register` / `/supplier/products/bulk` / `/supplier/products/import-assistant` | KEEP | 각기 다른 등록 진입 경로로 유지 가능 |
| `/supplier/market-trial` / `/supplier/event-offers` | KEEP | 최근 기능으로 별도 축 유지 가능 |
| `배송정책` 관련 페이지/메뉴 | NEEDS_MORE_EVIDENCE | 현재 코드상 명확한 route/메뉴가 확인되지 않음 |

---

## 10. A/B/C안 비교

| 항목 | A안: `/supplier/*` 단일화 | B안: 두 공간 역할 분리 유지 | C안: 부분 통합 |
|---|---|---|---|
| 사용자 이해도 | 높음 | 중간 | 중간~높음 |
| 코드 복잡도 | 중간 | 낮음 | 중간 |
| 중복 유지 비용 | 낮음 | 높음 | 중간 |
| route 호환성 | 중간(기존 `/account/supplier/*` alias 필요) | 높음 | 높음 |
| 구현 범위 | 중간 | 낮음 | 낮음~중간 |
| 장기 확장성 | 높음 | 낮음 | 중간 |
| 권장 여부 | 매우 권장 | 비권장 | 차선 |

### A안 평가

- 장점: 공급자 업무가 한 곳에서 이해되고, `getNetureDashboardRoute()` 와 `Global Header` 의 현재 구조와도 잘 맞는다.
- 단점: `/account/supplier/*` 의 기존 링크/북마크 호환을 위한 alias 또는 redirect 단계가 필요하다.

### B안 평가

- 장점: 현재 코드의 분기 구조와 일부 상충을 피할 수 있다.
- 단점: 사용자가 “공급자 홈”과 “주문/재고/정산 업무”를 구분하기 어렵고, IA가 분산되어 유지 비용이 높다.

### C안 평가

- 장점: 위험도가 낮고 단계적 적용이 가능하다.
- 단점: `/supplier` 와 `/account/supplier` 의 이원 구조가 완전히 해소되지 않아, 장기적으로는 A안과 같은 통합이 다시 필요하다.

---

## 11. 최종 권장안

권장안은 A안, 즉 `/supplier/*` 를 canonical 공급자 운영 공간으로 확정하는 것이다.

### 권장안 핵심

1. `/supplier/dashboard` 를 canonical 공급자 홈으로 확정한다.
2. `/account/supplier/*` 는 임시 compatibility 영역으로 남기되, 실기능은 `/supplier/*` 로 통합한다.
3. 재고와 정산은 `/supplier/inventory` / `/supplier/settlements` 와 같은 형태로 `/supplier/*` 로 편입한다.
4. `/account/supplier` 는 redirect 대상 또는 alias로만 사용하고, 메인 공급자 IA는 `/supplier/*` 에서만 노출한다.
5. Sidebar IA는 아래 축으로 재구성한다.
   - 상품
   - 콘텐츠
   - 유통
   - 주문·정산
   - 커뮤니티
   - 설정
6. `/supplier/dashboard` 에는 다음 업무 상태를 추가하는 것이 적절하다.
   - 재고 부족/품절 알림
   - 정산 미정산 요약
   - 주문 처리/배송 대기 건수
   - 프로필 완성도/승인 안내
   - 최근 기능(매장용 설명서, Screen Set, 디지털 사이니지, 이벤트 오퍼, 유통참여형 펀딩) 상태 요약
7. AI 분석 영역은 대시보드의 상단 또는 중간 요약 블록에 배치하는 것이 적절하다. 즉, “AI 요약”은 메인 홈의 핵심 요소로 두되, 실제 업무 상태 카드와 함께 배치해 AI와 실무 상태를 동시에 보게 하는 구조가 좋다.

---

## 12. 후속 WO 목록

1. WO-O4O-NETURE-SUPPLIER-IA-UNIFICATION-V1
   - `/account/supplier/*` 기능을 `/supplier/*` 로 통합할 route/IA 구조안 정리

2. WO-O4O-NETURE-SUPPLIER-DASHBOARD-OPS-STATUS-V1
   - 대시보드에 재고·정산·주문 처리 상태 요약 추가

3. WO-O4O-NETURE-SUPPLIER-SIDEBAR-REARCHITECTURE-V1
   - Sidebar를 상품/콘텐츠/유통/주문·정산/커뮤니티/설정 축으로 재편

4. WO-O4O-NETURE-SUPPLIER-REDIRECT-COMPATIBILITY-V1
   - `/account/supplier/*` 의 기존 링크 호환성을 위한 redirect/alias 정책 수립

5. WO-O4O-NETURE-SUPPLIER-SETTLEMENT-AND-INVENTORY-ENTRY-V1
   - 재고·정산 진입을 `/supplier/*` 메인 메뉴에 연결

6. WO-O4O-NETURE-SUPPLIER-DELIVERY-POLICY-AND-STATE-TRACE-V1
   - 배송정책/배송상태 관련 정보의 route 및 UI 노출 범위 확인

---

## Appendix: 조사 근거 파일

- `services/web-neture/src/App.tsx`
- `services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx`
- `services/web-neture/src/components/layouts/SupplierAccountLayout.tsx`
- `services/web-neture/src/pages/supplier/SupplierDashboardPage.tsx`
- `services/web-neture/src/pages/account/SupplierAccountDashboardPage.tsx`
- `services/web-neture/src/pages/account/SupplierProductsListPage.tsx`
- `services/web-neture/src/pages/account/SupplierOrdersListPage.tsx`
- `services/web-neture/src/pages/account/SupplierInventoryPage.tsx`
- `services/web-neture/src/pages/account/SupplierSettlementsPage.tsx`
- `services/web-neture/src/components/AccountMenu.tsx`
- `services/web-neture/src/components/NetureUserMenu.tsx`
- `services/web-neture/src/config/dashboard.ts`
- `services/web-neture/src/lib/api/supplier.ts`
