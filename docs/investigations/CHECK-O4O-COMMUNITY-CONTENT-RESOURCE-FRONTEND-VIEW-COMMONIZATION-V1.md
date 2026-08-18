# CHECK-O4O-COMMUNITY-CONTENT-RESOURCE-FRONTEND-VIEW-COMMONIZATION-V1

- **WO**: `WO-O4O-COMMUNITY-CONTENT-RESOURCE-FRONTEND-VIEW-COMMONIZATION-V1`
- **축**: 커뮤니티 **콘텐츠·자료실 frontend / View** 공통화 (backend 축 아님)
- **대상 서비스**: KPA-Society · K-Cosmetics · GlycoPharm · **PharmacyHub** · Neture
- **작성일**: 2026-08-18
- **착수 commit**: `09b0e3b14` (census 기준) / 작업 시점 HEAD `910431dcc`
- **판정**: PASS — VIEW_DUPLICATED 4 → 0

> 본 WO 완료는 **콘텐츠·자료실 frontend/View 축 완료**일 뿐, 커뮤니티 전체 공통화 완료를 의미하지 않는다.

---

## 1. 판정명 정의 (§3 — 6종 고정, 임의 판정명 금지)

| 판정 | 의미 |
|------|------|
| `FULLY_COMMON` | 공통 View/Template 이 화면을 소유하고, 서비스는 config·adapter 만 제공 |
| `CORE_ONLY` | 공통 core/primitive(@o4o/ui BaseTable·Pagination, 공유 상수 등)는 쓰되 View 컨테이너는 서비스 고유 |
| `VIEW_DUPLICATED` | 다른 서비스와 실질적으로 동일한 View 코드가 복제되어 있음 |
| `SERVICE_SPECIFIC` | 업무·정책·데이터 모델이 실제로 달라 서비스 고유가 정당 |
| `NOT_IMPLEMENTED` | 해당 서비스에 route·화면·API client 가 존재하지 않음 |
| `OUT_OF_SCOPE` | 다른 업무축(운영자 CMS·매장 HUB·사이니지·store-owner 실행자산) |

## 2. 모집단 산출 방법

- §3 필수 최소 항목 **21개 feature × 5개 서비스 = 105 cell**
- 추가로 census 중 발견된 **인접 화면축 8건**을 `OUT_OF_SCOPE` 로 명시 기록
- **전체 모집단 113 / 미조사 0**

```
전체 모집단: 113
FULLY_COMMON: 35
CORE_ONLY: 16
VIEW_DUPLICATED: 0   (착수 시점 4 → 0)
SERVICE_SPECIFIC: 20
NOT_IMPLEMENTED: 34
OUT_OF_SCOPE: 8
미조사: 0
```

---

## 3. 서비스별 census

공통 컬럼: `feature / route / page·component / API client / backend source / shared UI / 판정 / 중복 상대 / 근거`

### 3-1. K-Cosmetics

route prefix: `/content`, `/resources` · API base `/api/v1` · backend `contents` (`sub_type='content'`)

