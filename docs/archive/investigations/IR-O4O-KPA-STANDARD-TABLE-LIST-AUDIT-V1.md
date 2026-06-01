---
id: IR-O4O-KPA-STANDARD-TABLE-LIST-AUDIT-V1
title: KPA 운영자 / 매장 HUB / 약국 운영 허브 / 내 매장 목록 화면 — O4O 표준 테이블 전환 대상 조사
status: completed
date: 2026-05-24
domain: kpa / ui-standardization / list-tables
related:
  - WO-O4O-KPA-OPERATOR-{BLOG|POP|QR}-WRITE-PAGE-V1
  - WO-O4O-KPA-STORE-HUB-{BLOG|POP|QR}-CONTENT-IMPORT-V1
  - docs/baseline/O4O-OPERATOR-TABLE-CANONICAL-V1.md
  - docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md
constitution:
  - CLAUDE.md §1 (조사 → 문제확정 → 최소 수정 → 검증 → 종료)
  - CLAUDE.md §11 (Operator Dashboard 표준 — DataTable 정책)
---

# IR-O4O-KPA-STANDARD-TABLE-LIST-AUDIT-V1

> KPA 의 4 영역 (운영자 / 매장 HUB / 약국 운영 허브 / 내 매장) 목록 화면 ~50 페이지를 조사하고, **O4O 표준 테이블** (`DataTable` + `ActionBar` + `RowActionMenu` + `useBatchAction` + checkbox + StatusBadge + 검색/필터/페이지네이션) 으로 전환할 대상을 우선순위와 함께 확정한다. 코드는 변경하지 않는다.

---

## 1. 표준 기준 — Reference Pattern

[`MemberManagementPage.tsx`](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx) 가 KPA 의 가장 정합한 표준 reference. import 구성:

```typescript
import { ActionBar, BulkResultModal, RowActionMenu, ConfirmActionDialog,
         BaseDetailDrawer, AddressSearch } from '@o4o/ui';
import { DataTable, MemberListLayout, StatusBadge,
         defineActionPolicy, buildRowActions, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef, MemberTab } from '@o4o/operator-ux-core';
```

표준 구성 7요소:
| 요소 | 출처 | 역할 |
|------|------|------|
| `DataTable` | `@o4o/operator-ux-core` | 본체 (checkbox + sort + pagination) |
| `ListColumnDef<T>` / `O4OColumn<T>` | `@o4o/operator-ux-core` | 컬럼 정의 (`system` / `onCellClick` 지원) |
| `ActionBar` | `@o4o/ui` | 선택 시 노출 — bulk action 버튼 모음 |
| `useBatchAction` | `@o4o/operator-ux-core` | bulk action 상태 / 모달 / 결과 collector |
| `RowActionMenu` / `buildRowActions` / `defineActionPolicy` | `@o4o/ui` + `@o4o/operator-ux-core` | 행별 액션 (status 기반 정책) |
| `StatusBadge` | `@o4o/operator-ux-core` | 상태 / 출처 badge 통일 |
| `BulkResultModal` / `ConfirmActionDialog` / `BaseDetailDrawer` | `@o4o/ui` | 부속 다이얼로그 / 사이드 패널 |

**Two DataTable APIs lesson (memory 인용)**:
- `@o4o/operator-ux-core DataTable` → `ListColumnDef<T>` / `O4OColumn<T>` (system / onCellClick 지원) — operator + HUB 영역
- `@o4o/ui DataTable` → `Column<T>` (system / onCellClick **없음**) — store 영역 (StoreOrdersPage / StoreSignagePage 등)

→ 운영자 / 매장 HUB 페이지는 **`@o4o/operator-ux-core` DataTable** 채택, 매장 (내 매장) 페이지는 영역 일관성을 위해 **`@o4o/ui` DataTable** 채택 권장.

---

## 2. 영역별 분류 매트릭스

### 2.1 운영자 영역 (`/operator/*`)

