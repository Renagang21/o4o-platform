# IR-O4O-STORE-HUB-LIST-UX-CANONICAL-AUDIT-V1

**작성일**: 2026-05-17
**상태**: Investigation (조사 전용 — 코드/DB 수정 없음)
**대상**: KPA-Society **Store HUB (매장 HUB) 영역 리스트 화면** 전수 분류
**범위**: KPA-Society 만. GlycoPharm / K-Cosmetics / Neture 는 후속 IR.

**선행 IR**:
- `IR-O4O-KPA-OPERATOR-LIST-CANONICAL-COVERAGE-AUDIT-V1` (operator)
- `IR-O4O-COMMUNITY-LIST-UX-CANONICAL-AUDIT-V1` (community)
- `IR-O4O-KPA-INTRANET-LEGACY-REMOVAL-IMPACT-AUDIT-V1` (legacy residue)

**상위 기준 문서**:
- `docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md`
- `docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md`

---

## 0. 결론 요약

KPA-Society Store HUB 의 **실 list 페이지 18 개** 중 **17 개(94%)** 가 적절한 canonical family 에 정렬됨. 즉시 정비 대상은 **2 건** — `SupplierListPage` (mock data) + `StoreLocalProductsPage` (raw `<table>`).

### 핵심 발견

1. **Store HUB 는 execution UX 와 canonical UX 의 균형이 잘 잡힘** — TRUE-TABLE (관리), CARD-FIRST (preview), HYBRID 가 의도적으로 혼재.
2. **DataTable 채택률 매우 높음** — execution-critical 화면(B2B / 주문 / signage / library / 채널) 모두 `@o4o/ui` 또는 `@o4o/operator-ux-core` `DataTable` 사용.
3. **`/store-hub/*` 와 `/store/*` 의 mirror 패턴이 안정적** — Hub catalog (B2B/signage/content) → 매장 copy-to-store workflow.
4. **🚨 즉시 정비 후보 2 건**:
   - **`SupplierListPage`** (`/store/commerce/products/suppliers`) — `mockSuppliers` 6건 hardcoded, 백엔드 미연결. `/store-hub/b2b` 와 기능 중복.
   - **`StoreLocalProductsPage`** (`/store/commerce/local-products`) — raw `<table>` + 자체 thead/tbody (L267 직접 확인). KPA Operator `OperatorContentHubPage` 와 같은 LEGACY-RAW 패턴.
5. **외부 wrapper 페이지 다수** — `@o4o/store-products-ui`, `@o4o/store-asset-policy-core`, `StoreHubTemplate` 등 외부 캐노니컬 컴포넌트로 위임. 별도 audit 필요 (본 IR scope 외).

### Family 분포 (실 list 18개 기준)

| 권장 Family | 카운트 | 대표 페이지 |
|---|:---:|---|
| TRUE CANONICAL TABLE | **8** | B2B / Orders / OrderWorktable / Channels / Signage / LibraryContents / LibraryResources / ProductionMaterials / HubB2BCatalog / HubSignageLibrary |
| SIMPLE DATATABLE | **6** | SignagePlayerSelect / TabletDisplays / TabletRequests / ProductInfoCreator / HubContentLibrary / (StoreProductDescriptions sidebar) |
| CARD-FIRST | **2** | StoreQR / StorePop |
| LEGACY CUSTOM | **1** | StoreLocalProductsPage (raw `<table>`) |
| DEAD-OR-MOCK | **1** | SupplierListPage |
| WRAPPER (외부 컴포넌트 위임) | 4 | StoreAssets / StoreProductsManager / HubSignageLibrary / HubB2BCatalog (외부 DataTable 사용 확인됨) |

> 합 카운트는 wrapper 가 다른 family 와 중복 분류되어 18 초과. wrapper 는 외부 컴포넌트가 canonical 일 경우 family 분류에 합산.

---

## 1. Canonical Family 정의 (기준)