| # | feature | route | page·component | API client | shared UI | 판정 | 중복 상대 | 근거 |
|---|---------|-------|----------------|-----------|-----------|------|-----------|------|
| 1 | 콘텐츠 목록 | `/content` | `pages/contents/ContentListPage.tsx` (63L) | `api/content.ts` → `/cosmetics/contents` | `CommunityContentListTemplate` | FULLY_COMMON | (해소) GP | 본 WO 로 공통 Template 이관. 이전 146L 은 GP 와 주석 1줄 차이 |
| 2 | 자료실 목록 | `/resources` | `pages/resources/ResourcesPage.tsx` (54L) | `api/content.ts` | `ResourcesHubTemplate` | FULLY_COMMON | — | 선행 WO 에서 이미 공통 |
| 3 | 콘텐츠 상세 | `/content/:id` | `pages/contents/ContentDetailPage.tsx` (89L) | `contentApi.detail/trackView` | `CommunityContentDetailTemplate` + `CommunityContentDetailView` | FULLY_COMMON | (해소) GP | 조회·조회수·상태 전이까지 공통 이관 |
| 4 | 자료 상세 | — | — | — | — | NOT_IMPLEMENTED | — | `resources/:id` route 없음. 목록에서 링크/다운로드로 종결 |
| 5 | 검색 | `/content`,`/resources` | (Template 내장) | 서버 `search` | 공통 Template | FULLY_COMMON | — | 300ms 디바운스 + page 1 리셋 공통화 |
| 6 | 필터 | — | — | — | — | NOT_IMPLEMENTED | — | 콘텐츠 목록에 필터 UI 없음 |
| 7 | 정렬 | `/resources` | (Template 내장) | — | `ResourcesHubTemplate` sortable 컬럼 | FULLY_COMMON | — | 콘텐츠는 서버 `sort:'latest'` 고정(UI 없음) |
| 8 | category/type/status 표시 | 목록·상세 | — | — | `standardContentBadges` | FULLY_COMMON | — | published 아닐 때만 배지 — 기존 동작 보존 |
| 9 | 카드/행 View | `/content` | — | — | `CommunityContentListView` | FULLY_COMMON | — | 카드 마크업 공통 |
| 10 | pagination/load-more | 목록 | — | — | Template 더 보기 / `HubPagination` | FULLY_COMMON | — | page 누적 로직 공통 |
| 11 | loading | 목록·상세 | — | — | `CommunityContentLoadingState` | FULLY_COMMON | — | — |
| 12 | error | 목록·상세 | — | — | `CommunityContentErrorState` | FULLY_COMMON | — | **조회 실패를 빈 목록으로 삼키던 이전 구현 제거** → throw → 오류+재시도 |
| 13 | empty state | 목록 | — | — | `CommunityContentEmptyState` | FULLY_COMMON | — | 검색 중/비검색 문구 분기 공통 |
| 14 | recommendation 표시 | — | — | — | — | NOT_IMPLEMENTED | — | documents-only — 추천 미적용 |
| 15 | 다운로드/첨부 | `/resources` | — | — | `ResourcesHubTemplate` | FULLY_COMMON | — | download → 파일 링크 복사 |
| 16 | appreciation 연결 | — | — | — | — | NOT_IMPLEMENTED | — | `AppreciationPanel` 미사용 |
| 17 | 작성자/출처 표시 | 목록·상세 | — | — | 공통 View | FULLY_COMMON | — | `author_name` 정규화는 standard adapter |
| 18 | detail navigation | `/content/:id` | — | — | `renderLink` 주입 | FULLY_COMMON | — | router 는 wrapper 가 주입(공통 View 는 router 비결합) |
| 19 | MyPage/커뮤니티 홈 진입 | `/`, mobile nav | `HomePage.tsx`, `MobileBottomNav.tsx` | — | — | SERVICE_SPECIFIC | — | 서비스 IA·문구 축 |
| 20 | route | `/content*`,`/resources` | `App.tsx` | — | — | SERVICE_SPECIFIC | — | 서비스별 라우트 트리 |
| 21 | API client | — | `api/content.ts` | `/cosmetics/contents` | — | SERVICE_SPECIFIC | — | adapter 는 설계상 서비스 소유 |

합계: FULLY_COMMON 14 / NOT_IMPLEMENTED 4 / SERVICE_SPECIFIC 3.

### 3-2. GlycoPharm

route prefix 동일 · API `/glycopharm/contents`

21개 cell 이 **K-Cosmetics 와 동일 판정 분포**(FULLY_COMMON 14 / NOT_IMPLEMENTED 4 / SERVICE_SPECIFIC 3). 차이점만 기록한다.

| # | 차이점 | 내용 |
|---|--------|------|
| 1·3 | `pages/contents/ContentListPage.tsx` (63L) / `ContentDetailPage.tsx` (89L) | 착수 시점 KCos 와 **주석 1~2줄 외 완전 동일** → `VIEW_DUPLICATED` 였고 본 WO 로 해소 |
| 21 | `api/content.ts` → `/glycopharm/contents` | API URL 계약이 서비스별로 다름 — 회귀 테스트로 고정 |
| — | `/hub/content/:id` `HubContentDetailPage` | 매장 HUB 축 → `OUT_OF_SCOPE` (§4 표) |

### 3-3. KPA-Society

route `/content`, `/content/documents`, `/content/resources`, `/content/:id`, `/resources` · API `/contents` (base `/api/v1/kpa`)