| # | 페이지 | route | UI 형태 | DataTable | checkbox | bulk | 등급 |
|:-:|--------|-------|---------|:---------:|:--------:|:----:|:----:|
| 1 | MemberManagementPage | `/operator/members` | ✅ 표준 (full reference) | ✅ ux-core | ✅ | ✅ | **A** |
| 2 | CollaborationRequestsPage | `/operator/collaboration-requests` | ✅ 표준 | ✅ ux-core | — | — | **A** |
| 3 | PharmacyRequestManagementPage | `/operator/pharmacy-requests` | ✅ 표준 | ✅ ux-core | — | — | **A** |
| 4 | ProductApplicationManagementPage | `/operator/product-applications` | ✅ 표준 | ✅ ux-core | — | — | **A** |
| 5 | QualificationRequestsPage | `/operator/qualification-requests` | ✅ 표준 | ✅ ux-core | — | — | **A** |
| 6 | ForumDeleteRequestsPage | `/operator/forum-delete-requests` | ✅ 표준 | ✅ ux-core | — | — | **A** |
| 7 | ForumManagementPage | `/operator/forum-management` | ✅ 표준 | ✅ ux-core | — | — | **A** |
| 8 | OperatorForumPage | `/operator/forum` | ✅ 표준 | ✅ ux-core | — | — | **A** |
| 9 | OperatorContentHubPage | `/operator/docs` | ✅ 표준 | ✅ ux-core | — | — | **A** |
| 10 | OperatorLmsCoursesPage | `/operator/lms` | ✅ 표준 | ✅ ux-core | — | — | **A** |
| 11 | OperatorStoreChannelsPage | `/operator/store-channels` | ✅ 표준 | ✅ ux-core | — | — | **A** |
| 12 | OperatorSurveyListPage | `/operator/surveys` | ✅ 표준 | ✅ ux-core | — | — | **A** |
| 13 | AuditLogPage | `/operator/audit-logs` | ✅ 표준 | ✅ ux-core | — | — | **A** |
| 14 | HqMediaPage | `/operator/signage/hq-media` | ✅ 표준 | ✅ ux-core | — | — | **A** |
| 15 | HqPlaylistsPage | `/operator/signage/hq-playlists` | ✅ 표준 | ✅ ux-core | — | — | **A** |
| 16 | TemplatesPage | `/operator/signage/templates` | ✅ 표준 | ✅ ux-core | — | — | **A** |
| 17 | ForcedContentPage | `/operator/signage/forced-content` | ✅ 표준 | ✅ ux-core | — | — | **A** |
| 18 | **OperatorBlogListPage** | `/operator/blog` | ❌ **카드형** (`items.map → <div rounded-xl>`) | ❌ | ❌ | ❌ | **C** |
| 19 | **OperatorPopListPage** | `/operator/pop` | ❌ **카드형** | ❌ | ❌ | ❌ | **C** |
| 20 | **OperatorQrListPage** | `/operator/qr` | ❌ **카드형** | ❌ | ❌ | ❌ | **C** |

**운영자 영역 등급별 카운트**: A=17개 (이미 표준) / C=3개 (전환 필요 — 모두 본 세션 작성)

### 2.2 매장 HUB 영역 (`/store-hub/*`)

| # | 페이지 | route | UI 형태 | DataTable | checkbox | bulk | 등급 |
|:-:|--------|-------|---------|:---------:|:--------:|:----:|:----:|
| 1 | HubB2BCatalogPage | `/store-hub/b2b` | ✅ 표준 | ✅ ux-core + Pagination | — | — | **A** |
| 2 | HubSignageLibraryPage | `/store-hub/signage` | ✅ 표준 + bulk | ✅ ux-core + **useBatchAction** | ✅ | ✅ | **A** (full ref) |
| 3 | HubContentLibraryPage | `/store-hub/content` | 🔸 ContentHubTemplate (@o4o/shared-space-ui 자체 템플릿) | — | — | — | **E** (전환 검토) |
| 4 | (KpaEventOfferPage) | `/store-hub/event-offers` | — | 별도 조사 필요 | — | — | **D?** |
| 5 | **HubBlogLibraryPage** | `/store-hub/blog` | ❌ **카드형** | ❌ | ❌ | ❌ | **C** |
| 6 | **HubPopLibraryPage** | `/store-hub/pop` | ❌ **카드형** | ❌ | ❌ | ❌ | **C** |
| 7 | **HubQrLibraryPage** | `/store-hub/qr` | ❌ **카드형** | ❌ | ❌ | ❌ | **C** |

