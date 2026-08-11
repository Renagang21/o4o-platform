# CHECK-O4O-GLYCOPHARM-API-WRAPPER-FAILURE-CONTRACT-CLOSEOUT-BATCH-V1

> WO: `WO-O4O-GLYCOPHARM-API-WRAPPER-FAILURE-CONTRACT-CLOSEOUT-BATCH-V1`
> 대상: `services/web-glycopharm`
> 작성: 2026-08-11

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 착수 시점 HEAD | `20867b01a` (clean · `HEAD == origin/main`) |
| 직전 batch | `WO-O4O-WEB-AUTH-LOGIN-ACCESS-UX-STANDARDIZATION-BATCH-V1` (CLOSED / PASS) |
| 원 HOLD 출처 | `CHECK-O4O-WEB-API-WRAPPER-FAILURE-CONTRACT-BATCH-V1` H1 / H2 |

## 2. `ApiClient.request` 현재 계약

`services/web-glycopharm/src/services/api.ts`

- `request` 는 axios 예외를 잡아 **`{ error: { code, message } }` 로 정상 반환**한다. throw 하지 않는다.
- 이번 배치는 **throw 전환을 채택하지 않았다.** 이유:
  - `B2BOrderPage` 가 `result.error?.code === 'DUPLICATE_REQUEST'` 로 분기하고,
    `ForumDeleteRequestsPage` / `ForumRequestsPage` 의 mutation adapter 가
    `res.error ? { ok:false, error } : { ok:true }` 계약을 사용한다.
    wrapper 를 throw 로 바꾸면 이 3경로의 코드 분기가 모두 죽는다(회귀 위험 > 이득).
  - 대신 **계약을 명시**하고(`request` JSDoc), **wrapper 내부의 실패 삼킴을 제거**하고,
    **조회 소비처가 `res.error` 를 확인하거나 adapter 경계에서 throw 로 승격**하도록 정리했다.
- 정리된 계약 (api.ts JSDoc 에 명문화):

```text
request 는 throw 하지 않는다 → 호출부는 반드시 res.error 를 먼저 확인한다
res.data 만 보고 ?? [] / || [] 로 넘어가면 API 실패가 "정상 0건" 으로 위장된다
조회 실패 → error 상태 / 정상 0건 → empty 상태
wrapper 안에서 error 를 기본값으로 삼키지 않는다
```

## 3. 소비처 13파일 전수표

`@/services/api` 를 import 하는 파일 = **13개** (직전 CHECK H1 의 13파일과 일치).

| # | 파일 | 사용 | 착수 전 상태 | 라벨 |
|---|---|---|---|---|
| 1 | `api/home.ts` | `apiClient.get` | wrapper 결과를 그대로 반환(중계) | `KEEP_SOFT_RESULT_CONTRACT` |
| 2 | `pages/community/CommunityMainPage.tsx` (최신글) | `homeApi.getLatest` | `.catch` 로만 error 처리 → 도달 불가, 실패가 empty 로 위장 | `FIX_CALLER_CHECKS_ERROR` |
| 3 | `pages/community/CommunityMainPage.tsx` (공지) | `apiClient.get` | 실패 시 공지 0건 표시 | `HOLD_COMMON_PACKAGE` |
| 4 | `pages/b2b/SupplyPage.tsx` | `apiClient.get` | `response.error` 확인 + `ErrorState` | `VALID` |
| 5 | `pages/forum/ForumFeedbackPage.tsx` | `apiClient.get` | `response.error` 확인 + `ErrorState` | `VALID` |
| 6 | `pages/forum/MyRequestsPage.tsx` | `forumRequestApi.getMyRequests` | 페이지는 `res.error` 확인하나 **wrapper 가 `API_ERROR` 를 빈 목록으로 삼킴** | `FIX_THROW_AND_CATCH`(wrapper 측) |
| 7 | `pages/forum/RequestCategoryPage.tsx` | `forumRequestApi.create` | `res.error` 확인 (mutation) | `VALID` |
| 8 | `pages/operator/ForumRequestsPage.tsx` | `forumRequestApi.getAllRequests` | 페이지는 `if (res.error) throw` 하나 **wrapper 가 `API_ERROR` 삼킴** → throw 도달 불가 | `FIX_THROW_AND_CATCH`(wrapper 측) |
| 9 | `pages/operator/ForumDeleteRequestsPage.tsx` | `forumDeleteRequestApi.getAll` | `res.data \|\| []` — error 미확인 → 실패가 "신청 없음" | `FIX_CALLER_CHECKS_ERROR` |
| 10 | `pages/operator/OperatorForumPage.tsx` | `forumAnalyticsApi.getSummary` | 공통 `forum-hub` 는 error 상태가 있으나 throw 가 없어 미도달 | `FIX_THROW_AND_CATCH`(adapter 경계) |
| 11 | `pages/operator/ForumAnalyticsPage.tsx` | `forumAnalyticsApi.*` | 공통 `forum-analytics` 페이지에 **error 상태 자체가 없음** | `HOLD_COMMON_PACKAGE` |
| 12 | `pages/store-management/b2b-order/B2BOrderPage.tsx` | `apiClient.get` / `supplierRequestApi` | `error` 확인 + `error.code` 분기 | `VALID` / `KEEP_SOFT_RESULT_CONTRACT` |
| 13 | `pages/store-management/PharmacyManagement.tsx` | `apiClient.get` | `.catch(() => {})` 도달 불가 → 실패가 "아직 게시글이 없습니다" | `FIX_CALLER_CHECKS_ERROR` |
| 14 | `pages/store-management/signage/ContentLibraryPage.tsx` | `apiClient.get` / `apiClient.post` | 조회 실패 → 빈 목록, **복사 실패 → 성공 토스트** | `FIX_THROW_AND_CATCH` |