| # | feature | page·component | shared UI | 판정 | 근거 |
|---|---------|----------------|-----------|------|------|
| 1 | 콘텐츠 목록 | `ContentListPage.tsx`(761L) · `ContentDocumentsPage.tsx`(569L) | `BaseTable`+`BaseDetailDrawer`+`RowActionMenu`(@o4o/ui) | CORE_ONLY | 일괄 가져가기·`isContentImportRestricted`·설문 섹션이 KPA 고유. 공통 table core 위에 구성 |
| 2 | 자료실 목록 | `ResourcesHubPage.tsx`(189L) | `ResourcesHubTemplate` | FULLY_COMMON | — |
| 3 | 콘텐츠 상세 | `ContentDetailPage.tsx`(244L) | `CommunityContentDetailView`+`AppreciationPanel` | CORE_ONLY | 표시부 공통. **detail visibility/recommendation 정책은 backend 그대로 유지**(§8) → 컨테이너 미이관 |
| 4 | 자료 상세 | — | — | NOT_IMPLEMENTED | `/resources/:id` 조회 route 없음(`new`/`:id/edit` 만) |
| 5 | 검색 | 공통 검색 입력 + 서버 `search` | `CommunityContentSearchBar` | FULLY_COMMON | 허브 → documents `?search=` 인계 유지 |
| 6 | 필터 | — | — | NOT_IMPLEMENTED | subType 은 route 분기이지 필터 UI 아님 |
| 7 | 정렬 | BaseTable sortable | @o4o/ui | CORE_ONLY | — |
| 8 | category/type/status | 자체 배지 매핑 | BaseTable 컬럼 | CORE_ONLY | — |
| 9 | 카드/행 View | desktop table + mobile 카드 | BaseTable | CORE_ONLY | 모바일 카드는 KPA 자체 |
| 10 | pagination/load-more | 허브 6건 요약 + 전체 보기 | `HubPagination`(자료실) | CORE_ONLY | — |
| 11 | loading | 자체 | — | SERVICE_SPECIFIC | — |
| 12 | error | 자료실 공통 / 콘텐츠 자체 | 부분 | CORE_ONLY | — |
| 13 | empty state | BaseTable emptyState | @o4o/ui | CORE_ONLY | — |
| 14 | recommendation 표시 | `AppreciationPanel` | 공통 | FULLY_COMMON | — |
| 15 | 다운로드/첨부 | `ResourcesHubTemplate` | 공통 | FULLY_COMMON | — |
| 16 | appreciation 연결 | `AppreciationPanel` | 공통 | FULLY_COMMON | — |
| 17 | 작성자/출처 | 공통 상세 View + table 컬럼 | 부분 | CORE_ONLY | — |
| 18 | detail navigation | route + Drawer 병행 | — | SERVICE_SPECIFIC | Drawer 미리보기는 KPA canonical table 패턴 |
| 19 | MyPage/커뮤니티 홈 진입 | `CommunityHomePage`·`MobileBottomNav`·`dashboard/MyContentPage` | — | SERVICE_SPECIFIC | — |
| 20 | route | `App.tsx` | — | SERVICE_SPECIFIC | 서브타입 라우트 트리 |
| 21 | API client | `api/content.ts` | — | SERVICE_SPECIFIC | base `/api/v1/kpa` |

합계: FULLY_COMMON 5 / CORE_ONLY 9 / SERVICE_SPECIFIC 5 / NOT_IMPLEMENTED 2.

### 3-4. Neture (§5 — `cms_contents` 사용을 이유로 자동 제외하지 않음)

route + 소비자 기준 분리:

- **사용자 대면 커뮤니티**: `/content` `ContentLibraryPage`(202L, `ContentHubTemplate`) · `/resources` `NetureResourcesPage`(86L, `ResourcesHubTemplate`) · `/partner/contents` `pages/content/ContentListPage`(226L) · `/partner/contents/:id` `ContentDetailPage`(291L) · `/workspace/my-content` `MyContentPage`(690L)
- **운영자 CMS**: `/operator/guide-contents` → OUT_OF_SCOPE
- **파트너 관리 mock**: `/account/partner/contents` `PartnerContentsPage`(247L, API client 0건) → OUT_OF_SCOPE

