# IR-O4O-UI-UX-STANDARDIZATION-CROSSAREA-AUDIT-V1

**작성 일자**: 2026-06-01
**조사 환경**: HEAD (main) `677f659ba` 시점 정적 코드 (read-only)
**조사 도구**: Read / Grep / Glob / Explore sub-agent
**작업 성격**: read-only 조사 — 코드/UI/API/DB/menu 수정 없음

---

## 1. 조사 개요

O4O 4개 서비스(KPA-Society, GlycoPharm, K-Cosmetics, Neture)의 운영자/관리자, 매장 허브, 내 매장 영역에서 UI-UX 표준화 가능성을 조사한다.

**목적**: 다음 UI-UX 공통화 작업의 방향과 우선순위를 정립한다. 특히 Store Hub / My Store 영역은 별도 채팅방에서 다루므로, 이 IR에서는 현황 기준만 잡는다.

---

## 2. 사전 git 상태

```
M  docs/investigations/CHECK-O4O-GLYCOPHARM-STORE-HUB-CONTENT-LABEL-RESIDUE-V1.md  ← 다른 세션 WIP
?? docs/investigations/IR-O4O-MY-STORE-PRODUCT-DESCRIPTION-CROSSSERVICE-GAP-V1.md  ← 다른 세션 WIP
?? *.png  ← 사용자 스크린샷
```

staged 없음. 이 IR 문서 생성 외 소스 파일 수정 없음.

---

## 3. 조사 대상 서비스/영역

| 서비스 | operator/ | admin/ | hub/ | store/ |
|--------|:---------:|:------:|:----:|:------:|
| KPA-Society | 24 pages | 5 pages | pharmacy/ (29 pages) | 3 pages |
| GlycoPharm | 32 pages | 2 pages | hub/ (9 pages) | 11 pages |
| K-Cosmetics | 20 pages | 2 pages | hub/ (8 pages) | 17 pages |
| Neture | 28 pages | 22 pages | hub/ (1 page) | 7 pages |

**핵심 공통 패키지:**
- `@o4o/operator-ux-core`: DataTable, OperatorDashboardLayout, DomainIASidebar, useBatchAction, ActionBar 등
- `@o4o/operator-core-ui`: OperatorStoresList, OperatorMembersConsolePage, CmsContentManager, KpaEditUserModal 등
- `@o4o/store-ui-core`: StoreDashboardLayout, STORE_MENU_CONFIG, 서비스별 config
- `@o4o/shared-space-ui`: StoreHubTemplate, ContentHubTemplate, StandardHomeTemplate 등
- `@o4o/ui`: ActionBar, RowActionMenu, BaseDetailDrawer, BulkResultModal, ConfirmActionDialog 등

---

## 4. Operator/Admin UI 현황

### 4-1. Operator Dashboard 구조

| 서비스 | 파일 | 구현 방식 | 판정 |
|--------|------|---------|:---:|
| KPA | `KpaOperatorDashboard.tsx` | `OperatorDashboardLayout` 5-block | ✅ canonical |
| GlycoPharm | `GlycoPharmOperatorDashboard.tsx` | `OperatorDashboardLayout` 5-block + `AxisNavigationSection` | ✅ |
| K-Cosmetics | `KCosmeticsOperatorDashboard.tsx` | `OperatorDashboardLayout` 5-block | ✅ |
| Neture | `NetureOperatorDashboard.tsx` | `OperatorDashboardLayout` 5-block | ✅ |

**5-block 표준**: KPI Grid → AI Summary → Action Queue → Activity Log → Quick Actions — 4개 서비스 전부 정렬 완료.

### 4-2. Admin Dashboard 구조