(파일 수 13, 행 수 14 — `CommunityMainPage` 는 공지/최신글 2축을 분리 기재)

## 4. 수정한 소비처

| 대상 | 변경 |
|---|---|
| `services/api.ts` `ApiClient` | 실패 전달 계약 JSDoc 명문화 (동작 변경 없음) |
| `services/api.ts` `forumRequestApi.getMyRequests` | `API_ERROR` → 빈 목록 삼킴 **제거** |
| `services/api.ts` `forumRequestApi.getAllRequests` | `API_ERROR` → 빈 목록 삼킴 **제거** (페이지의 기존 `throw` 가 비로소 동작) |
| `services/api.ts` `forumRequestApi.getPendingCount` | `API_ERROR` → `{ count: 0 }` 삼킴 **제거** (현재 소비처 없음) |
| `CommunityMainPage` 최신글 | `res.error` 확인 → `latestError` (기존 error UI + 다시 시도 버튼이 비로소 동작) |
| `ForumDeleteRequestsPage` | 조회 실패 `throw` — sibling `ForumRequestsPage` 와 동일 패턴 |
| `OperatorForumPage` | `getSummary` adapter 에서 `{ error }` → `throw` 승격 → `forum-hub` error 상태 연결 |
| `PharmacyManagement` `ForumFeed` | `loadError` 상태 신설 + `ErrorState`(서비스 기존 공통 컴포넌트) + 다시 시도 |
| `ContentLibraryPage` `fetchItems` | 조회 실패 `throw` → `SignageHubTemplate` 의 error 상태 + 재시도 연결 |
| `ContentLibraryPage` `onCopy` | 실패해도 "내 콘텐츠에 추가되었습니다" 성공 토스트가 뜨던 경로 차단 |

## 5. 유지 / HOLD 소비처와 이유

| # | 대상 | 라벨 | 이유 | 다음 batch 에서 닫는 방법 |
|---|---|---|---|---|
| H1 | `ForumAnalyticsPage` (공통 `@o4o/operator-core-ui/modules/forum-analytics`) | `HOLD_COMMON_PACKAGE` | `OperatorForumAnalyticsPage.loadAll` 에 error 상태도 catch 도 없다. 여기서 throw 로 승격하면 **무한 loading** 이 된다 | 공통 UI 승격 batch 에서 `loadError` state + `ErrorState` 를 모듈에 추가하고 3서비스 adapter 를 throw 로 통일 |
| H2 | `CommunityMainPage` 공지 섹션 (`@o4o/shared-space-ui` `StandardHomeTemplate`) | `HOLD_COMMON_PACKAGE` | `notices` / `noticesLoading` 만 있고 error 를 받을 prop 이 없다 | 공통 UI 승격 batch 에서 `noticesError` + retry prop 추가 (KPA / K-Cosmetics 홈 동시 적용) |
| K1 | `api/home.ts` | `KEEP_SOFT_RESULT_CONTRACT` | wrapper 결과 중계 계층. 판정은 소비처가 한다 | — |
| K2 | `B2BOrderPage` `supplierRequestApi` / delete-request·review mutation adapter | `KEEP_SOFT_RESULT_CONTRACT` | `error.code` 분기(`DUPLICATE_REQUEST`) 와 `{ ok:false, error }` 계약이 업무상 필요 | — |

미소비 export (`displayApi`, `authApi`, `forumRequestApi.getMyCategories/updateMyCategory/requestDeleteCategory`) 는 이번 범위 밖으로 두고 **보고만** 한다 (범위 외 수정 금지).

## 6. empty / error 분리 증거

| 화면 | 정상 0건 | 조회 실패 |
|---|---|---|
| 커뮤니티 홈 최신글 | "등록된 글이 없습니다" | "데이터를 불러오지 못했습니다. / 잠시 후 다시 시도해 주세요." + 다시 시도 |
| 내 약국 포럼 피드 | "아직 게시글이 없습니다" | `ErrorState` + 다시 시도 |
| 사이니지 콘텐츠 라이브러리 | "아직 등록된 콘텐츠가 없습니다" | `SignageHubTemplate` error + 다시 시도 |
| 운영자 포럼 허브 | KPI 0 | "포럼 데이터를 불러오지 못했습니다." |
| 운영자 삭제 요청 | "신청 없음" | 목록 error 상태 |

## 7. 실제 실패 smoke

§9 실측 참조. backend/API 를 인위적으로 깨지 않고, 권한이 없어 실제 실패(4xx)가 나는 read endpoint 로 error 상태를 실측한다.

## 8. typecheck / build / deploy 결과

| 항목 | 결과 |
|---|---|
| `npx tsc -b` (web-glycopharm) | PASS |
| `npx vite build` (web-glycopharm) | PASS |
| deploy | §9 |

API 서버 배포 없음. backend / endpoint / 응답 스키마 / 권한 / route / DB 변경 0.

## 9. commit SHA · smoke · deploy 실측

(배포·smoke 후 기재)

## 10. push 결과

(기재)
