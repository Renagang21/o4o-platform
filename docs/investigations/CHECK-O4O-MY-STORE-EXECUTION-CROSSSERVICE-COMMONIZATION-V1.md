# CHECK-O4O-MY-STORE-EXECUTION-CROSSSERVICE-COMMONIZATION-V1

**날짜:** 2026-06-01  
**유형:** read-only 검증  
**목적:** KPA / GlycoPharm / K-Cosmetics 내 매장·내 약국 실행 영역 cross-service 공통화 수준 조사  
**코드 수정:** 없음

---

## 전체 판정: PARTIAL

**근거:** Store Hub → 내 매장 실행 흐름은 3개 서비스 모두 작동. 단 실행 영역의 깊이(Signage, Production Materials 등)는 KPA canonical 대비 GlycoPharm/K-Cosmetics가 더 경량화된 구조. 사용자-facing 문구 drift 1건 존재(GlycoPharm B2B Hub).

---

## 1. 서비스별 "내 매장 / 내 약국" Route 요약

### KPA-Society (`/store` — PharmacyGuard + StoreDashboardLayout)

| 경로 | 컴포넌트 | 줄수 | 영역 |
|------|---------|------|------|
| `/store` | `StoreHomePage` | 347 | 대시보드 |
| `/store/library/contents` | `StoreLibraryContentsPage` | 236 | 내 자료함 콘텐츠 |
| `/store/library/resources` | `StoreLibraryResourcesPage` | 927 | 내 자료함 리소스 |
| `/store/library/production-materials` | `StoreProductionMaterialsPage` | 632 | 제작 자료 |
| `/store/marketing/signage/playlist` | `StoreSignagePage` | **2356** | 사이니지 (3탭) |
| `/store/marketing/pop` | `StorePopPage` | 876 | POP |
| `/store/marketing/qr` | `StoreQRPage` | 1334 | QR |
| `/store/content/blog` | `PharmacyBlogPage` | — | 블로그 |
| `/store/marketing/product-descriptions` | `StoreProductDescriptionsPage` | 742 | 상품 설명 |
| `/store/my-products` | `StoreProductsManagerPage` | — | 내 매장 상품 |
| `/store/channels` | `StoreChannelsPage` | 2014 | 채널 배포 |
| `/store/commerce/tablet-displays` | `StoreTabletDisplaysPage` | 843 | 태블릿/디스플레이 |

### GlycoPharm (`/store` — PharmacyStoreGuard + StoreDashboardLayout)

| 경로 | 컴포넌트 | 줄수 | 영역 |
|------|---------|------|------|
| `/store` | `StoreOverviewPage` | 280 | 대시보드 |
| `/store/identity` | `StoreMainPage` | 704 | AI 코파일럿 |
| `/store/library/contents` | `StoreLibraryContentsPage` | 246 | 내 자료함 콘텐츠 |
| `/store/library/resources` | `StoreLibraryResourcesPage` | 245 | 내 자료함 리소스 |
| `/store/library/production-materials` | `StoreProductionMaterialsPage` | 243 | 제작 자료 |
| `/store/marketing/signage/playlist` | `StoreSignageMainPage` | **1476** | 사이니지 (3탭 canonical) |
| `/store/marketing/signage/library` | `ContentLibraryPage` | 307 | 사이니지 탐색 (legacy path 유지) |
| `/store/marketing/pop` | `StorePopPage` | 531 | POP |
| `/store/marketing/qr` | `StoreQrPage` | 562 | QR |
| `/store/content/blog` | `PharmacyBlogPage` | 667 | 블로그 |
| `/store/my-products` | `StoreProductsManagerPage` | — | 내 매장 상품 |
| `/store/channels` | `StoreChannelsPage` | 1064 | 채널 배포 |
| `/store/commerce/tablet-displays` | `StoreTabletDisplaysPage` | 559 | 태블릿 |

### K-Cosmetics (`/store` — StoreOwnerRoute + StoreDashboardLayout)