| 서비스 | 구현 방식 | 화면 수 | 판정 |
|--------|---------|:------:|:---:|
| KPA | 경량 custom (카드 + KPI, not 5-block). indigo 색상 | 5 | ⚠️ 독립 구현 |
| GlycoPharm | 최소 admin hub (규모 작음) | 2 | ⚠️ 미표준 |
| K-Cosmetics | 최소 admin hub (규모 작음) | 2 | ⚠️ 미표준 |
| Neture | 대형 운영 콘솔 22 pages (세금/정산/AI ops/공급자 승인 등) | 22 | ⚠️ 서비스 특수성 |

**Admin 공통 레이아웃 템플릿 없음** — operator와 달리 admin은 서비스별 독립 구조. Neture admin은 다른 3서비스와 규모 차이가 크다.

### 4-3. Operator 회원 관리

4개 서비스 모두 `OperatorMembersConsolePage` thin wrapper 적용 완료 (앞선 WO 결과).

### 4-4. Operator 리스트 화면 공통 패턴

| 화면 | KPA | GlycoPharm | K-Cosmetics | Neture |
|------|:---:|:----------:|:-----------:|:------:|
| 매장 관리 | `OperatorStoresList` thin wrapper | `OperatorStoresList` + `PharmaciesPage`(커스텀) | `OperatorStoresList` thin wrapper | `OperatorStoresList` thin wrapper |
| 회원 관리 | `OperatorMembersConsolePage` | `OperatorMembersConsolePage` | `OperatorMembersConsolePage` | `OperatorMembersConsolePage` |
| CMS 콘텐츠 | `CmsContentManager` | (별도) | (별도) | (별도) |
| 포럼 관리 | 커스텀 | 커스텀 | N/A | 커스텀 |

**GlycoPharm `PharmaciesPage`**: 약국 목록 화면이 `OperatorStoresList` 외에 별도로 존재. 커스텀 batch UI 사용(ActionBar 미사용). → **표준화 대상**.

---

## 5. Store Hub UI 현황

### 5-1. Hub 페이지 구현 방식

| 서비스 | Hub 진입 경로 | 구현 방식 | 판정 |
|--------|-------------|---------|:---:|
| KPA | `/store-hub` (PharmacyPage) | 비스포크 (StoreHubTemplate 미사용) | ⚠️ |
| GlycoPharm | `/store-hub` (StoreHubPage) | `StoreHubTemplate` (config-driven, inline edit 가능) | ✅ |
| K-Cosmetics | `/store-hub` (KCosmeticsHubPage) | `StoreHubTemplate` (config-driven, inline edit 가능) | ✅ |
| Neture | `/hub` (HubPage) | 최소 구현 (공급자/파트너 랜딩 구조 다름) | ⚠️ |

### 5-2. Hub 내부 메뉴 항목

**GlycoPharm `GlycoPharmHubLayout`** (사이드바 기반):
- 홈, **상품 카탈로그**(B2B), 사이니지, 콘텐츠, 블로그, POP, QR 코드, 이벤트/특가

**K-Cosmetics** (유사 구조):
- 홈, B2B 상품, 사이니지, 콘텐츠, 블로그, POP, QR, 이벤트/특가

**KPA** (PharmacyHubLayout):
- 홈, 상품 카탈로그(B2B), 사이니지, 콘텐츠, 블로그, 자료실, 이벤트

→ GlycoPharm과 K-Cosmetics는 메뉴 항목 거의 동일. KPA는 자료실(Resources) 추가.

### 5-3. Hub 각 섹션 표준화 수준

