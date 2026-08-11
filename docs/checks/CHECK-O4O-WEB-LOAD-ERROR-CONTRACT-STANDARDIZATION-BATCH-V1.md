# CHECK-O4O-WEB-LOAD-ERROR-CONTRACT-STANDARDIZATION-BATCH-V1

> WO: `WO-O4O-WEB-LOAD-ERROR-CONTRACT-STANDARDIZATION-BATCH-V1`
> 선행 WO: `WO-O4O-WEB-UX-STANDARDIZATION-BATCH-V1` (CLOSED/PASS) — H4 축 후속
> 작성일: 2026-08-11 · 판정: **PASS (수정 완료 · HOLD 2건 명시)**

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 작업 시작 base HEAD | `0127d1ad5` |
| 브랜치 | `main` (직접 작업) |
| 작업 전 `git status --short` | clean (WO §3 통과) |
| 대상 서비스 | web-neture / web-kpa-society / web-glycopharm / web-k-cosmetics / web-pharmacy-hub |

---

## 2. 직전 CHECK 49곳 재분류표

직전 WO 의 H4 목록 **49곳**을 현재 코드로 재확인한 결과, 같은 안티패턴이 **57 site (26 파일)** 로 확인되었다
(직전 집계는 파일 단위로 병합된 항목이 있었다). 아래가 재분류 결과다.

| 라벨 | 건수 | 의미 |
|---|---:|---|
| `FIX_SIMPLE` | 23 | catch 의 빈 배열/0/null 주입 제거 + error 분기 추가 |
| `FIX_WITH_RETRY` | 21 | 위 + `다시 시도` 재호출 수단 추가 |
| `KEEP_SAFE_EMPTY` | 11 | 실패=없음이 의도적으로 옳은 곳(부가 정보·선택 병합·미리보기) |
| `HOLD_COMPLEX_STATE` | 1 | 공통 템플릿 prop 계약 변경이 필요 |
| `HOLD_POLICY` | 1 | load 가 아니라 mutation 실패 삼킴 — 별도 축 |
| `HOLD_AUTH_REQUIRED` | 0 | — |
| **합계** | **57** | |

### 2-1. 서비스별 분포

| 서비스 | site | FIX | KEEP | HOLD |
|---|---:|---:|---:|---:|
| web-neture | 10 | 10 | 0 | 0 |
| web-kpa-society | 24 | 15 | 8 | 1 |
| web-glycopharm | 14 | 12 | 1 | 1 |
| web-k-cosmetics | 9 | 9 | 0 | 0 |
| web-pharmacy-hub | 0 | 0 | 0 | 0 |

web-pharmacy-hub 은 모든 로더가 이미 `error` state 와 실패 문구를 갖고 있어 이번 배치 수정 대상이 없다
(재확인: `store-owner/HandledProductsPage`, `operator/MembershipsPage`, `supplier/ProductsPage` 모두 catch 에서 `setError(...)` 수행).

---

## 3. 수정한 화면 (FIX)

### web-neture (10 site / 8 파일) — 신규 `components/common/LoadErrorNotice.tsx`

| 파일 | 위장하던 표시 | 조치 |
|---|---|---|
| `components/home/CommunityPreviewSection.tsx` | "아직 포럼 글이 없습니다" | loadError + 재시도 |
| `components/home/FeaturedSection.tsx` | "등록된 공급자가 없습니다" | loadError + 재시도 |
| `components/home/LatestUpdatesSection.tsx` | 섹션이 조용히 사라짐 | `Promise.allSettled` 전환, 전부 실패 시 error 섹션 노출 |
| `pages/admin/ForumDeletedManagementPage.tsx` (2) | 0건 목록 / 로그 없음 | loadError·logsError 분리 + 재시도 |
| `pages/admin/catalog-import/ImportHistoryPage.tsx` | 0건 목록 | `success:false` 도 error 로 판정 + 재시도 |
| `pages/market-trial/MarketTrialHubPage.tsx` | "모집 중 없음" | reloadKey 재시도 |
| `pages/operator/RecruitingProductsOverviewPage.tsx` | 빈 DataTable | `!res.ok` → error + 재시도 |
| `pages/partner/PartnerOverviewPage.tsx` | 모달 "콘텐츠 없음" | contentLoadError + 재시도 |
| `pages/partner/RecruitingProductsPage.tsx` | "상품 없음" | useCallback 추출 + 재시도 |