| 경로 | 컴포넌트 | 줄수 | 영역 |
|------|---------|------|------|
| `/store` | `StoreCockpitPage` (@o4o/store-ui-core) | — | 대시보드 (공통 컴포넌트) |
| `/store/library/contents` | `StoreLibraryContentsPage` | 263 | 내 자료함 콘텐츠 |
| `/store/library/resources` | `StoreLibraryResourcesPage` | 251 | 내 자료함 리소스 |
| `/store/library/production-materials` | `StoreProductionMaterialsPage` | 252 | 제작 자료 |
| `/store/marketing/signage/playlist` | `StoreSignagePage` | **401** | 사이니지 (playlist CRUD) |
| `/store/marketing/pop` | `StorePopPage` | 482 | POP |
| `/store/marketing/qr` | `StoreQrPage` | 524 | QR |
| `/store/content/blog` | `StoreBlogManagePage` | 684 | 블로그 |
| `/store/my-products` | `StoreProductsManagerPage` | — | 내 매장 상품 |
| `/store/channels` | `StoreChannelsPage` | 1126 | 채널 배포 |
| `/store/commerce/tablet-displays` | `StoreTabletDisplaysPage` | 536 | 태블릿 |
| `/store/interest-requests` | `InterestRequestsPage` | 188 | 태블릿 문의 관리 |

---

## 2. 영역별 Cross-Service Matrix

| 영역 | KPA | GlycoPharm | K-Cosmetics | 판정 |
|------|-----|-----------|------------|------|
| **대시보드** | FULL (StoreHomePage 347줄) | FUNCTIONAL (StoreOverviewPage 280줄 + AI 코파일럿) | FULL (StoreCockpitPage @o4o/store-ui-core 공통) | ✅ |
| **내 자료함 콘텐츠** | FULL (StoreLibraryContentsPage 236줄) | FUNCTIONAL (246줄, assetSnapshotApi.list) | FULL (263줄, assetSnapshotApi + StartProductionModal) | ✅ |
| **제작 자료** | FULL (StoreProductionMaterialsPage 632줄 + AI editor) | FUNCTIONAL (243줄 + AI editor) | FUNCTIONAL (252줄 + AI editor) | ✅ |
| **POP** | FULL (StorePopPage 876줄 + AI + template + PDF export) | FUNCTIONAL (531줄, PDF 있음) | FUNCTIONAL (482줄, AI 있음) | ✅ |
| **QR** | FULL (StoreQRPage 1334줄 + AI + analytics) | FUNCTIONAL (562줄) | FUNCTIONAL (524줄) | ✅ |
| **블로그** | FULL | FUNCTIONAL (PharmacyBlogPage 667줄) | FUNCTIONAL (StoreBlogManagePage 684줄) | ✅ |
| **사이니지** | FULL (2356줄, 3탭 + schedule) | FUNCTIONAL (1476줄, 3탭 + schedule, KPA 패턴 직접 이식) | PARTIAL (401줄, playlist CRUD만, schedule 미구현) | ⚠️ |
| **상품 설명** | FULL (StoreProductDescriptionsPage 742줄) | MISSING | MISSING | ⚠️ |
| **내 매장 상품** | FULL (StoreProductsManagerPage) | FUNCTIONAL | FUNCTIONAL | ✅ |
| **채널 배포** | FULL (StoreChannelsPage 2014줄) | FUNCTIONAL (1064줄) | FUNCTIONAL (1126줄) | ✅ |
| **태블릿/디스플레이** | FULL (StoreTabletDisplaysPage 843줄) | FUNCTIONAL (559줄) | FUNCTIONAL (536줄 + InterestRequestsPage) | ✅ |

---

## 3. Store Hub → 내 매장 연결 흐름 분석

### KPA (완전 구현)
```
/store-hub/content → HubContentLibraryPage
  → assetSnapshotApi.copy({ sourceService:'kpa', assetType:'cms' })
  → /store/library/contents (StoreLibraryContentsPage)
  → /store/content/:snapshotId/edit (StoreContentEditPage)
  → /store/channels (channel mapping + publish)

/store-hub/signage → HubSignageLibraryPage
  → assetSnapshotApi.copy({ sourceService:'kpa', assetType:'signage' })
  → /store/marketing/signage/playlist (StoreSignagePage → playlist 추가)
  → /public/signage?playlist=:id (공개 렌더링)
```

### GlycoPharm (기능적 완성)
```
/store-hub/content → HubContentListPage
  → assetSnapshotApi.copy({ assetType:'cms' })
  → /store/library/contents (StoreLibraryContentsPage)
  → POP/QR 제작 흐름으로 연결

/store-hub/signage → HubSignageLibraryPage
  → assetSnapshotApi.copy({ assetType:'signage' })
  → /store/marketing/signage/playlist (StoreSignageMainPage)
  → storePlaylist CRUD + schedule
  → 공개 렌더링
```