| 섹션 | GlycoPharm | K-Cosmetics | KPA | 표준화 도구 |
|------|:----------:|:-----------:|:---:|------------|
| B2B 카탈로그 | ✅ (KPA 기준 정렬 완료) | ✅ (KPA 기준 정렬 완료) | ✅ canonical | `HubB2BCatalogPage` |
| 사이니지 라이브러리 | ✅ | ✅ | ✅ | `HubSignageLibraryPage` |
| 콘텐츠 라이브러리 | ✅ | ✅ | ✅ | `HubContentListPage`/`ContentHubTemplate` |
| 블로그 라이브러리 | ✅ | ✅ | ✅ | `HubBlogLibraryPage` |
| POP 라이브러리 | ✅ | ✅ | ✅ | `HubPopLibraryPage` |
| QR 코드 라이브러리 | ✅ | ✅ | ✅ | `HubQrLibraryPage` |
| 이벤트/특가 | ✅ | ✅ | ✅ | `HubEventOffersPage` |
| 자료실 | ❌ | ❌ | ✅ (KPA only) | `ResourcesHubTemplate` |

---

## 6. My Store UI 현황

### 6-1. Store 메뉴 구조

**고정 8개 메뉴 항목** (`@o4o/store-ui-core/config`):
`dashboard → products → local-products → channels → orders → content → signage → settings`

| 서비스 | 메뉴 구조 | 특이사항 |
|--------|---------|---------|
| KPA | flat (6개 활성화) | `dashboard, products, orders, content, signage, settings` |
| GlycoPharm | flat (7개 활성화) | `dashboard, products, orders, channels, signage, settings, billing` |
| K-Cosmetics | **section-based (5 그룹)** | 중첩 경로: `/store/marketing/signage/playlist` 등 |
| Neture | flat (6개 활성화) | `dashboard, products, orders, channels, billing, settings` (signage/content 없음) |

**K-Cosmetics 특이점**: 다른 3개 서비스는 flat 메뉴인데 K-Cosmetics만 5개 섹션 그룹 + 중첩 경로 사용. 이는 UX 다양성이 아닌 구현 편차로 보임 → **표준화 대상**.

### 6-2. 내 매장 pages 구성 (GlycoPharm 기준)

```
store/
  StoreOverviewPage.tsx        — 대시보드
  StoreProductsPage.tsx        — 내 상품
  StoreLocalProductsPage.tsx   — 로컬 상품
  StoreChannelsPage.tsx        — 채널 관리
  StoreOrdersPage.tsx          — 주문 관리
  StoreSignagePage.tsx         — 사이니지
  StoreContentPage.tsx         — 콘텐츠 (POP/QR/Blog 포함)
  StoreCartPage.tsx            — 장바구니
  StoreInfoPage.tsx            — 매장 정보
```

K-Cosmetics는 이를 가장 세분화 (17 pages). KPA는 가장 단순 (3 pages — store/ 대부분 pharmacy/ 경로에 있음).

---

## 7. 메뉴/IA 구조 비교

### 7-1. 상단 Navigation config 패턴

모든 서비스 → `services/{svc}/src/config/navigation.ts` 집중화. 구조 동일:
- **base navigation** (항상 노출): 커뮤니티, 이용 가이드 등
- **contextual navigation** (role 필터): 허브, 내 매장, 운영자, 관리자

### 7-2. 메뉴 어휘 불일치

| 개념 | KPA | GlycoPharm | K-Cosmetics | Neture |
|------|-----|-----------|------------|--------|
| 매장 운영자 역할 | `storeOwner` | `pharmacyRelated + storeOwner` | `storeManager` | N/A (메뉴 없음) |
| 허브 vs 내 매장 순서 | 내 매장 first | HUB first | HUB first | N/A |
| 매장 허브 진입 | 허브 탭 | 허브 탭 | 허브 탭 | 별도 랜딩 |
| 운영자 대시보드 | `/operator` | `/operator` | `/operator` | `/operator` |

**Neture**: supplier/partner 역할에 대한 contextual nav가 없음(공급자 대시보드는 별도 landing page). 다른 3서비스와 완전히 다른 IA.

### 7-3. Operator Sidebar: DomainIASidebar

4개 서비스 모두 `DomainIASidebar` (@o4o/operator-ux-core) 사용:
- **KPA/GP/KCOS**: community / store_hub / common 3축
- **Neture**: 별도 도메인 IA (supplier/partner/commerce/settlement 등) — 확인 필요