**매장 HUB 등급별 카운트**: A=2개 / C=3개 (본 세션 작성) / E=1개 (별도 템플릿)

### 2.3 약국 운영 허브 / 매장 운영 (`/pharmacy/*` + `/store/*`)

| # | 페이지 | route | UI 형태 | DataTable | checkbox | bulk | 등급 |
|:-:|--------|-------|---------|:---------:|:--------:|:----:|:----:|
| 1 | StoreLocalProductsPage | `/store/local-products` | ✅ 표준 | ✅ @o4o/ui | — | — | **A** |
| 2 | StoreSignagePage | `/store/signage` | ✅ 표준 + Drawer | ✅ @o4o/ui + BaseDetailDrawer | — | — | **A** |
| 3 | StoreOrdersPage | `/store/orders` | ✅ 표준 | ✅ @o4o/ui | — | — | **A** |
| 4 | StoreQRPage | `/store/marketing/qr` | 🔸 **자체 구현 선택+bulk** (checkbox + selectedIds + bulk print) — DataTable 미사용 | ❌ | ✅ | ✅ | **B** (테이블 전환 + bulk 보존) |
| 5 | StoreChannelsPage | `/store/channels` | 🔸 **자체 구현 선택+bulk** | ❌ | ✅ | ✅ | **B** |
| 6 | StoreLibraryResourcesPage | `/store/library/resources` | 🔸 checkbox만 (bulk action 없음) | ❌ | ✅ | ❌ | **B** |
| 7 | **PharmacyBlogPage** | `/store/content/blog` | ❌ **카드형** (list/editor mode 분기) | ❌ | ❌ | ❌ | **C** |
| 8 | **PharmacyPopPage** | `/store/content/pop` | ❌ **카드형** (본 세션 Phase 3-B) | ❌ | ❌ | ❌ | **C** |
| 9 | **StoreAssetsPage** | `/store/content` | ❌ **카드형/임의** | ❌ | ❌ | ❌ | **C** |
| 10 | **StoreLibraryContentsPage** | `/store/library/contents` | ❌ **카드형** | ❌ | ❌ | ❌ | **C** |
| 11 | **TabletRequestsPage** | `/store/requests` | ❌ **카드형/임의** | ❌ | ❌ | ❌ | **C** |
| 12 | **StoreTabletDisplaysPage** | `/store/tablet-displays` | ❌ checkbox만 1건, DataTable 없음 | ❌ | 부분 | ❌ | **C** |

**약국/매장 운영 등급별 카운트**: A=3개 / B=3개 (전환 + bulk 보존) / C=6개 (카드형 전환 필요)

### 2.4 전체 합계

| 등급 | 카운트 | 의미 |
|:----:|:------:|------|
| **A** (이미 표준) | 22 | 변경 없음 |
| **B** (테이블화 + bulk 보존) | 3 | DataTable 도입 + 기존 checkbox/bulk 로직 이전 |
| **C** (카드형 → 표준 전환) | **12** | **본 IR 의 1차 대상** |
| **D** (조사 필요) | 1 | 후속 점검 |
| **E** (전환 부적합) | 1 | 전용 UI 유지 (HubContentLibraryPage) |

---

## 3. checkbox / bulk action 요구 정리 (전환 대상 12개 + B등급 3개)

### 3.1 운영자 영역 (3개)

| 페이지 | 선택 후 bulk action 후보 | backend 준비 상태 |
|--------|-------------------------|:------------------:|
| OperatorBlogListPage | 선택 발행 / 선택 보관 / 선택 삭제 | 단건 endpoint 만 — bulk fan-out 가능 (frontend 반복 호출) |
| OperatorPopListPage | 동일 | 동일 |
| OperatorQrListPage | 선택 발행 / 보관 / 삭제 | 동일 |