### K-Cosmetics (기능적 완성)
```
/store-hub/content → HubContentPage
  → assetSnapshotApi.copy({ assetType:'cms' })
  → /store/library/contents (StoreLibraryContentsPage + StartProductionModal)
  → POP/QR 제작 대화상자 → AI content → ProductionMaterialEditorPage

/store-hub/signage → HubSignagePage
  → assetSnapshotApi.copy({ assetType:'signage' })
  → /store/marketing/signage/playlist (StoreSignagePage)
  → storePlaylist CRUD (schedule 미구현)
```

**흐름 단절 없음.** 3개 서비스 모두 Hub → 내 매장 실행 흐름 연결됨.

---

## 4. API/Client 정합성

| API | KPA | GlycoPharm | K-Cosmetics | 비고 |
|-----|-----|-----------|------------|------|
| `assetSnapshotApi.copy` | ✅ `{ sourceService:'kpa', assetType }` | ✅ `{ assetType }` | ✅ `{ assetType }` | canonical 경로 |
| `assetSnapshotApi.list` | ✅ store library | ✅ store library | ✅ store library | |
| `storeAssetControlApi` | ✅ | ✅ | ✅ | publish/channel |
| `storePlaylistApi` | ✅ | ✅ | ✅ | signage playlist |
| `signageScheduleApi` | ✅ | ✅ | ❌ 미구현 | K-Cos schedule PARTIAL |
| `storeLibraryApi` | ✅ unified feed | — | — | |
| `dashboardCopyApi` | — | — | ⚠️ `pages/library/ContentLibraryPage.tsx` (legacy public) | store 실행 영역 아님 |

**`dashboardCopyApi` 잔존:** K-Cosmetics `pages/library/ContentLibraryPage.tsx`에만 남아 있음. 이 파일은 Store Hub 이전의 legacy public library 페이지 (`/library/content` 라우트, store 실행 영역 아님). Store 실행 페이지에서는 완전 제거됨.

---

## 5. 사용자-facing 문구 drift

| 서비스 | 영역 | 현재 문구 | 기대 문구 | 판정 |
|--------|------|---------|---------|------|
| GlycoPharm | HubB2BCatalogPage | `"내 매장에 추가"`, `"내 매장에서 제외"` | `"내 약국에 추가"` | ⚠️ drift |
| GlycoPharm | HubContentListPage | `"내 약국에 복사"` ✅ | `"내 약국에 복사"` | ✅ |
| GlycoPharm | HubSignageLibraryPage | `"내 약국에 추가"` ✅ | `"내 약국에 추가"` | ✅ |
| K-Cosmetics | 전 영역 | `"내 매장"` ✅ | `"내 매장"` | ✅ |
| K-Cosmetics | HubContentPage | `"내 매장에 복사"` ✅ | `"내 매장에 복사"` | ✅ |

**GlycoPharm B2B Hub drift 판단:**  
`HubB2BCatalogPage`는 B2B 상품 카탈로그로 "상품을 약국에 추가"하는 개념이므로 "내 약국에 추가"가 맞습니다. "내 매장"은 generic store 개념으로 GlycoPharm 맥락에서 부정확합니다.

**후속 WO 후보:** `WO-O4O-GLYCOPHARM-HUB-B2B-PHARMACY-LABEL-RESTORE-V1` — 우선순위: 낮음 (사용자 혼란보다는 문구 일관성 차원)

---

## 6. 주요 drift 상세

### ① K-Cosmetics Signage 경량화 (PARTIAL)

| 항목 | KPA | K-Cosmetics |
|------|-----|------------|
| 줄수 | 2356 | 401 |
| playlist CRUD | ✅ | ✅ |
| schedule 탭 | ✅ (full) | ❌ 미구현 |
| KPI 대시보드 | ✅ | ❌ |
| 강제 콘텐츠 경고 | ✅ | ❌ |

**판단:** K-Cosmetics는 Signage를 기본 playlist 관리 수준으로 운영. schedule 기능은 별도 WO로 이식 가능하나 현재 운영 지장은 없음.

### ② 상품 설명 기능 (MISSING)