| Family | 특징 | 권장 컴포넌트 |
|---|---|---|
| **TRUE CANONICAL TABLE** | dense metadata · multi-select · batch action · execution management | `BaseTable`/`DataTable` + `ActionBar` + `useBatchAction` + `BulkResultModal` |
| **SIMPLE DATATABLE** | table 적합, bulk 가치 낮음, read-only 또는 single action | `BaseTable`/`DataTable` (selection 없이) |
| **HYBRID LIST** | thumbnail + metadata 혼합 · 카드+row · mobile 중요 | `BaseTable` (light) 또는 hybrid row component |
| **CARD-FIRST** | visual showcase · execution preview · marketing showcase | grid + card |
| **LEGACY CUSTOM** | raw `<table>` / div grid / custom — family 외 | 정비 필요 |
| **DEAD-OR-MOCK** | mock data / 백엔드 미연결 / placeholder | cleanup-first |
| **WRAPPER** | 외부 canonical 컴포넌트 위임 | 외부 컴포넌트 — 별도 audit |

---

## 2. Store Home / Dashboard (1)

| 권장 Family | drift | 파일 | route |
|---|:---:|---|---|
| 비-list (대시보드) | — | `pages/pharmacy/StoreHomePage.tsx` | `/store` |

→ KPI + 실행 흐름 가이드 (3단계) 대시보드. 리스트 아님 — 분류 외.
실제 API 사용 (storeAnalytics, storeExecutionAssets, pharmacyProducts, storeHub).

---

## 3. Products / B2B (6 + wrapper 2)

| 권장 Family | drift | 파일 | route |
|---|:---:|---|---|
| TRUE CANONICAL TABLE | low | `pages/pharmacy/PharmacyB2BPage.tsx` | `/store/commerce/products` |
| TRUE CANONICAL TABLE | low | `pages/pharmacy/StoreOrderWorktablePage.tsx` | `/store/commerce/order-worktable` |
| TRUE CANONICAL TABLE | low | `pages/pharmacy/StoreOrdersPage.tsx` | `/store/commerce/orders` |
| **LEGACY CUSTOM** | **high** | `pages/pharmacy/StoreLocalProductsPage.tsx` ⚠️ | `/store/commerce/local-products` |
| **DEAD-OR-MOCK** | **high** | `pages/pharmacy/b2b/SupplierListPage.tsx` 🚨 | `/store/commerce/products/suppliers` |
| WRAPPER | — | `pages/pharmacy/PharmacySellPage.tsx` | `/store/commerce/products/b2c` |
| WRAPPER | — | `pages/pharmacy/StoreProductsManagerPage.*` | `/store/my-products` (외부 `@o4o/store-products-ui` 위임) |

### 핵심

- **PharmacyB2BPage** — `@o4o/ui DataTable` 헤더 주석 "WO-KPA-A-STORE-PHASE1-UI-UX-REFINE-V1: 카드 그리드 → DataTable 표준 전환" 으로 이미 canonical 전환 완료. selectable + quantity input + worktable bulk 액션.
- **StoreOrderWorktablePage / StoreOrdersPage** — 둘 다 `@o4o/ui DataTable` 사용, 주문 워크플로우 정렬.

### ⚠️ StoreLocalProductsPage — LEGACY CUSTOM (직접 검증)