| # | feature | 판정 | 근거 |
|---|---------|------|------|
| 1 | 콘텐츠 목록 | CORE_ONLY | `/content` 는 `ContentHubTemplate`(공통)이나 `/partner/contents` 는 `@o4o/ui` primitive 위 자체 View — 약한 쪽으로 판정 |
| 2 | 자료실 목록 | FULLY_COMMON | `ResourcesHubTemplate` + `cmsApi` adapter |
| 3 | 콘텐츠 상세 | CORE_ONLY | `ContentMetaBar` 공통, 컨테이너·가져오기·추천은 Neture 고유 |
| 4 | 자료 상세 | NOT_IMPLEMENTED | `/resources/:id` 없음 |
| 5 | 검색 | CORE_ONLY | Template 2곳 내장 / `/partner/contents` 는 자체 |
| 6 | 필터 | NOT_IMPLEMENTED | 별도 필터 UI 없음(정렬 토글만 존재) |
| 7 | 정렬 | CORE_ONLY | `ContentSortButtons`(@o4o/ui) |
| 8 | category/type/status | CORE_ONLY | `@o4o/types/content` 공유 상수 + 자체 배지 |
| 9 | 카드/행 View | SERVICE_SPECIFIC | "이미 사용 중" 등 자산 축 표시 |
| 10 | pagination/load-more | CORE_ONLY | `ContentPagination` / `HubPagination` |
| 11 | loading | SERVICE_SPECIFIC | 자체 |
| 12 | error | SERVICE_SPECIFIC | 자체 error state (삼킴 아님) |
| 13 | empty state | SERVICE_SPECIFIC | 자체 |
| 14 | recommendation 표시 | SERVICE_SPECIFIC | 추천 **액션**(가져오기와 연동) — 타 서비스에 대응 기능 없음 |
| 15 | 다운로드/첨부 | FULLY_COMMON | `ResourcesHubTemplate` |
| 16 | appreciation 연결 | NOT_IMPLEMENTED | `AppreciationPanel` 미사용 |
| 17 | 작성자/출처 표시 | CORE_ONLY | `CONTENT_SOURCE_LABELS/COLORS` 공유 상수 |
| 18 | detail navigation | SERVICE_SPECIFIC | 상세 → 자산 복사로 이어지는 고유 동선 |
| 19 | MyPage/커뮤니티 홈 진입 | SERVICE_SPECIFIC | `CommunityPage`·`/workspace/my-content` |
| 20 | route | SERVICE_SPECIFIC | `/content`·`/resources`·`/partner/contents` 3트리 |
| 21 | API client | SERVICE_SPECIFIC | `cmsApi` → `/neture/content`, `contentAssetApi` |

합계: FULLY_COMMON 2 / CORE_ONLY 7 / SERVICE_SPECIFIC 9 / NOT_IMPLEMENTED 3.

### 3-5. PharmacyHub (§4·§13 — 선제적 SERVICE_SPECIFIC 처리 금지)

**업무 기준 비교 결과**: "찾는다 → 목록을 본다 → 상세를 본다 → 매장에서 활용한다" 중 **커뮤니티 콘텐츠·자료실 축은 화면 자체가 없다.**

근거(코드):

- `services/web-pharmacy-hub/src/App.tsx` 에 커뮤니티 `/content` · `/resources` route **없음**
- `content` / `library` / `library/resources` 는 모두 **`/store-owner` 하위** (App.tsx 292–294)
- 커뮤니티 콘텐츠 API client 파일 **없음** (`api/content.ts` 부재)
- `/resources` 링크가 전 소스에서 **0건** (KPA·KCos·GP·Neture 는 홈/모바일 nav 에 존재)

→ 21개 feature 전부 **`NOT_IMPLEMENTED`**.

§13 에 따라 **없는 기능을 억지로 구현하지 않았다.** 동시에 "데이터 모델이 다르다"는 이유로 제외한 것이 아니라 **route·화면·API client 부재**가 판정 근거다.

구현되어 있는 `/store-owner/content`(`ContentPage` 291L) · `/store-owner/library`(`LibraryPage` 100L, `StoreProductionMaterialsView` @ `@o4o/store-ui-core`) · `/store-owner/library/resources`(`LibraryResourcesPage` 383L, `store_execution_assets`) 는 **매장 실행자산 축**으로 사용자 업무가 다르므로 `OUT_OF_SCOPE`(§4 표 7번).

---

## 4. OUT_OF_SCOPE 인접 화면축 (8건)

