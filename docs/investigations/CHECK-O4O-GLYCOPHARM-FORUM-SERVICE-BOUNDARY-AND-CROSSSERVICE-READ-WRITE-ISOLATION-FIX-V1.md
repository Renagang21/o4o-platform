# CHECK-O4O-GLYCOPHARM-FORUM-SERVICE-BOUNDARY-AND-CROSSSERVICE-READ-WRITE-ISOLATION-FIX-V1

**GlycoPharm 포럼 service boundary 누락 수정 — cross-service read/write 격리**

- 근거 WO: `WO-O4O-GLYCOPHARM-FORUM-SERVICE-BOUNDARY-AND-CROSSSERVICE-READ-WRITE-ISOLATION-FIX-V1`
- 선행 census: `IR-O4O-COMMUNITY-CROSSSERVICE-FULL-CENSUS-V1` (S1) · census commit `e020342a4`
- 브랜치: `work/commonization-community` (main 미병합)
- 성격: **격리 결함 수정** (공통화 아님)

---

## 1. census 에서 발견된 S1 원인

GlycoPharm 사용자-facing 포럼이 **서비스 필터가 없는 generic route** `/api/v1/forum/*` 를 직접 호출했다.

격리가 적용되지 않는 이유는 코드 경로가 명시적이다.

| 위치 | 내용 |
|---|---|
| `apps/api-server/src/routes/forum/forum.routes.ts` | `forumContextMiddleware` **미적용** → `req.forumContext` 없음 |
| `ForumControllerBase.applyContextFilter` | `if (!ctx) return;` — 컨텍스트가 없으면 **어떤 조건도 걸지 않는다** |
| `ForumControllerBase.applyServiceScope` | `if (!canonical) return;` — canonical service key 가 없으면 `forum_category_requests.service_code` EXISTS 조건 자체가 생성되지 않는다 |

결과적으로 GlycoPharm 포럼 목록·인기 포럼·상세·댓글 parent lookup 에 타 서비스(`kpa-society` / `neture` /
`k-cosmetics` / `pharmacy-hub`) 커뮤니티 포럼·게시글이 섞일 수 있었고, 작성 경로도 서비스 경계 밖
`forumId` / `forumSlug` 를 막지 못했다. CLAUDE.md §7 Guard Rule 3 (Domain Primary Boundary 필터 필수) 위반이다.

## 2. 수정 전 — generic / scoped 경로 혼재

같은 서비스 안에서 두 축이 공존했다.

| 축 | 소비처 | 경로 |
|---|---|---|
| **generic (무필터)** | `services/forumApi.ts` — 목록·인기·상세·댓글·작성·소유자 관리·멤버십 7종 | `/api/v1/forum/*` |
| **service-scoped** | `pages/community/CommunityMainPage.tsx:216` · `pages/store-management/PharmacyManagement.tsx:138` · `pages/forum/ForumFeedbackPage.tsx:44` · `services/api.ts` 소유자 관리 3종 | `/api/v1/glycopharm/forum/*` |

즉 **화면마다 서로 다른 base** 를 썼고, forum base 문자열의 소유자가 4곳으로 흩어져 있었다.

**수정 전 generic `/api/v1/forum/*` 직접 소비 = 15건** (전부 `services/forumApi.ts`)

```text
fetchForumPosts            GET  /forum/posts
fetchPopularForums         GET  /forum/categories/popular
fetchForumPost             GET  /forum/posts/:id
fetchPostComments          GET  /forum/posts/:postId/comments
createForumPost            POST /forum/posts
fetchMyCategories          GET  /forum/categories/mine
updateMyCategory           PATCH /forum/categories/:id/owner
requestDeleteCategory      POST /forum/categories/:id/delete-request
forumMembershipApi × 7     GET|POST|DELETE /forum/categories/:id/{join-requests,members,membership-status}
```

## 3. 수정 후 — canonical API base

**canonical = `/api/v1/glycopharm/forum/*`**

`services/web-glycopharm/src/services/forumApi.ts` 가 base 의 **단일 소유자**다.

```ts
export const FORUM_BASE = '/glycopharm/forum';
```

- forumApi.ts 의 15개 호출 전부 `${FORUM_BASE}/...` 로 전환
- base 문자열을 직접 조립하던 3개 지점을 `FORUM_BASE` import 로 수렴
  - `pages/community/CommunityMainPage.tsx` (홈 공지 섹션)
  - `pages/store-management/PharmacyManagement.tsx` (매장 관리 포럼 요약)
  - `pages/forum/ForumFeedbackPage.tsx` (피드백)