### web-kpa-society (15 site / 7 파일) — 신규 `components/common/LoadErrorState.tsx`

| 파일 | 조치 |
|---|---|
| `pages/courses/CourseHubPage.tsx` | loadError + 재시도 |
| `pages/dashboard/MyContentPage.tsx` | loadError + 재시도 |
| `components/event-offer/EventOfferContentPanel.tsx` | loadError + 재시도 |
| `pages/event-offer/KpaEventOfferPage.tsx` | loadError + 재시도 |
| `components/store/StoreAssetSelectorModal.tsx` | 4개 소스 공통 실패 배너 + 재시도 |
| `pages/pharmacy/StoreSignagePage.tsx` (6) | 기존 `error`/`playlistError` 를 **실제로 채우도록** 교정 + `scheduleError` 신설 + 재시도 |
| `pages/pharmacy/StoreTabletDisplaysPage.tsx` | 공통 대기영상 후보 모달 error 분기 + 재시도 |

### web-glycopharm (12 site / 9 파일) — 기존 `components/common/ErrorState.tsx` 재사용(문구만 표준화)

| 파일 | 조치 |
|---|---|
| `pages/b2b/SupplyPage.tsx` | 기존 `error` state 를 catch 에서 채움 |
| `pages/community/CommunityMainPage.tsx` (최신 활동) | `loadError` prop 추가 + 재시도 |
| `pages/forum/ForumFeedbackPage.tsx` | ErrorState + reloadKey 재시도 |
| `pages/operator/RecruitmentExposureApprovalPage.tsx` | ErrorState + 재시도 |
| `pages/store-management/StoreLibraryContentsPage.tsx` | ErrorState + 재시도 |
| `pages/store-management/StoreLibraryResourcesPage.tsx` | ErrorState + 재시도 |
| `pages/store-management/StoreRecruitmentApplicationsPage.tsx` | ErrorState + 재시도 |
| `pages/store-management/b2b-order/B2BOrderPage.tsx` | 기존 `error` state 를 catch 에서 채움 |
| `pages/store-management/StoreSignagePage.tsx` (3) | error/playlistError 채움 + `playlistItemsError` 신설 |
| `pages/store-management/signage/StoreSignageMainPage.tsx` (6) | 위와 동일 + `scheduleError` 신설 |

### web-k-cosmetics (9 site / 8 파일) — 신규 `components/common/LoadErrorNotice.tsx`

| 파일 | 조치 |
|---|---|
| `pages/b2b/SupplyPage.tsx` | loadError + reloadKey 재시도 |
| `pages/operator/RecruitmentExposureApprovalPage.tsx` | loadError + 재시도 |
| `pages/platform/StoresPage.tsx` | 지표 `-` 위장 제거 → 상단 실패 배너(endpoint 표기) + 재시도 |
| `pages/services/TouristHubPage.tsx` | 부분 실패 / 전체 실패 분리 + 재시도 |
| `pages/store/StoreLibraryContentsPage.tsx` | loadError + 재시도 |
| `pages/store/StoreLibraryResourcesPage.tsx` | loadError + 재시도 |
| `pages/store/StoreRecruitmentApplicationsPage.tsx` | loadError + 재시도 |
| `pages/store/StoreSignagePage.tsx` (2) | playlistError 채움 + `playlistItemsError` 신설 |

---

## 4. HOLD 화면과 이유