| # | 축 | 화면 | 판정 근거 |
|---|----|------|-----------|
| 1 | 매장 HUB — KPA | `/store-hub/content` `HubContentLibraryPage` | 매장 실행자산 소비축 |
| 2 | 매장 HUB — K-Cosmetics | `/store-hub/content` `HubContentPage` | 동일 |
| 3 | 매장 HUB — GlycoPharm | `/store-hub/content` `HubContentListPage`, `/hub/content/:id` | 동일 |
| 4 | 운영자 콘텐츠 콘솔 (KPA·KCos·GP) | `OperatorContentPage`·`OperatorResourcesPage`·`OperatorGuideContentsPage` | 운영자 CMS 축(§5) |
| 5 | 운영자 콘텐츠 — Neture | `/operator/guide-contents` | 동일 |
| 6 | 파트너 콘텐츠 mock — Neture | `/account/partner/contents` `PartnerContentsPage`(247L) | **API client·fetch 0건 — 정적 mock**. 공통화 대상 아님, dead flow 후보로 별도 보고 |
| 7 | store-owner 실행자산 — PharmacyHub | `/store-owner/content`·`/library`·`/library/resources` | 매장 실행자산 축(§3-5) |
| 8 | 사이니지 콘텐츠 (KPA·KCos·GP) | `signage/content`·`signage/library`·`forced-content` | 사이니지 축 |

---

## 5. 공통화 산출물 (§6 — 신규 shared View)

`packages/shared-space-ui/src/community/` 4파일 신규:

| 파일 | 역할 |
|------|------|
| `CommunityContentStates.tsx` | `CommunityContentLoadingState` / `CommunityContentErrorState`(재시도) / `CommunityContentEmptyState` / `formatCommunityContentDate` |
| `CommunityContentListView.tsx` (~310L) | 표시 전용 `CommunityContentListView` + adapter 구동 `CommunityContentListTemplate`(검색 디바운스·page 누적·더 보기·Load-Error 계약) |
| `CommunityContentDetailTemplate.tsx` | 조회·조회수·loading/error/not-found·목록으로 배치 → `CommunityContentDetailView` 위임 |
| `standardContentAdapters.ts` | 표준 레코드(`id·title·summary·author_name·created_at·view_count·status·body·tags`) → 목록/상세 표시 모델 + 상태 배지 |

**공통 View 순수성 (§6 금지 항목) — 회귀 테스트로 고정**:
`axios` · `fetch(` · `react-router` · `serviceKey` · `service === '...'` · `switch (serviceType)` **전부 0건** (주석 제거 후 검사).
router 결합은 `renderLink` 주입, 조회는 `config.fetchItems` / `config.fetchContent` 주입.

**구조**: `service API adapter → normalize(standardContentAdapters) → 공통 View` (§4 권장 구조 그대로).

### 명명 편차 기록

§6 예시 명칭(`ContentResourceListView` 등) 대신 저장소의 기존 커뮤니티 공통 View 명명(`CommunityContentDetailView`·`CommunityContentSearchBar`)과 일관되도록 **`CommunityContent*`** 접두사를 사용했다. §11(기존 자산 우선 재사용) 기준의 의도적 선택이다.

---

## 6. 중복 제거 지표 (§12)

| 항목 | 전 | 후 |
|------|----|----|
| `VIEW_DUPLICATED` cell | 4 (KCos·GP × 목록·상세) | **0** |
| KCos `ContentListPage.tsx` | 146L | 63L |
| GP `ContentListPage.tsx` | 146L | 63L |
| KCos `ContentDetailPage.tsx` | 130L | 89L |
| GP `ContentDetailPage.tsx` | 130L | 89L |
| wrapper 합계 | 552L | 304L (**-248L**) |
| 신규 shared 파일 | 0 | 4 |
| 삭제한 dead file | — | 0 (기능 삭제 없음 — 이관만) |
| 남은 wrapper 수 | 4 | 4 (config·adapter 전용으로 축소) |

부수 효과: KCos·GP 목록의 **조회 실패 삼킴**(catch → 빈 배열) 제거 → O4O Load-Error 계약 충족(실패 = 오류상태 + 재시도, 정상 0건만 empty).

---

## 7. 테스트 (§14)

`apps/api-server/src/__tests__/community-content-resource-frontend-view-commonization.spec.ts` — **37 tests, 37 passed**