### 3.2 매장 HUB 영역 (3개)

| 페이지 | bulk action 후보 | backend |
|--------|-----------------|:--------:|
| HubBlogLibraryPage | 선택 일괄 가져가기 (매장 사본 다건 INSERT) | 단건 import endpoint — fan-out 가능 |
| HubPopLibraryPage | 동일 | 동일 |
| HubQrLibraryPage | 동일 | 동일 |

→ `useBatchAction` (HubSignageLibraryPage reference) 그대로 적용 가능 — fan-out 패턴.

### 3.3 약국/매장 운영 영역 (6 + 3 = 9개)

| 페이지 | bulk action 후보 | backend |
|--------|-----------------|:--------:|
| StoreQRPage (B) | 선택 PDF 일괄 출력 (이미 구현) / 선택 활성/비활성 / 선택 삭제 | 이미 `POST /pharmacy/qr/print` bulk 지원 |
| StoreChannelsPage (B) | 선택 활성/비활성 (이미 구현) | 부분 구현 |
| StoreLibraryResourcesPage (B) | 선택 자료함 추가 / 삭제 | 후속 WO 필요 |
| PharmacyBlogPage (C) | 선택 발행 / 보관 / 삭제 | 단건 endpoint — fan-out |
| PharmacyPopPage (C) | 선택 삭제 / 보관 | 단건 endpoint — fan-out |
| StoreAssetsPage (C) | 선택 출력 / 삭제 / 사본 생성 | 별도 조사 필요 |
| StoreLibraryContentsPage (C) | 선택 자료함 사본 생성 | 별도 조사 |
| TabletRequestsPage (C) | 선택 처리 / 이관 / 종료 | 별도 조사 |
| StoreTabletDisplaysPage (C) | 선택 활성/비활성 / 강제 새로고침 | 별도 조사 |

---

## 4. 우선 전환 대상 TOP 10

| 순위 | 페이지 | 영역 | 등급 | 근거 |
|:----:|--------|------|:----:|------|
| **1** | HubBlogLibraryPage | 매장 HUB | C | 사용자가 자주 보는 가져가기 화면. HubSignageLibraryPage reference 1:1 mirror 가능 |
| **2** | HubPopLibraryPage | 매장 HUB | C | 동일 사유. Phase 3-B 직후 정합 |
| **3** | HubQrLibraryPage | 매장 HUB | C | 동일 사유. 본 세션 작성 직후 정합 |
| **4** | OperatorBlogListPage | 운영자 | C | 운영자가 자주 보는 발행/관리 화면. MemberManagementPage reference 적용 |
| **5** | OperatorPopListPage | 운영자 | C | 동일 사유 |
| **6** | OperatorQrListPage | 운영자 | C | 동일 사유. 본 세션 작성 직후 정합 |
| **7** | PharmacyBlogPage | 내 매장 | C | 매장 owner CRUD + editor mode 분리 — 큰 작업이지만 매장 owner 사용 빈도 높음 |
| **8** | PharmacyPopPage | 내 매장 | C | 본 세션 Phase 3-B 작성. Phase 3-B 직후 정합 |
| **9** | StoreQRPage | 내 매장 | B | 이미 자체 checkbox+bulk 구현 — DataTable 도입 시 표준화 효과 큼 (기존 bulk PDF 출력 보존) |
| 10 | StoreLibraryContentsPage | 내 매장 | C | 자료함 통합 흐름의 핵심 진입점 |

---

## 5. 공통 컴포넌트 재사용 후보

