# CHECK — KPA 운영자 잔여 목록 표준화 및 조회 실패 계약화 (통합)

> WO-O4O-KPA-OPERATOR-LOAD-ERROR-AND-REMAINING-LISTS-CONSOLIDATED-V1
> 작업일: 2026-07-27
> 상태: **구현·typecheck·build GREEN → commit `883834a32` push → CI 배포 트리거**
> 원칙: 조회 실패 ≠ 0건 / 필수 vs 보조 분리 / 한 섹션 실패가 화면 전체를 막지 않음 / 공용 DataTable·RowActionMenu·표준 에러 UI 재사용 (신규 목록 패턴 금지) / 백엔드·DB·마이그레이션 무변경 / 사업정책·집계·CRUD 계약 무변경.

대상 파일 7건 (모두 `services/web-kpa-society/src/pages/operator/`), `746 insertions / 579 deletions`. **제외 대상: `MemberManagementPage` (WO 명시 제외).**

---

## 1. AnalyticsPage 전면 정비 (item 1)

- **목록:** 최근 액션 이력 raw `<table>` → 공용 `DataTable<ActionLog>` (`ListColumnDef` 컬럼 일시/액션/상태/상세 + prev/next 페이지네이션).
- **3-tier 독립 조회 계약:**
  - `loadSummary` (summaryLoading/summaryError) — 필수 요약(기간 필터/KPI/액션 요약/일별 추이). 실패 시 **집계 영역만** 오류+재시도로 차단.
  - `loadActions` (actionsLoading/actionsError) — 액션 이력. 실패 시 **섹션 경고 + 재시도** (기존 `catch { /* silent */ }` → 빈 목록 위장 제거).
  - `loadInsight` (insightLoading/insightError) — AI 인사이트. **보조(non-blocking)** 섹션 오류 + 재시도.
- **스타일:** 전 inline style → Tailwind / O4O 토큰. 집계·action-log API 계약, 계산 로직 무변경.
- 플랫폼 클라이언트 `new ApiClient(API_BASE)` (`API_BASE=.../api/v1`), `SERVICE_KEY='kpa-society'` 유지.

## 2. CommunityManagementPage 표준화 (item 2)

- **목록:** ads / sponsors / quick-links raw `<table>` 3종 → `DataTable`.
- **행 액션:** edit/delete → `RowActionMenu` (공유 `defineActionPolicy('kpa:community', {inlineMax:2, rules:[edit, delete(danger)]})`). 추가 CTA 는 직접 노출 유지. 삭제는 정책 confirm 이 아닌 **기존 페이지 레벨 `ConfirmActionDialog`** 로 라우팅해 삭제 확인 UX 보존.
- **탭 전환:** `fetchData` 시작 시 `setAds([])/setSponsors([])/setQuickLinks([])` 로 **이전 탭 데이터/오류 잔존 제거**.
- **실패:** 오류 + 다시 시도 버튼. 탭/미디어 피커/생성·수정 모달/삭제 확인 보존. 전 inline style 제거. API/CRUD/정렬/활성 상태 계약 무변경.

## 3. OperatorStoreDetailPage 조회 계약 분리 (item 3)

- 단일 `Promise.all` → **4축 독립 loader** (`loadStore`/`loadChannels`/`loadCapabilities`/`loadProducts(page, append)`), 각 loading/error/retry 보유.
- **매장 정보 실패만** 화면 전체 차단(재시도 포함). 나머지 섹션은 **섹션 레벨 오류만** 표시.
- **역량(capabilities) 실패**: 기존 `.catch(() => ({success:false, capabilities:[]}))` (빈 목록 위장) 제거 → `capsError` 섹션 오류 표시.
- **역량 토글 실패**: 기존 console.error → `toast.error(...)` 사용자 알림.
- **목록만 DataTable**: channels → `DataTable<ChannelData>` (상태 액션 버튼 render 컬럼), products → `DataTable<StoreProduct>` + 더보기(`loadProducts(page+1, true)` append, `productPage < productTotalPages` 게이트, `PRODUCT_PAGE_SIZE=10`). 매장 정보·역량은 카드 UI 유지.
- **API 계약:** `StoreConsoleController.getStoreProducts` 가 이미 `page`/`limit` 지원(응답 `pagination:{page,limit,total,totalPages}`) 확인 후 기존 계약 내에서 더보기 구현. 백엔드 무변경.

## 4. KPA 운영자 silent-catch 전수 정리 (item 4)

분류: fully-ignored / replaced-with-empty / console-only / intentionally-ignorable.

| 파일 | 분류 | 처리 |
|------|------|------|
| RecruitmentExposureApprovalPage.load | B (replaced-with-empty) | 조회 실패를 `setItems([])`(=승인 대상 없음)로 위장하던 것을 **페이지 레벨 오류 + 재시도**로. 공용 `RecruitmentExposureConsole` 계약은 error prop 부재 → 페이지 레벨 처리로 공용 컴포넌트 변경 회피(Shared Module Change 회피). |
| signage/HqPlaylistDetailPage.fetchHqMedia | A (fully-ignored) | HQ 미디어 피커 로드 실패 → 피커 내 **오류 + 재시도** (기존 `catch { /* silent */ }` → 빈 상태 위장 제거). |
| event-offer/EventOfferManagePage.loadPending | A (fully-ignored) | 대기 승인 로드 실패 → **섹션 오류 + 재시도**. `!permissionDenied` 게이트 하위라 권한 외 실패가 이제 가시화. |
| signage/AiContentGenerationModal (템플릿 fetch) | D (defensible) | 템플릿 선택 = 선택적 보조 기능. `.catch(() => {})` 위에 **사유 주석** 부기 (실패 시 템플릿 없이 직접 입력 진행). |