| 화면 | 라벨 | 왜 HOLD 인가 | 다음 수정 방법 |
|---|---|---|---|
| `web-glycopharm/pages/community/CommunityMainPage.tsx` — 공지 목록(`loadNotices`) | `HOLD_COMPLEX_STATE` | 공지는 공통 `StandardHomeTemplate` 의 `notices` / `noticesLoading` prop 으로 전달된다. error 를 표현하려면 **공통 템플릿의 prop 계약 변경**이 필요하고 이는 WO §5 금지(공통 패키지 승격·계약 변경)에 해당한다. 같은 파일의 "최신 활동" 섹션은 로컬 컴포넌트라 이번에 수정했다. | `StandardHomeTemplate` 에 `noticesError` / `onNoticesRetry` optional prop 추가 별도 WO. 소비처(KPA / GlycoPharm / K-Cosmetics / Neture) 전수 확인 필요 — CLAUDE.md Shared Module Change Rule. |
| `web-kpa-society/pages/signage/ContentHubPage.tsx:288` | `HOLD_POLICY` | catch 가 **DELETE 실패**를 삼키는 자리다. 조회 실패(load)가 아니라 mutation 실패이므로 4상태 계약 대상이 아니며 문구·재시도 설계가 다르다(토스트 / 되돌리기). | mutation 실패 표준(토스트 + 실패 시 목록 롤백)을 별도 배치에서 처리. |

### KEEP_SAFE_EMPTY (11) — 수정하지 않은 이유

| 화면 | 이유 |
|---|---|
| `kpa/pages/courses/CourseIntroPage.tsx:59,68` | 소개 페이지 부가 블록. 없으면 섹션 자체를 감춘다(핵심 정보 아님). |
| `kpa/pages/lms/LmsCourseDetailPage.tsx:66` · `instructor/operations/OperationsCourseDetailPage.tsx:200` | 퀴즈·부가 자료 — 실제로 없는 경우가 정상이며 본문 표시를 막지 않아야 한다. |
| `kpa/pages/pharmacy/HubScreenSetLibraryPage.tsx:108` | 매장 slug 미리보기 파라미터. 실패해도 목록·가져오기는 정상 동작하며, 목록 자체는 이미 `error` + `다시 시도` 계약을 갖추고 있다. |
| `kpa/pages/pharmacy/HubScreenSetLibraryPage.tsx:160,173,188` | 미리보기·상세 렌더 실패 — 상세·가져오기는 계속 가능(안내만). |
| `kpa/components/store/StoreAssetSelectorModal.tsx` 내부 direct contents 병합 | 선택적 prepend. 주 목록 실패는 이번에 배너로 노출했다. |
| `kpa/pages/public/MultilingualProductPublicLandingPage.tsx:114` | 공개 랜딩의 선택 언어 폴백. |
| `glycopharm/pages/education/CourseDetailPage.tsx:365` | 퀴즈 부재가 정상. |

---

## 5. 적용한 4상태 계약

```
loading → (실패)     error : "데이터를 불러오지 못했습니다." / "잠시 후 다시 시도해 주세요." / [다시 시도]
        → (성공·0건) empty : 화면별 기존 문구 유지 ("등록된 자료가 없습니다" 등)
        → (성공·N건) ready
```

- error 분기는 **항상 empty 분기보다 앞**에 둔다 → 두 상태가 JSX 상에서 구조적으로 분리된다.
- 재시도는 실패한 로더만 재호출한다(전체 페이지 reload 아님). 로더가 effect 인라인이면 `reloadKey` 카운터로 재실행한다.
- 진단 노출: raw stack trace / HTML 응답 / secret 미노출. `detail` 은 endpoint 수준만(예: `GET /cosmetics/stores/dashboard`).

---

## 6. empty 와 error 분리 증거

수정 전 (대표형):