[L267-279 확인](services/web-kpa-society/src/pages/pharmacy/StoreLocalProductsPage.tsx#L267) — raw `<table>` + 자체 `<thead>/<tbody>` + 자체 thumbnail/badge/액션 컬럼 구조. KPA Operator 의 `OperatorContentHubPage` 와 같은 LEGACY-RAW 패턴 (이미 cleanup WO 적용된 패턴). 정비 가능.

### 🚨 SupplierListPage — DEAD-OR-MOCK

[L15-105 확인](services/web-kpa-society/src/pages/pharmacy/b2b/SupplierListPage.tsx#L15):
```typescript
const mockSuppliers = [
  // ... 6 hardcoded supplier objects
];
// L104: activeSuppliers = mockSuppliers.filter(...)
// L105: pendingSuppliers = mockSuppliers.filter(...)
```

백엔드 API 호출 0건. `/store-hub/b2b` (HubB2BCatalogPage) 가 같은 도메인 실 데이터 화면 — **redundant placeholder**. 제거 또는 백엔드 연결 결정 필요.

---

## 4. Library (3)

| 권장 Family | drift | 파일 | route |
|---|:---:|---|---|
| TRUE CANONICAL TABLE | low | `pages/pharmacy/StoreLibraryContentsPage.tsx` | `/store/library/contents` |
| TRUE CANONICAL TABLE | low | `pages/pharmacy/StoreLibraryResourcesPage.tsx` | `/store/library/resources` |
| TRUE CANONICAL TABLE | low | `pages/pharmacy/StoreProductionMaterialsPage.tsx` | `/store/library/production-materials` |

### 분석

- **StoreLibraryContentsPage** — `StoreContentsSelector` (내부) + TabBar (content/course). multi-select → "제작 시작" bulk action → 제작 modal 흐름. canonical 완전 구현.
- **StoreLibraryResourcesPage** — library + snapshot 통합 테이블. selection + bulk delete.
- **StoreProductionMaterialsPage** — direct-content + execution-assets 통합. updatedAt sort + selection + bulk delete + 제작 모달.

→ Library 영역은 **execution workflow 와 가장 잘 정렬된 영역**. 사용자 정책의 "자료 → 콘텐츠 → 제작자료 → 실행" 흐름이 코드에 명시적으로 반영됨.

---

## 5. Marketing / Execution (5)

| 권장 Family | drift | 파일 | route |
|---|:---:|---|---|
| **CARD-FIRST** | low | `pages/pharmacy/StoreQRPage.tsx` | `/store/marketing/qr` |
| **CARD-FIRST** | low | `pages/pharmacy/StorePopPage.tsx` (editor) | `/store/marketing/pop` |
| TRUE CANONICAL TABLE | low | `pages/pharmacy/StoreSignagePage.tsx` (3-tab) | `/store/marketing/signage` |
| SIMPLE DATATABLE | low | `pages/pharmacy/SignagePlayerSelectPage.tsx` | `/store/marketing/signage/player` |
| SIMPLE DATATABLE | low | `pages/pharmacy/StoreProductInfoCreatorPage.tsx` | `/store/execution/product-info` |
| TRUE CANONICAL TABLE | low | `pages/pharmacy/PharmacyBlogPage.tsx` | `/store/content/blog` |
| (외부 위임) WRAPPER | — | `pages/pharmacy/StoreAssetsPage.tsx` | `/store/content` (`@o4o/store-asset-policy-core` `StoreAssetsPanel`) |

### 분석

- **StoreQRPage / StorePopPage** ⭐ — preview UX 가치 매우 높음. QR 코드 시각 미리보기 + PDF 일괄 인쇄 / POP 템플릿 + AI 생성 + PDF 결과. **table 전환 금지** — card-first 유지가 정책 의도와 일치.
- **StoreSignagePage** — 3-tab DataTable (videos / playlists / schedules). multi-select + 강제 토글 + 배치 publish. signage 실행 엔진.
- **SignagePlayerSelectPage** — published playlist 목록 + 활성 스케줄 banner + 재생 트리거. read-only browse.
- **PharmacyBlogPage** — 상태 탭 (draft/published/archived) + 편집 모드 토글. blog 게시 워크플로우.

### preview UX 가치가 큰 영역

`/store/marketing/pop`, `/store/marketing/qr`, `/store/marketing/signage` (tab 1-2) — 시각적 결과 확인이 핵심이라 table 전환 부적합.

---

## 6. Signage (2 + 1 hub mirror)

| 권장 Family | drift | 파일 | route |
|---|:---:|---|---|
| TRUE CANONICAL TABLE | low | `pages/pharmacy/StoreSignagePage.tsx` | `/store/marketing/signage` (위 Marketing 섹션에서 분석) |
| SIMPLE DATATABLE | low | `pages/pharmacy/SignagePlayerSelectPage.tsx` | `/store/marketing/signage/player` |
| TRUE CANONICAL TABLE (WRAPPER 내) | low | `pages/pharmacy/HubSignageLibraryPage.tsx` | `/store-hub/signage` (`@o4o/operator-ux-core DataTable` + 2-tab + copy-to-store bulk) |

### 분석

- Store 측 (`/store/marketing/signage`) = execution engine.
- HUB 측 (`/store-hub/signage`) = library browse + copy-to-store bulk.
- Player (`/store/marketing/signage/player`) = read-only 재생 선택.
- Playback (`/store/marketing/signage/play/:playlistId`) = detail/player — 분류 외.

→ Signage 영역은 **canonical 완성도 가장 높음**. 정비 불필요.

---

## 7. Channels (3)

| 권장 Family | drift | 파일 | route |
|---|:---:|---|---|
| TRUE CANONICAL TABLE | low | `pages/pharmacy/StoreChannelsPage.tsx` | `/store/channels` |
| SIMPLE DATATABLE | low | `pages/pharmacy/StoreTabletDisplaysPage.tsx` | `/store/commerce/tablet-displays` |
| SIMPLE DATATABLE | low | `pages/pharmacy/TabletRequestsPage.tsx` | `/store/requests` (5초 폴링) |

### 분석

- **StoreChannelsPage** — channel 탭 (B2C/KIOSK/TABLET) + KPI + Quick Actions + product list DataTable + TABLET 패널. 가장 복잡한 hub 콘솔.
- **StoreTabletDisplaysPage** — 2-panel (pool list + display assignment board). 비표준 layout 이나 execution-specific UX 로 적합.
- **TabletRequestsPage** — 상담 요청 feed, 5초 polling, row-action (acknowledge/complete/cancel). real-time UX.

→ Channels 영역도 모두 canonical 정렬됨.

---

## 8. Hub Mirror Pages (`/store-hub/*`)

| 권장 Family | drift | 파일 | route |
|---|:---:|---|---|
| (랜딩) WRAPPER | — | `pages/pharmacy/StoreHubPage.tsx` | `/store-hub` (`StoreHubTemplate` 위임) |
| SIMPLE DATATABLE (외부) | low | `pages/pharmacy/HubContentLibraryPage.tsx` | `/store-hub/content` (`ContentHubTemplate` + KPA adapter) |
| TRUE CANONICAL TABLE | low | `pages/pharmacy/HubB2BCatalogPage.tsx` | `/store-hub/b2b` (`@o4o/operator-ux-core DataTable` + bulk "내 매장에 추가") |
| TRUE CANONICAL TABLE | low | `pages/pharmacy/HubSignageLibraryPage.tsx` | `/store-hub/signage` (위 Signage 섹션에서 분석) |

### 분석

`/store-hub/*` = community/operator 가 만든 자원을 매장이 가져가는 catalog. mirror 패턴이 일관됨 (copy-to-store bulk workflow). `HubSignageLibraryPage` + `HubB2BCatalogPage` 는 둘 다 `@o4o/operator-ux-core DataTable` 사용 — operator 표준 그대로 가져와 store 측에서 재사용. canonical 정합성 우수.

---

## 9. 비-list 페이지 (분류 외, 참고)

| 파일 | 비고 |
|---|---|
| `StoreHomePage.tsx` | KPI dashboard |
| `StoreProductDescriptionsPage.tsx` | 편집기 (사이드바 list 동반, full-list 아님) |
| `StoreProductionMaterialEditorPage.tsx` | form/editor |
| `StoreDirectContentPage.tsx` | detail/editor |
| `ProductPopBuilderPage.tsx` | 빌더 |
| `ProductMarketingPage.tsx` | 상세 graph |
| `MarketingAnalyticsPage.tsx` | analytics dashboard |
| `LayoutBuilderPage.tsx` | visual editor |
| `SignagePlaybackPage.tsx` | fullscreen player |
| `PharmacyApprovalGatePage.tsx` | guard |
| `PharmacyPage.tsx`, `PharmacyInfoPage.tsx`, `PharmacyStorePage.tsx`, `PharmacyTemplatePage.tsx` | gate/form/settings |

→ 모두 list 아니므로 본 IR scope 외.

---

## 10. Execution Workflow UX 적합성 종합

| 영역 | execution 적합도 | preview 가치 | 권장 family 일치도 |
|---|:---:|:---:|---|
| `/store` dashboard | 높음 | 낮음 | ✅ (KPI + 가이드) |
| `/store/commerce/products` (B2B) | 높음 | 낮음 | ✅ TRUE TABLE |
| `/store/commerce/order-worktable` | 높음 | 낮음 | ✅ TRUE TABLE |
| `/store/commerce/orders` | 높음 | 낮음 | ✅ TRUE TABLE |
| `/store/commerce/local-products` | 중 | 중 | ⚠️ raw `<table>` (정비) |
| `/store/commerce/products/suppliers` | — | — | 🚨 mock |
| `/store/library/contents` | 높음 (제작 entry) | 중 | ✅ TRUE TABLE |
| `/store/library/resources` | 중 | 낮음 | ✅ TRUE TABLE |
| `/store/library/production-materials` | 높음 (결과 vault) | 낮음 | ✅ TRUE TABLE |
| `/store/marketing/pop` | 높음 | 매우 높음 | ✅ CARD-FIRST |
| `/store/marketing/qr` | 높음 | 매우 높음 | ✅ CARD-FIRST |
| `/store/marketing/signage` | 높음 | 높음 | ✅ TRUE TABLE (3-tab) |
| `/store/content/blog` | 높음 | 중 | ✅ TRUE TABLE |
| `/store/channels` | 높음 | 낮음 | ✅ TRUE TABLE |
| `/store-hub/b2b` | 높음 (copy 진입) | 낮음 | ✅ TRUE TABLE |
| `/store-hub/signage` | 높음 (copy 진입) | 높음 | ✅ TRUE TABLE + thumbnail |
| `/store-hub/content` | 중 | 낮음 | ✅ SIMPLE (외부 template) |

→ **execution-critical 16/18 페이지가 canonical 정렬 완료**. drift 2건만 잔존.

---

## 11. 즉시 정비 후보 (우선순위)

### Priority 1 — 🚨 DEAD-OR-MOCK

| 파일 | 작업 |
|---|---|
| `pages/pharmacy/b2b/SupplierListPage.tsx` | mock data 제거 결정 — 백엔드 연결 OR 페이지 제거 (`/store-hub/b2b` 와 redundant) |

### Priority 2 — ⚠️ LEGACY CUSTOM

| 파일 | 작업 |
|---|---|
| `pages/pharmacy/StoreLocalProductsPage.tsx` | raw `<table>` → `BaseTable` 또는 `DataTable` 마이그레이션. KPA Operator `OperatorContentHubPage` 정비 WO 패턴 재사용 가능 |

### Priority 3 — observational (현 상태 유지 + 작은 보강 가능)

- `StoreTabletDisplaysPage` 2-panel 구조 — 비표준이나 execution-specific UX, 변경 불필요
- `StoreProductDescriptionsPage` 사이드바 리스트 — 편집 페이지 부속 형태, 변경 불필요

---

## 12. card / hybrid 유지 권장 항목

table 전환 **금지**:

| 페이지 | 사유 |
|---|---|
| `StoreQRPage` (`/store/marketing/qr`) | QR 코드 시각 preview + 일괄 인쇄 — visual showcase 중심 |
| `StorePopPage` (`/store/marketing/pop`) | POP 템플릿 + AI 생성 + PDF preview — visual showcase 중심 |
| `StoreSignagePage` 의 videos/playlists 탭 | 미디어 썸네일 미리보기 — preview 가치 큼 |
| `HubSignageLibraryPage` (`/store-hub/signage`) | 미디어 썸네일 미리보기 |

→ 이미 적절한 family 적용됨. **canonical doc 의 §1.2 역할 정의와 일치 — operator true-table 강제 안 함**.

---

## 13. HYBRID 전환 권장 항목

본 IR 범위 내 HYBRID 전환 신규 권장 **0건**.

`StoreLocalProductsPage` 는 thumbnail 컬럼 있어 hybrid 도 적합하나 현재 코드는 raw `<table>` — 우선 BaseTable 로 정렬한 뒤 hybrid 적용 여부 별도 판단.

---

## 14. 외부 wrapper 의존도

| 페이지 | 위임 대상 |
|---|---|
| `StoreProductsManagerPage` | `@o4o/store-products-ui` |
| `StoreAssetsPage` | `@o4o/store-asset-policy-core` `StoreAssetsPanel` |
| `HubSignageLibraryPage` | `@o4o/operator-ux-core DataTable` (내부 직접 호출) |
| `HubB2BCatalogPage` | `@o4o/operator-ux-core DataTable` (내부 직접 호출) |
| `HubContentLibraryPage` | `ContentHubTemplate` + KPA adapter |
| `StoreHubPage` | `StoreHubTemplate` (랜딩) |

→ wrapper 의 내부 canonical 준수 여부는 **별도 IR 권장** (본 IR scope 외).

---

## 15. mobile / store usability 판단

Store HUB 사용자는 매장 데스크탑 + 태블릿 + 모바일 혼용:

| 페이지 | 주 사용 환경 | mobile 적합 |
|---|---|:---:|
| `/store` dashboard | desktop + mobile | 높음 ✅ |
| Products / Orders | desktop 중심 | 중 |
| Library | desktop 중심 | 중 |
| Marketing (POP/QR) | mobile preview 가치 큼 | 높음 ✅ |
| Signage execution | desktop / tablet | 중 |
| Tablet displays/requests | **tablet 전용** | 높음 ✅ |
| Channels | desktop | 중 |

→ table 채택 페이지(B2B / Orders / Library / Signage) 는 desktop 중심 — mobile에서는 dense 표 표시가 부담스러우나 store execution 의 일반 패턴은 desktop. 현 정렬 적절.

---

## 16. 위험 신호 / 추가 결정 사항

| # | 항목 | 비고 |
|---|---|---|
| 1 | **`SupplierListPage` 사용자 노출 확인 필요** | 라우트가 메뉴에 노출되어 있다면 mock 데이터가 사용자에게 보임 — 즉시 정비 |
| 2 | **`StoreLocalProductsPage` raw `<table>` ⚠️** | KPA Operator 와 동일 drift 패턴 (이미 정비된 패턴이 있음) — 즉시 BaseTable 전환 가능 |
| 3 | **wrapper 페이지의 외부 컴포넌트 canonical 준수 여부 미감사** | `@o4o/store-products-ui`, `@o4o/store-asset-policy-core` 등 — 별도 IR 권장 |
| 4 | **`StoreHomePage` 와 `/store-hub` 의 onboarding 흐름** | `/store` (dashboard) vs `/store-hub` (랜딩) UX 분리 정책 문서화 가치 |
| 5 | **TabletDisplays/Requests 의 mobile 최적화** | tablet 전용 화면이나 화면 비율 대응 별도 검증 권장 |
| 6 | **`/store-hub/b2b` 와 `SupplierListPage` 도메인 중복** | `SupplierListPage` 제거 결정 시 `/store-hub/b2b` 가 단일 진입점 — 좋은 정리 기회 |

---

## 17. 본 IR 범위 외 (후속)

- GlycoPharm / K-Cosmetics / Neture 의 Store HUB 영역 audit
- 외부 wrapper 컴포넌트 (`@o4o/store-products-ui`, `@o4o/store-asset-policy-core`, `StoreHubTemplate`, `ContentHubTemplate`) 의 내부 canonical 준수 audit
- detail / form / wizard / builder 페이지의 sub-list audit
- 후속 WO 작성 (`WO-O4O-STORE-LOCAL-PRODUCTS-CANONICAL-V1`, `WO-O4O-STORE-SUPPLIER-LIST-CLEANUP-V1` 등) — 본 IR 단계 외

---

## 18. 참조

### TRUE CANONICAL TABLE (실 list 8개)
- `services/web-kpa-society/src/pages/pharmacy/PharmacyB2BPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StoreOrderWorktablePage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StoreOrdersPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StoreLibraryResourcesPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StoreProductionMaterialsPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StoreSignagePage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/HubB2BCatalogPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/HubSignageLibraryPage.tsx`

### SIMPLE DATATABLE
- `services/web-kpa-society/src/pages/pharmacy/SignagePlayerSelectPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/TabletRequestsPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StoreProductInfoCreatorPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/HubContentLibraryPage.tsx`

### CARD-FIRST (visual preview)
- `services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx`

### 🚨 즉시 정비 후보
- `services/web-kpa-society/src/pages/pharmacy/b2b/SupplierListPage.tsx` (DEAD-OR-MOCK)
- `services/web-kpa-society/src/pages/pharmacy/StoreLocalProductsPage.tsx` (LEGACY-RAW `<table>`)

### WRAPPER (외부 위임)
- `services/web-kpa-society/src/pages/pharmacy/StoreAssetsPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StoreProductsManagerPage.*`
- `services/web-kpa-society/src/pages/pharmacy/PharmacySellPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/StoreHubPage.tsx`
- `services/web-kpa-society/src/pages/pharmacy/HubContentLibraryPage.tsx`

### 연관 IR
- `IR-O4O-KPA-OPERATOR-LIST-CANONICAL-COVERAGE-AUDIT-V1`
- `IR-O4O-COMMUNITY-LIST-UX-CANONICAL-AUDIT-V1`
- `IR-O4O-KPA-INTRANET-LEGACY-REMOVAL-IMPACT-AUDIT-V1`

### Canonical 기준 (참조)
- `docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md`
- `docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md`

---

*조사 전용 — 코드/DB 수정 없음. 본 IR 단계에서 후속 WO 작성 금지 (사용자 지시).*