| 컴포넌트 | 출처 | 사용 위치 (reference) | 본 IR 전환 시 적용처 |
|----------|------|---------------------|---------------------|
| `DataTable` | `@o4o/operator-ux-core` | MemberManagementPage / HubSignageLibraryPage | 운영자 + 매장 HUB 전환 6개 |
| `DataTable` | `@o4o/ui` | StoreSignagePage / StoreOrdersPage | 내 매장 전환 6+3개 |
| `ListColumnDef<T>` / `O4OColumn<T>` | `@o4o/operator-ux-core` | 동일 | 운영자/HUB |
| `Column<T>` | `@o4o/ui` | 매장 페이지 | 내 매장 |
| `ActionBar` | `@o4o/ui` | MemberManagementPage | 전체 |
| `RowActionMenu` + `buildRowActions` + `defineActionPolicy` | `@o4o/ui` + `@o4o/operator-ux-core` | MemberManagementPage | 전체 |
| `useBatchAction` | `@o4o/operator-ux-core` | HubSignageLibraryPage / MemberManagementPage | 전체 (bulk action 도입 시) |
| `StatusBadge` | `@o4o/operator-ux-core` | MemberManagementPage | 전체 (상태/출처 badge) |
| `BulkResultModal` / `ConfirmActionDialog` | `@o4o/ui` | MemberManagementPage | bulk action 결과/확인 |
| `BaseDetailDrawer` | `@o4o/ui` | StoreSignagePage / MemberManagementPage | 행 클릭 상세 |

→ **레퍼런스 페이지 2개**:
- 운영자/HUB 영역: [`MemberManagementPage.tsx`](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx) (full 표준)
- HUB 영역 bulk: [`HubSignageLibraryPage.tsx`](services/web-kpa-society/src/pages/pharmacy/HubSignageLibraryPage.tsx) (useBatchAction)
- 내 매장 영역: [`StoreSignagePage.tsx`](services/web-kpa-society/src/pages/pharmacy/StoreSignagePage.tsx) (@o4o/ui DataTable + Drawer)

---

## 6. 후속 WO 권장 순서 (4 묶음)

WO 단위 묶음 — 한 번에 다 전환하지 않고 단계화:

| # | WO | 범위 | 패턴 mirror |
|:-:|----|------|-------------|
| 1 | **WO-O4O-KPA-STORE-HUB-IMPORT-PAGES-STANDARD-TABLE-V1** | HubBlogLibraryPage + HubPopLibraryPage + HubQrLibraryPage 3개 → 표준 테이블 + checkbox + 일괄 가져가기 (`useBatchAction` fan-out) | HubSignageLibraryPage |
| 2 | **WO-O4O-KPA-OPERATOR-PUBLISHING-PAGES-STANDARD-TABLE-V1** | OperatorBlogListPage + OperatorPopListPage + OperatorQrListPage 3개 → 표준 테이블 + 일괄 발행/보관/삭제 (fan-out) | MemberManagementPage |
| 3 | **WO-O4O-KPA-MY-STORE-COPIES-STANDARD-TABLE-V1** | PharmacyBlogPage + PharmacyPopPage 2개 → 표준 테이블 (list mode 만 — editor mode 는 별도 페이지화 검토). StoreQRPage (B) 도 같이 — 기존 bulk PDF 출력 보존 | StoreSignagePage |
| 4 | **WO-O4O-KPA-MY-STORE-LIBRARY-STANDARD-TABLE-V1** | StoreLibraryContentsPage / StoreLibraryResourcesPage / StoreAssetsPage / TabletRequestsPage / StoreTabletDisplaysPage 5개 — bulk action backend 후속 필요 페이지 다수, **각 페이지 별도 점검 IR 선행 권장** | 영역별 선택 |

### 6.1 1순위 진행 권장: WO-1 (매장 HUB 가져가기 3개)

- 사용자가 가장 자주 보는 화면
- HubSignageLibraryPage 가 같은 영역의 완성된 reference (useBatchAction fan-out)
- 가져가기 action 1개로 단순 — 위험 낮음
- 본 세션 (Phase 3-B QR) 직후 정합 — 같은 패턴 일관 전환

### 6.2 별도 IR 선행 권장

- WO-4 (자료함 페이지들) 은 bulk action backend 가 미정 — `IR-O4O-KPA-MY-STORE-LIBRARY-BULK-ACTION-AUDIT-V1` 선행 후 진행
- HubContentLibraryPage 의 ContentHubTemplate 자체 전환 여부도 별도 검토 (E 등급 — 본 IR 범위 외)