```tsx
} catch {
  setItems([]);            // ← 실패가 "0건" 이 된다
} finally { setLoading(false); }
...
{loading ? <Spinner/> : items.length === 0 ? <Empty/> : <List/>}
```

수정 후:

```tsx
} catch {
  setLoadError(true);      // ← 실패는 실패로 남는다
} finally { setLoading(false); }
...
{loading ? <Spinner/>
 : loadError ? <LoadErrorNotice onRetry={() => void fetchItems()} />   // error
 : items.length === 0 ? <Empty/>                                       // empty
 : <List/>}
```

기존에 `error` state 와 error UI 가 **이미 있는데 catch 가 채우지 않던** 화면(사이니지 계열 5파일)은
UI 를 새로 만들지 않고 catch 본문만 교정했다 — 회귀 위험이 가장 낮은 형태다.

---

## 7. typecheck · build · deploy 결과

| 서비스 | `tsc --noEmit` | `vite build` |
|---|---|---|
| web-neture | PASS (0 error) | PASS |
| web-kpa-society | PASS (0 error) | PASS |
| web-glycopharm | PASS (0 error) | PASS |
| web-k-cosmetics | PASS (0 error) | PASS |
| web-pharmacy-hub | 변경 없음 | 변경 없음 |

배포: GitHub Actions `Deploy Web Services (Cloud Run)` — `detect-changes` 로 변경된 4개 web 서비스만.
**API 배포 없음** (`apps/api-server` 변경 0).

---

## 8. 실브라우저 smoke 결과

| 축 | 결과 |
|---|---|
| 정상 데이터 화면 | PASS — 기존 목록 렌더 동일(회귀 없음) |
| 빈 데이터 화면 | PASS — 기존 empty 문구 그대로 유지 |
| API 실패 화면 | **PASS (실측)** — `glycopharm.co.kr/forum/feedback` 의 실제 404 상황에서 error 상태 + `다시 시도` 버튼 렌더 확인. 그 외 화면은 정적 검증(아래 한계 참조) |
| 로그인 필요 화면 | PASS — 기존 guard 동작 불변(이번 배치 미개입) |
| 권한 없음 화면 | PASS — 기존 동작 불변(이번 배치 미개입) |
| 없는 route 404 | PASS — 직전 배치의 404 표준 유지 |

### 실브라우저에서 실제로 잡은 결함 (후속 수정 1차)

`https://glycopharm.co.kr/forum/feedback` 를 실브라우저로 열었을 때
`GET /api/v1/glycopharm/forum/feedback` 이 **404** 인데도 화면은 여전히
"아직 등록된 의견이 없습니다"(empty) 를 보여주었다.

원인은 화면이 아니라 **API 래퍼**였다.

| 래퍼 | 문제 | 영향 |
|---|---|---|
| `services/web-glycopharm/src/services/api.ts` 의 `apiClient` | 실패를 throw 하지 않고 `{ error }` 로 **정상 반환** | `catch { setLoadError(true) }` 가 **영원히 실행되지 않음** → 1차 수정이 무효 |
| `services/web-neture/src/lib/api/neture.ts` 의 `getPartnershipRequests` | `catch` 에서 `return []` | `Promise.allSettled` 가 reject 를 못 봄 → 부분 실패가 empty 로 위장 |

수정:

| 파일 | 수정 |
|---|---|
| `web-glycopharm/pages/b2b/SupplyPage.tsx` | `if (response.error) { setError(표준문구); return; }` 추가 |
| `web-glycopharm/pages/forum/ForumFeedbackPage.tsx` | `if (response.error) { setLoadError(true); return; }` 추가 |
| `web-glycopharm/pages/store-management/b2b-order/B2BOrderPage.tsx` | 2개 응답 각각 `error` 판정 추가 |
| `web-neture/lib/api/neture.ts` | `return []` → `throw error` (소비처 1곳뿐임을 확인) |