그 외 운영자 페이지는 이미 `setError/setMessage/setToast` 로 실패를 표면화함(subagent 전수 확인).

---

## 5. 권한 3계층 교차 검증 (정적 — 가드 기준)

- 프론트 `/operator/*` 게이트 = `PLATFORM_ROLES` = `[kpa:admin, kpa:operator, platform:super_admin]` (`OperatorRoutes.tsx` `RoleGuard`, `role-constants.ts`).
- 백엔드 operator 라우트(`stores.routes.ts`·`analytics.routes.ts`) = 위 역할 + 교차 서비스 admin/operator(neture/glycopharm/cosmetics) + `platform:admin`, 이후 `injectServiceScope`.

| 계정 | 역할 | 프론트 | 백엔드 | 판정 |
|------|------|:---:|:---:|------|
| sohae2100 | kpa:operator / kpa:admin | PASS | PASS | 정상 KPA 운영자 접근 |
| renariver21 | platform:super_admin | PASS | PASS | 교차 서비스 플랫폼 역할로 KPA 운영자 접근 (Neture platformBypass 발견과 일관 — **개방 확대 아님, 측정값**) |
| renagang21 | store owner (해당 역할 없음) | DENY | 403 | 프론트/백엔드 모두 차단 |

- **프론트 allow / 백엔드 403 불일치 없음.** 3계층 모두 프론트·백엔드 판정 일치.
- 관찰(개방 확대 아님): 프론트는 kpa:* + platform:super_admin 만 허용(더 엄격), 백엔드는 교차 서비스 operator 도 허용. 즉 **프론트가 더 엄격** — 보안 불일치 아님(교차 서비스 operator 는 KPA 프론트 라우트에서 차단되나 API 직접 호출은 가능, 이는 공용 operator 콘솔 API 의 기존 설계이며 본 WO 변경 대상 아님).

---

## 6. 검증

- `services/web-kpa-society` `npx tsc --noEmit -p tsconfig.json` → **EXIT 0 (GREEN)**.
- `npx vite build` → **EXIT 0 (GREEN)** (chunk-size 경고만).
- `git status --short` — 의도한 7파일만 수정, 외부 편집 없음 → path-specific commit 안전.
- commit **`883834a32`** (path-specific, 7파일) → `git push origin main` (`02a694206..883834a32`) → **web-kpa-society CI 배포 트리거**.
- 실브라우저 smoke: 배포 완료 후 수행 (아래 §7).

## 7. 배포 / smoke

- CI: `Deploy Web Services (Cloud Run)` run `30233611988` (headSha `883834a32`) → `deploy-kpa-society: success` (전체 GREEN).
- 실브라우저 smoke (배포본 `kpa-society-web-3e3aws7zqa-du.a.run.app`, KPA admin/operator `sohae2100` 로그인):
  - **AnalyticsPage** (`/operator/analytics`): 요약 KPI(5/5/0) · AI 인사이트 · 액션별 요약 · 일별 추이 · 최근 액션 이력 **DataTable** 정상. 페이지네이션 `1/5`(이전 disabled) → 다음 클릭 `2/5`(이전 enabled) 정상 동작. ✓
  - **CommunityManagementPage** (`/operator/community` = "Home 편집"): Hero 광고 탭 **DataTable**(액션/미리보기/제목/기간/순서/상태) + 정상 빈 상태("등록된 광고가 없습니다") + "광고 추가" CTA. 스폰서 탭 전환 → 다른 컬럼 셋(액션/로고/이름/링크/순서/상태) + "스폰서 추가" CTA, **이전 탭 데이터 잔존 없음**. ✓
  - **OperatorStoreDetailPage** (`/operator/stores/{id}`): 매장 정보 카드 정상 로드. **채널 섹션이 실제 백엔드 500(`GET .../{id}/channels`)을 섹션 레벨 오류 "Failed to fetch store channels" + 다시 시도로 표면화 — 화면 전체 차단 없음, 빈 목록 위장 없음.** 다시 시도 클릭 시 **채널 섹션만 독립 재조회**(다른 섹션 무영향). 기능(Capabilities) 10개 카드 정상(빈 위장 없음), 매장 상품 DataTable 정상 빈 상태. → **item 3 조회 계약 분리가 실장애 상황에서 그대로 동작함을 라이브 입증.** ✓
- item 4(silent-catch 4파일)는 실패 유발이 어려운 방어 경로로, typecheck·build GREEN 으로 검증(계약 무변경, 실패 시 오류+재시도/주석 부기).

### 부수 관찰 (WO 범위 외 — 개방/변경 안 함)
- 배포본에서 `GET /api/v1/operator/stores/{id}/channels` 가 KPA operator 스코프로 **500** 반환(테스트 약국 `c92b857f…`). 프론트 계약은 정상 동작(섹션 오류+재시도)하므로 화면 회귀는 없음. 백엔드 채널 조회 실패는 별도 조사 대상(본 WO는 프론트 조회 실패 계약 범위 — 백엔드 무변경).