- `services/api.ts` `forumRequestApi` 의 소유자 관리 3종(`getMyCategories` / `updateMyCategory` /
  `requestDeleteCategory`) **제거** — 활성 소비처 0 이었고(실화면은 forumApi.ts 사용) forum base 를
  두 파일이 각각 소유하는 상태가 본 결함을 다시 만든다

**수정 후 generic `/api/v1/forum/*` 직접 소비 = 0건** (테스트로 강제)

### 3-1. 의도적으로 generic 을 유지한 계약 (제외 범위)

| 경로 | 사유 |
|---|---|
| `/api/v1/forum/category-requests/*` | 포럼 개설 신청. `serviceCode=glycopharm` 쿼리로 서비스가 명시되며 operator 승인 흐름과 계약을 공유한다. 공통 `service-forum.routes.ts` 도 **같은 이유로 `/category-requests/*` 를 마운트하지 않는다** |
| `/api/v1/forum/operator/*` | operator 분석·카테고리 관리. WO §3 제외 범위(operator/admin 계약 무변경) |

## 4. 새 격리 로직을 만들지 않았다는 근거

신설한 필터·매핑·쿼리 파라미터·클라이언트 필터링은 **없다.** 기존 서비스 mount 계약을 그대로 탄다.

```text
/api/v1/glycopharm/forum/*
  → forumContextMiddleware({ serviceCode: 'glycopharm', organizationId: FORUM_ORGS.GLYCOPHARM })   (기존)
  → ForumControllerBase.getCanonicalServiceKey()                                                    (기존)
  → resolveCanonicalServiceKey('glycopharm') = 'glycopharm'  (@o4o/security-core self-map fallback)  (기존)
  → applyServiceScope: EXISTS(forum_category_requests._svc.id = post.forum_id AND _svc.service_code) (기존)
  → applyContextFilter legacy branch: isOrganizationExclusive = false OR organizationId = ctxOrgId   (기존)
```

백엔드에서 한 일은 **프런트가 이미 쓰던 endpoint 를 같은 서비스 mount 아래로 옮겨 마운트한 것뿐**이다.

| 추가한 mount | 핸들러 | 근거 |
|---|---|---|
| `GET /categories/popular` | 공통 `ForumDirectoryController.getPopularForums` | 프런트 `fetchPopularForums` 가 쓰던 endpoint. `/categories/:id` 보다 **먼저** 등록해야 `popular` 가 `:id` 로 잡히지 않는다 |
| 멤버십 7종 (`join-requests` · `members` · `membership-status`) | 공통 `ForumMembershipController` | 프런트 `forumMembershipApi` 가 쓰던 endpoint. mount 형태·핸들러·권한이 `service-forum.routes.ts`(K-Cosmetics / Neture / Pharmacy-Hub)와 **동일**하며 GlycoPharm 전용 분기를 두지 않았다 |

- `ForumMembershipController` → `ForumMembershipService` 계약(소유자 검증)은 **무변경**이다.
- 쓰기 권한도 무변경 — 기존과 동일하게 `authenticate` 만 적용했다(`createServiceForumRouter` 의
  `writeGuards` 옵션은 "기존 서비스의 쓰기 권한은 변경하지 않는다"고 명시돼 있어 사용하지 않았다).
- `forumContextMiddleware` 의 context 값(`organizationId` 유지 / `scope` 미설정)도 그대로 두어
  GlycoPharm 의 기존 조직 필터 동작이 바뀌지 않게 했다.

## 5. read 경로별 cross-service 차단 결과

검증 방식: `apps/api-server/src/__tests__/glycopharm-forum-service-boundary.spec.ts`
— fake QueryBuilder 로 `applyContextFilter` 가 실제 생성하는 SQL 조건을 실측했다 (DB 불필요).

| read 경로 | 컨트롤러 | 경계 적용 | 결과 |
|---|---|---|---|
| forumId 있는 목록 | `ForumPostController.listPosts` → `applyContextFilter` | `EXISTS(forum_category_requests.service_code = 'glycopharm')` | PASS |
| forumId 없는 목록 | 동일 (경계는 `post.forum_id` 조인 기준이라 파라미터 무관) | 동일 | PASS |
| 검색 | 동일 쿼리빌더 (검색은 `andWhere` 추가일 뿐 경계 조건 위에 쌓임) | 동일 | PASS |
| 최신 / 인기 포럼 | `ForumDirectoryController.getPopularForums` → `applyContextFilter(activityQb)` | 동일 | PASS |
| 상세 | `ForumPostController.getPost` → `applyContextFilter` | 동일 | PASS |
| 댓글 목록 parent post lookup | `ForumCommentController.listComments` → `applyContextFilter(postQb)` | 동일 | PASS |

바인딩 값 실측:

```text
glycopharm   → ctxServiceKey = 'glycopharm'
kpa          → 'kpa-society'
cosmetics    → 'k-cosmetics'
neture       → 'neture'
pharmacy-hub → 'pharmacy-hub'
```

GlycoPharm 컨텍스트에서 `kpa-society` / `neture` / `k-cosmetics` / `pharmacy-hub` 중 어느 값도
바인딩되지 않음을 단언으로 고정했다 → **타 서비스 forumId/postId 는 GlycoPharm 경로에서 조회되지 않는다.**

조직 필터(`isOrganizationExclusive = false OR organizationId = FORUM_ORGS.GLYCOPHARM`)가
그대로 함께 걸리는 것도 확인했다 — 기존 동작 무변경.

## 6. write 경로별 cross-service 차단 결과

`ForumPostController` 정적 검증 + 계약 확인.

| write 경로 | 가드 | 결과 |
|---|---|---|
| create — 타 서비스 `forumId` | `isForumInServiceScope(resolvedForumId, ctx)` 실패 시 `403 FORUM_SERVICE_SCOPE_DENIED` | PASS |
| create — 타 서비스 `forumSlug` | slug 해석 SQL 자체가 `AND service_code = $2` 로 제한 → 해석 실패 → 위 403 | PASS |
| update | `isForumInServiceScope(post.forumId, getForumContext(req))` | PASS |
| delete | 동일 | PASS |

`isForumInServiceScope` 는 `SELECT 1 FROM forum_category_requests WHERE id = $1 AND service_code = $2`
로 판정하며, 컨텍스트가 없으면(`!canonical`) `true` 를 반환한다 — **generic route 를 쓰는 동안 write 경계가
없었던 이유**이자, 이번에 GlycoPharm 을 서비스 route 로 옮겨야 했던 이유다.

author/admin 정책은 손대지 않았다 (`authenticate` 유지, 소유자·역할 판정 로직 무변경).

## 7. generic 직접 소비 잔여 수

```text
GlycoPharm 사용자-facing forum generic /api/v1/forum/* 직접 소비
  수정 전: 15
  수정 후: 0

의도적 유지(제외 범위):
  /forum/category-requests/*  2  (services/forumApi.ts 1 · services/api.ts 1)
  /forum/operator/*           4  (services/api.ts 3 · pages/operator/ForumCategoriesManagementPage.tsx 1)
```

회귀 방지: 스펙이 GlycoPharm `src` 전 파일(.ts/.tsx)을 훑어 API 호출 형태의 generic forum 경로를 0 으로 강제한다.
React Router 경로(`to=` / `navigate()` / `href`)는 대상에서 제외한다. 페이지가 `'/glycopharm/forum/...'`
문자열을 직접 조립하는 것도 금지해 base 재분기를 막는다.

## 8. 이번 범위 밖 (그대로 남긴다)

WO §3 그대로다. 아래는 **수정하지 않았다.**

- closed-forum write 비대칭
- comment create / update / delete boundary — GlycoPharm 은 현재 댓글 **표시만** 하고 작성 UI 가 없다
  (census `F40`~`F41` = `NOT_IMPLEMENTED`). 백엔드 `POST /comments` 는 서비스 route 에 이미 존재
- like boundary — GlycoPharm 에 좋아요 UI 없음 (census `F42` = `NOT_IMPLEMENTED`)
- 포럼 UI 공통화 / KPA·Neture View 수렴 / 포럼 소유자 영역 공통화
- LMS · 콘텐츠 · 자료실
- 신규 forum 기능 · DB migration
- generic `/api/v1/forum` 전역 fail-closed 전환 — 다른 소비처(admin-dashboard) 계약이라 별도 판단 필요
- operator / admin forum 계약

## 9. 검증 실행 결과

| 항목 | 결과 |
|---|---|
| `glycopharm-forum-service-boundary.spec.ts` | **17/17 PASS** |
| 관련 guard/boundary 스펙 동반 실행 (`kpa-boundary-regression` · `admin-api-guard-inventory` · `service-admin-guard` + 본 스펙) | **4 suites / 69 tests PASS** |
| `glycopharm.routes.ts` 대상 type 오류 | **0** (파일 내 잔여 2건은 `@o4o/security-core` · `@o4o/action-log-core` **dist 부재**로 인한 기존 TS2307, 본 변경과 무관) |
| web-glycopharm 변경 파일 type 오류 | **0** (전체 341건은 전부 `@o4o/*` dist 부재 TS2307) |
| api-server 전체 `tsc --noEmit` | **미실측** |
| web-glycopharm `tsc -b` 완주 | **미실측** |
| runtime / 배포환경 smoke | **미실측** |
| production DB 실측 | **미실측** |

### 9-1. 미실측 사유