| suite | 고정 대상 |
|-------|-----------|
| `CommunityContentListView — 상태` | loading / error / empty / 검색중 empty / 목록 / 배지 |
| `— 검색 / 더보기 / config` | 검색 표시·미표시, 더 보기 누적 순서, **오류 시 더 보기 미표시**, title·description·accent·headerActionSlot, 선택 메타, 추천/첨부 토글, `renderLink` router 주입 |
| `standardContentAdapters` | 목록·상세 정규화, published 배지 정책, 깨진 날짜 → `-` |
| `공통 View 순수성` | 금지 토큰 0건 + index export |
| `KCos / GP wrapper` | Template 채택, 중복 JSX 토큰 제거, throw-not-swallow, **API URL 계약**(`/cosmetics/contents` · `/glycopharm/contents`) |
| `KPA` | 서비스 고유 View 유지(BaseTable·AppreciationPanel) |
| `자료실 축` | 3서비스 `ResourcesHubTemplate` + serviceKey 계약 유지 |
| `Pharmacy-Hub` | 커뮤니티 route 부재 · store-owner 축 사실 고정 |

## 8. 정적 검증 (§15)

| 대상 | 결과 |
|------|------|
| `packages/shared-space-ui` typecheck | PASS |
| `services/web-kpa-society` typecheck | PASS |
| `services/web-k-cosmetics` typecheck / vite build | PASS / PASS |
| `services/web-glycopharm` typecheck / vite build | PASS / PASS |
| `services/web-pharmacy-hub` typecheck | PASS |
| `services/web-neture` typecheck | PASS |
| migration | **0건** |
| backend response contract 변경 | **없음** |
| dependency / lockfile 변경 | **없음** |

---

## 8-A. Production browser smoke (§16)

- 배포: `Deploy Web Services (Cloud Run)` run 32114059127 — 6개 web 서비스 전부 success (commit `38cc33ff2`)
- 대상: `k-cosmetics-web` / `glycopharm-web` · desktop 1440×900 + mobile 390×844

| 화면 | 만족 | console error | HTTP≥400 | 가로 overflow |
|------|------|---------------|----------|----------------|
| KCos `/content` (desktop·mobile) | 렌더 OK — empty state | 0 | 0 | 0px |
| KCos `/resources` (desktop·mobile) | 렌더 OK | 0 | 0 | 0px |
| GP `/content` (desktop·mobile) | 렌더 OK — empty state | 0 | 0 | 0px |
| GP `/resources` (desktop·mobile) | 렌더 OK | 0 | 0 | 0px |
| KCos·GP `/content/{존재하지-않는-id}` (desktop·mobile) | 오류 상태 + `다시 시도` + `← 목록으로` | 1 (의도된 404 로그) | 조회 대상 404 외 0 | 0px |

- 흰 화면 0 / JS exception 0 / 신규 404·500 0 / cross-service 데이터 혼입 0 / mobile 가로 overflow 0
- **empty state 가 오류 삼킴이 아님을 확인**: `GET /api/v1/cosmetics/contents` · `GET /api/v1/glycopharm/contents` → `{"success":true,...,"total":0}` (200 정상 0건)
- **한계**: 두 서비스 프로덕션에 콘텐츠가 0건이라 **카드 목록·더 보기·상세 정상경로는 브라우저로 재현하지 못했다.** 해당 경로는 37건 회귀 테스트(서버 렌더링)로만 고정돼 있다.

---

## 9. 잔존 위험 · 후속 후보 (수정하지 않음, 보고만)

1. **K-Cosmetics `ResourcesPage` adapter** — 헤더 주석은 `sub_type=resource` 를 명시하나 실제 호출은 `/cosmetics/contents` 에 해당 파라미터를 넘기지 않는다. 자료실 목록 모집단 정의 문제로 별도 WO 후보.
2. **Neture `/account/partner/contents`** — 정적 mock, API client 0건. dead flow 후보.
3. **KPA 콘텐츠 상세 컨테이너** — visibility/recommendation 정책 때문에 `CommunityContentDetailTemplate` 미이관. 정책을 공통 View 가 결정하면 안 되므로(§8) 현행 유지가 정답이며, 이관하려면 정책 주입 설계가 선행돼야 한다.
4. **필터·정렬 UI 부재** — KCos/GP/Neture 콘텐츠 목록에 필터가 없고 정렬은 서버 고정. 기능 추가는 본 WO 범위 밖(§13).

## 10. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건(위 9-1, 9-2).