---

## 8. 리스트 UI 패턴 비교

### 8-1. DataTable 사용 현황

| 영역 | DataTable 사용 | 비고 |
|------|:------------:|------|
| Operator 회원 관리 | ✅ 전부 | `OperatorMembersConsolePage` wrapper |
| Operator 매장 관리 | ✅ 전부 | `OperatorStoresList` 또는 DataTable 직접 |
| Operator 포럼 관리 | ⚠️ 혼재 | 서비스별 커스텀 구현 다수 |
| Operator 콘텐츠 관리 | ✅ 대부분 | `CmsContentManager` 또는 직접 |
| Hub 리스트 | ✅ 대부분 | 각 Hub 페이지에서 DataTable 직접 |
| My Store 리스트 | ⚠️ 혼재 | 서비스별 편차 있음 |

### 8-2. 상세 보기 방식

| 서비스/영역 | 주요 방식 | 비고 |
|-----------|---------|------|
| 회원 관리 | `BaseDetailDrawer` | 표준화 완료 |
| Operator 매장 관리 | Drawer 또는 별도 page | 혼재 |
| Hub B2B 카탈로그 | inline row action 버튼 | Drawer 없음 |
| My Store 상품 | 별도 page | `/store/products/:id` |
| Admin 회원 관리 | Drawer (공통 wrapper) | 표준화 완료 |

### 8-3. 빈 상태 / 로딩 / 에러 처리

DataTable은 `emptyMessage` prop으로 표준화. DataTable 미사용 화면은 각자 구현.

---

## 9. 체크박스 선택 후 액션 흐름 비교

### 9-1. 표준 패턴 (ActionBar + useBatchAction + BulkResultModal)

**완전 적용 영역:**
- 회원 관리 (4개 서비스 모두)
- KPA Hub 콘텐츠/LMS/포럼/자료실 리스트
- GlycoPharm Hub B2B 카탈로그

**부분 적용:**
- GlycoPharm `PharmaciesPage`: 커스텀 inline batch UI (ActionBar 미사용)
- K-Cosmetics operator 일부 페이지

**미적용:**
- My Store 영역 대부분 (단건 row action만 있음)
- Hub 라이브러리 페이지 (POP, QR, 블로그 등) — "가져가기" 단건 action만 있음

### 9-2. 액션 흐름 패턴

| 흐름 | 표준 패턴 | 실제 사용 |
|------|---------|---------|
| 다중 선택 | DataTable `selectable` prop | ✅ DataTable 적용 화면에서 사용 |
| 일괄 상태 변경 | `ActionBar` + `useBatchAction` | ✅ 회원 관리 등 |
| 위험 작업 confirm | `ConfirmActionDialog` | ✅ 대부분 |
| bulk 결과 표시 | `BulkResultModal` | ✅ bulk action 적용 화면 |
| 단건 row 액션 | `RowActionMenu` | ✅ 대부분 |

---

## 10. 공통 컴포넌트 사용 현황

### 10-1. @o4o/operator-ux-core

| 컴포넌트 | 사용 서비스 | 표준화 수준 |
|---------|-----------|:----------:|
| `OperatorDashboardLayout` | 4개 전부 | ✅ 완료 |
| `DomainIASidebar` | 4개 전부 | ✅ 완료 |
| `DataTable` | 4개 전부 (operator) | ✅ 완료 |
| `ActionBar` | 3개+ | ✅ 대부분 |
| `useBatchAction` | 3개+ | ⚠️ 미적용 화면 존재 |
| `OperatorMembersConsolePage` | 4개 전부 | ✅ 완료 |
| `StatusBadge` / `RoleBadge` | 4개 전부 | ✅ 완료 |

### 10-2. @o4o/operator-core-ui