| 서비스 | 상태 |
|--------|------|
| KPA | FULL — `StoreProductDescriptionsPage` (742줄) + AI template |
| GlycoPharm | MISSING — route 없음 |
| K-Cosmetics | MISSING — route 없음 |

**판단:** KPA 전용 기능으로 다른 서비스에서 의도적으로 구현하지 않은 것으로 보임. `INTENTIONAL_DIFF` 가능성 높음.

### ③ Legacy `dashboardCopyApi` (K-Cosmetics)

`services/web-k-cosmetics/src/pages/library/ContentLibraryPage.tsx` — `/library/content` route의 legacy public library 페이지에 잔존. Store Hub canonical이 `HubContentPage`로 교체된 후에도 이 파일만 남아 있음. Store 실행 영역 영향 없음.

**후속 WO 후보:** `WO-O4O-KCOSMETICS-LIBRARY-CONTENT-PAGE-DEPRECATION-V1` — 우선순위: 낮음

---

## 7. 최근 Store Hub 작업으로 인한 회귀

| 항목 | 결과 |
|------|------|
| Store Hub content copy → 내 자료함 이동 | ✅ 3개 서비스 모두 정상 |
| Store Hub signage copy → 내 매장 사이니지 | ✅ 3개 서비스 모두 storePlaylist 연결 |
| Store Hub POP/QR/Blog copy → 내 자료함 | ✅ 연결됨 |
| `assetSnapshotApi.copy()` 결과 내 매장 조회 | ✅ `/store/library/contents` 조회 가능 |
| `dashboardCopyApi` store 실행 영역 잔존 | ✅ K-Cosmetics store 실행 페이지에서 제거됨 |

---

## 8. TypeScript / Smoke

| 서비스 | 결과 |
|--------|------|
| web-k-cosmetics | ✅ TypeScript 오류 없음 (이전 검증) |
| web-glycopharm | ✅ 이전 검증 통과 |
| web-kpa-society | ✅ 변경 파일 없음 |
| 브라우저 smoke | ⚠️ PARTIAL — K-Cosmetics admin으로 store-hub/content, signage 확인. store 실행 영역(/store)은 store_owner 계정 필요 — BLOCKED |

---

## 9. 남은 drift 목록

| 항목 | 서비스 | 유형 | 우선순위 |
|------|--------|------|---------|
| GlycoPharm B2B Hub `"내 매장"` 문구 | GlycoPharm | 문구 drift | 낮음 |
| K-Cosmetics Signage schedule 미구현 | K-Cosmetics | PARTIAL | 낮음 |
| 상품 설명 기능 | GlycoPharm, K-Cosmetics | MISSING / INTENTIONAL_DIFF | 확인 필요 |
| K-Cosmetics `pages/library/ContentLibraryPage.tsx` legacy `dashboardCopyApi` | K-Cosmetics | legacy 잔존 | 낮음 |

---

## 10. 후속 WO 후보

| WO | 범위 | 우선순위 |
|----|------|---------|
| `WO-O4O-GLYCOPHARM-HUB-B2B-PHARMACY-LABEL-RESTORE-V1` | B2B Hub 문구 "내 매장" → "내 약국" | 낮음 |
| `WO-O4O-KCOSMETICS-SIGNAGE-SCHEDULE-ALIGNMENT-V1` | K-Cos signage schedule 탭 구현 | 낮음 |
| `WO-O4O-KCOSMETICS-LIBRARY-CONTENT-PAGE-DEPRECATION-V1` | K-Cos legacy ContentLibraryPage dashboardCopyApi 제거 | 낮음 |
| 상품 설명 기능 drift IR | INTENTIONAL_DIFF 여부 확인 | 낮음 |

---

## 11. 결론

Store Hub → 내 매장 실행 흐름은 **3개 서비스에서 기능적으로 완성**됨.  
KPA canonical 대비 GlycoPharm/K-Cosmetics는 Signage depth, 상품 설명 기능 등에서 경량화된 구조이나 운영상 치명적 문제는 없음.

**PARTIAL 판정 근거:** 핵심 흐름은 연결되어 있으나 Signage schedule(K-Cosmetics), 상품 설명(GlycoPharm/K-Cosmetics) 등 일부 영역이 PARTIAL/MISSING 상태.

*검증 수행: Claude Code (2026-06-01)*