교훈(다음 배치 필수 점검): **`catch` 를 추가하기 전에 그 화면이 쓰는 API 래퍼가 실제로 throw 하는지 먼저 확인한다.**
throw 하지 않는 래퍼(`{ error }` / `{ success:false }` / `null` 반환)는 `catch` 가 아니라 **반환값 판정**이 필요하다.

### 한계 (WO §7 명시 요구)

- 프로덕션 API 를 인위적으로 실패시키는 것은 운영 영향이 있어 수행하지 않았다. 따라서 "API 실패 화면" 은
  ① 코드 경로 정적 검증(catch → error state → error 분기 도달) ② 빌드 산출물 확인으로 검증했다.
- 네트워크 차단·잘못된 endpoint 주입은 수행하지 않았다. 실패 UI 의 **런타임 시각 확인은 미완**이며,
  다음 배치에서 로컬 dev 서버 + 요청 차단으로 확인할 것을 제안한다.

---

## 9. 공통화 후보 (이번 배치에서는 승격하지 않음 — WO §5)

| 후보 | 현재 상태 | 제안 |
|---|---|---|
| `LoadErrorNotice` (neture) / `LoadErrorNotice` (k-cosmetics) | 동일 구현 2벌 | `@o4o/ui` 또는 `@o4o/error-handling` 로 승격 |
| `LoadErrorState` (kpa, inline style) | KPA `EmptyState` 관용구에 맞춘 별도 구현 | 위 승격 시 style variant 로 흡수 |
| `ErrorState` (glycopharm) | 기존 컴포넌트 — 문구만 표준화 | 위 승격의 기준 구현으로 사용 가능 |
| `StandardHomeTemplate` 의 `noticesError` prop | 없음 | §4 HOLD 해소용. 소비처 4서비스 전수 확인 필요 |
| `useLoadState()` 훅 (loading/error/empty + retry) | 없음 | 화면마다 반복되는 3-state 보일러플레이트 제거 |

---

## 10. commit SHA

- 1차 수정: `7be0cc39b` — fix(web): API 실패를 빈 목록으로 위장하던 화면 4상태 계약 정리 (40 files / +977 / -158)
- 2차 수정(실브라우저에서 잡은 래퍼 결함): `9788092f8` — fix(web): throw 하지 않는 API 래퍼로 error 분기가 도달하지 못하던 4곳 보정 (5 files / +52 / -3)

## 11. push 결과

- 1차: `0127d1ad5..7be0cc39b  main -> main` — `HEAD == origin/main` 확인
- 1차 배포: GitHub Actions run `31457906264` **success**
  (kpa-society / glycopharm / neture / k-cosmetics 배포 success, pharmacy-hub skipped, API 배포 없음)
- 2차: `05aca0bd6..9788092f8  main -> main`
- 2차 배포: GitHub Actions run `31458498755` **success** (neture / glycopharm success, 나머지 skipped, API 배포 없음)
- 배포 후 재확인: `https://glycopharm.co.kr/forum/feedback` — API 404 상태에서
  "데이터를 불러오지 못했습니다." / "잠시 후 다시 시도해 주세요." / `다시 시도` 버튼 렌더 확인 (empty 문구 사라짐)

---

## 부록. 광역 재스캔 결과 (참고 — 이번 범위 아님)

느슨한 정규식(`catch { ... set*([] | null | 0) }`)으로 5개 서비스를 재스캔하면 107 site 가 걸린다.
이번 배치 대상 57 을 제외한 나머지 후보를 표본 검증한 결과 대부분이 **오탐**이었다:
이미 `setError(...)` 를 함께 수행(pharmacy-hub 전체, k-cosmetics `platform/ProductsPage`),
선택적 slug·모달 상태 초기화, mutation catch, 이미 load-error 계약이 적용된 재시도 핸들러(neture supplier 대시보드).
따라서 직전 CHECK 의 49(=57 site) 모집단은 유효하며, 잔여 실 결함은 확인되지 않았다.

---

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (§4 HOLD 2건)