| 컴포넌트 | 사용 서비스 | 표준화 수준 |
|---------|-----------|:----------:|
| `OperatorStoresList` | 4개 (KPA/KCOS/Neture 완전, GP는 PharmaciesPage별도) | ⚠️ GP 부분 |
| `CmsContentManager` | KPA 완전, 기타 선택적 | ⚠️ |
| `CommonEditUserModal` | 3개 (GP/KCOS/Neture) | ✅ |
| `KpaEditUserModal` | KPA | ✅ (정당 분리) |
| `OperatorMemberDeleteFlow` | GP/KCOS | ✅ 완료 |
| `AxisNavigationSection` | GP | ⚠️ GP only |

### 10-3. @o4o/store-ui-core

| 컴포넌트 | 사용 서비스 | 표준화 수준 |
|---------|-----------|:----------:|
| `StoreDashboardLayout` | 4개 전부 | ✅ 완료 |
| `StoreSidebar` / `StoreTopBar` | 4개 전부 | ✅ 완료 |
| Store config (GLYCOPHARM/KPA/KCOS 등) | 4개 전부 | ✅ |
| 8-item 고정 메뉴 | KPA/GP/Neture flat, KCOS section | ⚠️ KCOS 편차 |

### 10-4. @o4o/shared-space-ui

| 컴포넌트 | 사용 서비스 | 표준화 수준 |
|---------|-----------|:----------:|
| `StoreHubTemplate` | GP, KCOS | ⚠️ KPA/Neture 미사용 |
| `ContentHubTemplate` | GP, KCOS, (KPA 일부) | ⚠️ |
| `StandardHomeTemplate` | 부분 | ⚠️ |
| `SignageHubTemplate` | GP, KCOS | ⚠️ KPA 미적용 여부 확인 필요 |

### 10-5. @o4o/ui

| 컴포넌트 | 사용 서비스 | 표준화 수준 |
|---------|-----------|:----------:|
| `RowActionMenu` | 4개 전부 | ✅ |
| `BaseDetailDrawer` | 4개 전부 (회원 관리 등) | ✅ |
| `BulkResultModal` | 3개+ | ⚠️ |
| `ConfirmActionDialog` | 4개 전부 | ✅ |
| `ActionBar` | 3개+ (DataTable 있는 화면) | ✅ |

---

## 11. 표준화 가능 영역

### A. 즉시 표준화 가능 (단순 적용)

| 항목 | 현황 | 방법 |
|------|------|------|
| GlycoPharm PharmaciesPage batch UI | 커스텀 inline batch | `ActionBar + useBatchAction` 패턴 적용 |
| KPA Hub 페이지 → StoreHubTemplate 이식 | PharmacyPage 비스포크 | `StoreHubTemplate` config 적용 |
| Admin dashboard 경량 공통 레이아웃 | 서비스별 독립 | `AdminDashboardLayout` 신규 공통 컴포넌트 (선택) |
| Neture contextual nav 통합 | supplier/partner nav 없음 | navigation.ts에 supplier/partner 진입 추가 |

### B. 표준화 가능하지만 검토 필요

| 항목 | 현황 | 주의 사항 |
|------|------|----------|
| K-Cosmetics store 메뉴 flat화 | section-based + 중첩 경로 | 기존 route 깨짐 가능성 — redirect 필요 |
| Neture admin 영역 공통 레이아웃 | 22 pages 독립 구조 | Neture admin은 규모/목적이 다름 |
| Hub 섹션별 공통 라이브러리 컴포넌트 | 서비스별 HubBlogLibraryPage 등 | 이미 별도 IR 존재 (Store Hub 채팅방) |

### C. 이 채팅방에서 이어갈 수 있는 Operator/Admin UI 표준화

1. **GlycoPharm PharmaciesPage ActionBar 정렬** — 낮은 위험도
2. **Admin dashboard 경량 공통 레이아웃 설계** — 중간 위험도
3. **Neture contextual nav에 supplier/partner 진입 추가** — 중간 위험도