---

## 7. Drift Guard / 본 IR 범위 외

본 IR 에서 명시적으로 제외:

| 항목 | 사유 |
|------|------|
| 사이드바 / 메뉴 구조 변경 | UI 표준화만, navigation 무관 |
| 라우트 변경 | URL 보존 |
| API 신설 / 변경 | bulk action backend 신설은 별도 WO |
| ContentHubTemplate 자체 변경 | `@o4o/shared-space-ui` 패키지 영역 — 본 IR 범위 외 |
| GlycoPharm / K-Cosmetics 동일 페이지 | KPA 기준 정렬 후 별도 WO 이식 |
| Neture | 매장 기능 없음 |
| 자체 checkbox/bulk 로직 (B 등급 3개) 의 backend 변경 | 기존 흐름 보존, UI 만 표준화 |
| 운영자 영역 17개 표준 페이지 추가 표준화 | 이미 A 등급 — 미세 정합은 별도 WO |

---

## 8. 결론

| 질문 | 결정 |
|------|------|
| KPA 목록 화면 현황? | 50+ 페이지 중 **A 등급 22개 (이미 표준), C 등급 12개 (전환 필요)** |
| 표준 reference 페이지? | **MemberManagementPage** (full) + **HubSignageLibraryPage** (bulk) + **StoreSignagePage** (매장 영역) |
| 본 세션 작성 6개 페이지 모두 C 등급인가? | ✅ — Blog/POP/QR 각 영역의 operator + HUB 6개 모두 카드형 |
| Two DataTable APIs 정책? | **운영자 + 매장 HUB → @o4o/operator-ux-core** / **내 매장 → @o4o/ui** (영역 일관성) |
| 우선 진행 권장? | **WO-1 (HUB 3개)** → WO-2 (Operator 3개) → WO-3 (My Store 3개) → WO-4 (자료함 5개, IR 선행) |

본 IR 의 결정은 **현재 작성 직후 화면의 카드형 한계** 와 **HubSignageLibraryPage / MemberManagementPage 의 기존 표준 정합** 사이의 gap 을 명확히 한 것. 본 세션 작성 6개 페이지는 의도적으로 1차 carry-over (Phase 3-A/3-B 흐름 우선) 후 본 표준화 사이클에서 일괄 정렬하는 것이 자연스러움.

---

## 9. 산출물 요약

| 항목 | 결과 |
|------|------|
| 운영자 영역 표준 테이블 전환 대상 | 3 (Operator Blog/POP/QR ListPage — 본 세션 작성) |
| 매장 HUB 영역 표준 테이블 전환 대상 | 3 (Hub Blog/POP/QR LibraryPage — 본 세션 작성) |
| 약국/매장 운영 허브 표준 테이블 전환 대상 | 6 (C) + 3 (B) = 9 |
| 내 매장 영역 표준 테이블 전환 대상 | (약국/매장 운영 허브와 동일 영역) |
| 이미 표준 테이블인 화면 | 22 (운영자 17 + HUB 2 + 매장 3) |
| checkbox / bulk action 부족 화면 | 12 (C 등급 전체) |
| 카드형 또는 임의 리스트 화면 | 12 (C 등급) |
| 우선 전환 대상 TOP 10 | §4 참조 — HUB 3 → Operator 3 → My Store 4 |
| 공통 컴포넌트 재사용 후보 | 10 (DataTable 2 종 + ActionBar + RowActionMenu + useBatchAction + StatusBadge + BulkResultModal + ConfirmActionDialog + BaseDetailDrawer + ListColumnDef + Pagination) |
| 후속 WO 권장 순서 | 4 묶음 (WO-1 HUB → WO-2 Operator → WO-3 My Store → WO-4 자료함 + 선행 IR) |
| 코드 변경 | **없음** (조사 전용 IR) |

---

*Author: Claude (Investigation only — no code change executed)*
*Investigation date: 2026-05-24*
*Status: completed — ready for WO-O4O-KPA-STORE-HUB-IMPORT-PAGES-STANDARD-TABLE-V1 (1순위)*