- 작업 머신 물리 메모리 8GB / 가용 약 1GB. `pnpm run build:packages` 가 `@o4o/capabilities` 에서
  V8 `Fatal process out of memory: Zone` 으로 중단됐고, 공통 패키지 dist 가 없으면
  api-server / web-glycopharm 전체 typecheck 는 `@o4o/*` TS2307 로만 채워진다.
  `tsc --noEmit` 자체도 동일 OOM 으로 완주하지 못했다. **환경 제약이며 본 변경과 무관하다.**
  대신 변경 파일 단위로 오류 귀속을 확인했다(위 표).
- 프로덕션 DB: Cloud SQL Auth Proxy 바이너리가 로컬에 없고, `gcloud sql connect` 는 인스턴스의
  authorized networks 를 변경하므로 조사·수정 범위 밖으로 판단해 실행하지 않았다.

## 10. 잔존 위험

### R1. `forumId` 가 없는 기존 GlycoPharm 게시글의 목록 노출 (⚠️ 배포 전 실측 권장)

경계 조건이 `EXISTS(forum_category_requests._svc.id = post.forum_id ...)` 이므로
**`forum_id` 가 NULL 인 게시글은 서비스 스코프 목록에 나오지 않는다.**

GlycoPharm 의 `createForumPost` 는 `{ title, type, content }` 만 보내고 `forumId`/`forumSlug` 를
지정하지 않는다 → 그렇게 만들어진 글은 `forum_id = NULL` 이다. generic(무필터) 경로에서는 보였지만
service-scoped 경로에서는 보이지 않는다.

**단, 이는 본 수정이 새로 만든 동작이 아니라 canonical 계약의 성질이다.**
K-Cosmetics 는 `createForumPost` payload 가 GlycoPharm 과 동일한데 이미
`/api/v1/cosmetics/forum/*` 서비스 route 위에서 운영 중이다. 즉 GlycoPharm 을 이미 배포된 표준에
맞춘 것이고, 노출 감소가 있다면 그 표준의 기존 성질이다.

배포 전 실측용 read-only SQL:

```sql
-- 1) glycopharm 서비스에 등록된 포럼 수
SELECT count(*) FROM forum_category_requests
WHERE service_code = 'glycopharm' AND status = 'completed';

-- 2) forum_id 가 NULL 인 게시글 수 (정렬 후 GP 목록에서 사라질 후보)
SELECT count(*) FROM forum_posts WHERE forum_id IS NULL;

-- 3) glycopharm 포럼에 묶인 게시글 수 (정렬 후 GP 목록에 남는 수)
SELECT count(*) FROM forum_posts p
WHERE EXISTS (
  SELECT 1 FROM forum_category_requests s
  WHERE s.id = p.forum_id AND s.service_code = 'glycopharm'
);
```

(2) 가 크고 (3) 이 0 에 가까우면 배포 전 판단이 필요하다 — 글쓰기에 forum 선택을 강제하거나
(Pharmacy-Hub 방식) 기존 글에 forum 을 귀속시키는 데이터 작업이 필요하며, 둘 다 별도 WO 다.

### R2. GlycoPharm operator 포럼 허브의 부수 효과

`pages/operator/OperatorForumPage.tsx` 가 공유 함수 `fetchForumPosts` 를 쓰므로 read-only 게시글 목록이
함께 서비스 스코프로 좁아진다. operator API 계약(`/forum/operator/*`)은 **변경하지 않았다.**
GlycoPharm 운영자가 GlycoPharm 게시글만 보는 것은 의도에 부합하지만, 이전에 타 서비스 글까지
보이던 화면이라 운영 관점에서는 목록이 줄어 보일 수 있다.

### R3. `/api/v1/glycopharm/forum/feedback` 미마운트 (기존 결함 · 미수정)

`pages/forum/ForumFeedbackPage.tsx` 가 호출하는 `/feedback` endpoint 가 GlycoPharm forum router 에
존재하지 않는다(본 WO 이전부터). base 통일만 적용했고 endpoint 추가는 **신규 기능**이라 범위 밖으로 두었다.
별도 판단 필요.

### R4. generic `/api/v1/forum/*` 자체는 여전히 무필터

admin-dashboard 등 다른 소비처 계약이라 fail-closed 전환은 WO §3 제외 범위다.
GlycoPharm 쪽 입구만 닫았다. 다른 서비스가 같은 실수를 반복할 여지는 남아 있다
(KPA·K-Cosmetics·Neture·Pharmacy-Hub 는 census 기준 이미 서비스 route 사용).

## 11. Git

- 브랜치: `work/commonization-community`
- 커밋 2개 (fix / CHECK) · path-specific stage · `git add .` 미사용
- main 직접 병합·push 없음