---

## 12. 표준화 위험 영역

| 항목 | 위험 이유 |
|------|---------|
| K-Cosmetics store 메뉴 flatten | 중첩 경로 → flat 전환 시 라우트 대규모 변경 |
| KPA Hub PharmacyPage 전면 이식 | KPA hub는 자료실/포럼 연동 등 추가 복잡도 |
| Neture admin 콘솔 공통화 | 22 pages의 목적/역할이 KPA/GP/KCOS admin과 질적으로 다름 |
| 서비스별 메뉴 어휘 통일 (storeOwner vs storeManager) | 기존 route guard / 권한 체계에 연쇄 영향 |
| Hub 섹션 컴포넌트 공통화 | Store Hub 채팅방 담당 영역 — 여기서 건드리면 충돌 |
| My Store 영역 전면 재구조 | 17 pages (K-Cosmetics) 등 규모 큼 — 별도 채팅방 필요 |

---

## 13. 우선순위 제안

### 🔴 이 채팅방 — Operator/Admin UI (즉시 가능)

| 순서 | WO 후보 | 위험도 | 설명 |
|:---:|--------|:-----:|------|
| 1 | GlycoPharm PharmaciesPage batch UI 정렬 | 낮음 | ActionBar + useBatchAction 패턴 적용 |
| 2 | Admin dashboard 공통 경량 레이아웃 설계 IR | 낮음 | 4개 서비스 admin 허브 패턴 정의 |
| 3 | Neture contextual nav supplier/partner 통합 | 중간 | navigation.ts에 진입점 추가 |

### 🟡 별도 Store Hub 채팅방

| 순서 | WO 후보 | 설명 |
|:---:|--------|------|
| 1 | KPA Hub → StoreHubTemplate 이식 | PharmacyPage config-driven 전환 |
| 2 | Hub 섹션 공통 라이브러리 표준화 | SignageLibraryPage, BlogLibraryPage 등 |

### 🟢 별도 My Store 채팅방

| 순서 | WO 후보 | 설명 |
|:---:|--------|------|
| 1 | K-Cosmetics store 메뉴 flat화 IR | 현황 조사 → 정합화 |
| 2 | My Store 리스트 DataTable 표준화 | 서비스별 편차 해소 |

---

## 14. 후속 WO 후보

### Operator/Admin 영역 (이 채팅방)

| WO | 범위 | 위험도 |
|----|------|:-----:|
| `WO-O4O-GLYCOPHARM-PHARMACIES-PAGE-BATCH-UI-ALIGNMENT-V1` | GP operator PharmaciesPage ActionBar 정렬 | 낮음 |
| `IR-O4O-ADMIN-DASHBOARD-LAYOUT-COMMONIZATION-AUDIT-V1` | Admin 허브 레이아웃 공통화 조사 | 낮음 |
| `WO-O4O-NETURE-CONTEXTUAL-NAV-SUPPLIER-PARTNER-INTEGRATION-V1` | Neture supplier/partner nav 통합 | 중간 |
| `WO-O4O-OPERATOR-FORUM-LIST-COMMONIZATION-V1` | 포럼 관리 리스트 공통화 | 중간 |

### Store Hub 영역 (별도 채팅방)

| WO | 범위 |
|----|------|
| `WO-O4O-KPA-HUB-STOREHUBTEMPLATE-MIGRATION-V1` | KPA Hub → template 이식 |
| `WO-O4O-HUB-LIBRARY-PAGE-COMMONIZATION-V1` | 서비스별 라이브러리 페이지 공통화 |

### My Store 영역 (별도 채팅방)

| WO | 범위 |
|----|------|
| `IR-O4O-MY-STORE-MENU-STRUCTURE-ALIGNMENT-AUDIT-V1` | K-Cosmetics section→flat 현황 조사 |
| `WO-O4O-MY-STORE-DATATABLE-STANDARDIZATION-V1` | My Store 리스트 DataTable 적용 |

---

## 15. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 현황 | 판정 |
|------|------|:---:|
| **"운영 경험 공통화" — Operator 영역** | OperatorDashboardLayout 5-block, DomainIASidebar, DataTable 모두 4개 서비스 적용. 회원/매장 관리 thin wrapper 완료. | ✅ 충돌 없음 |
| **서비스별 차이 = 도메인 차이 vs 구현 편차** | K-Cosmetics store section-based 메뉴, GP PharmaciesPage 커스텀 batch UI, KPA Hub 비스포크 — 이 세 가지는 **도메인 차이가 아닌 구현 편차**로 판단. | ⚠️ 정합 권장 |
| **동일 조작 질서 유지** | Operator 영역: DataTable + RowActionMenu + BaseDetailDrawer 조작 질서는 4개 서비스 일관. Hub/Store 영역: K-Cosmetics 중첩 경로로 UX 조작 질서 상이. | ⚠️ Store 영역 일부 |
| **리스트 선택 → 후속 작업 흐름** | 회원 관리: 완전 표준화. Hub B2B 카탈로그: 표준화 완료. PharmaciesPage / My Store: 미정합. | ⚠️ 일부 |
| **공통화 ≠ 도메인 강제 통합** | 메뉴 어휘 차이(storeOwner/storeManager/pharmacyRelated)는 단순 명명 편차. **역할 의미는 같으므로 어휘 통일 가능** — 단, RBAC 변경 없이 display label만 통일. | ✅ 안전 |
| **Neture supplier/partner 구조** | Neture의 supplier/partner는 조직 중심 구조로 KPA/GP/KCOS의 store owner와 목적이 다름. Nav 통합은 가능하지만 구조 강제 통일은 불가. | ✅ 의도된 분리 |
| **KPA canonical 기준** | 5-block dashboard, DomainIASidebar, DataTable, OperatorMembersConsolePage 모두 KPA 기준으로 타 서비스 정렬됨. | ✅ |
| **1인 개발 생산성** | thin wrapper 패턴으로 서비스 페이지 규모 최소화됨. GP PharmaciesPage, K-Cosmetics store 메뉴 등 남은 독립 구현이 유지보수 비용을 높임. | ⚠️ 정합 권장 |

**결론**: 운영자 영역은 5-block + thin wrapper 기반으로 고도로 표준화됨. Store Hub/My Store 영역은 별도 채팅방 관할. 이 채팅방에서 남은 주요 Operator 정합 작업은 GP PharmaciesPage batch UI + Neture nav 통합 정도이며, Admin dashboard 공통 레이아웃 IR이 다음 자연스러운 단계다.

---

## 부록 — 조사한 주요 파일/디렉터리

| 경로 | 목적 |
|------|------|
| `services/web-{svc}/src/config/navigation.ts` | 서비스별 메뉴 정의 |
| `services/web-{svc}/src/pages/operator/` | Operator 페이지 목록 |
| `services/web-{svc}/src/pages/admin/` | Admin 페이지 목록 |
| `services/web-{svc}/src/pages/hub/` | Hub 페이지 목록 |
| `services/web-{svc}/src/pages/store/` | My Store 페이지 목록 |
| `packages/operator-ux-core/src/index.ts` | Operator UI 기본 컴포넌트 |
| `packages/operator-core-ui/src/index.ts` | Operator 페이지 모듈 |
| `packages/store-ui-core/src/index.ts` | Store 대시보드 레이아웃/메뉴 |
| `packages/shared-space-ui/src/index.ts` | Hub/Home 템플릿 |
| `packages/ui/src/index.ts` | 기본 컴포넌트 |

---

*작성: Claude Code (2026-06-01)*
*read-only 조사 — 코드/DB/source/migration 수정 없음*
*다른 세션 WIP 미접촉*
