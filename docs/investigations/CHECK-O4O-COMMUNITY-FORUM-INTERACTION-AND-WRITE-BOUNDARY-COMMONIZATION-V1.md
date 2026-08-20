# CHECK-O4O-COMMUNITY-FORUM-INTERACTION-AND-WRITE-BOUNDARY-COMMONIZATION-V1

> **WO**: `WO-O4O-COMMUNITY-FORUM-INTERACTION-AND-WRITE-BOUNDARY-COMMONIZATION-V1`
> **작업일**: 2026-08-19
> **범위**: Forum Interaction / Write Boundary 축 (댓글 CRUD · 좋아요 · closed forum 쓰기 정책 · pin/unpin · 5 서비스 adoption)
> **성격**: 신규 forum 기능 개발이 아니라 **기존 interaction 의 service isolation + authorization 정합**

---

## 0. 요약

| 항목 | 결과 |
|---|---|
| 조사 endpoint | 44 (generic 8 write + 서비스 mount 4개 × interaction + read/consumer) |
| 미조사 | 0 |
| 확정 결함 | 6 (comment create / comment update / comment delete / like / pin / generic write 무경계) |
| 부수 정합 결함 | 3 (KPA pin route 미마운트 · comment 재삭제 count 중복 차감 · `isLocked/allowComments` 미강제) |
| Migration | 0 |
| 신규 shared helper | 4 (`resolveForumPostInServiceScope` · `resolveForumCommentInServiceScope` · `assertForumWriteAccess` · `hasForumModerationOverride`) |
| 신규 spec | `apps/api-server/src/__tests__/community-forum-interaction-and-write-boundary-commonization.spec.ts` (25 tests) |

---

## 1. Census — interaction endpoint 전수 (§2)

`method / path` → `controller` → `service scope 조회` → `closed forum 판정` → `ownership 판정` → 판정.

### 1-1. generic `/api/v1/forum/*` (`routes/forum/forum.routes.ts`) — forumContext **없음**

| # | method / path | controller | 소비 서비스 | scope | closed | ownership | 수정 전 판정 | 조치 |
|---|---|---|---|---|---|---|---|---|
| 1 | POST `/posts` | ForumPostController.createPost | admin-dashboard | 없음(ctx 없음) | 없음 | author | SERVICE_SPECIFIC(무경계) | platform admin 전용 분리 |
| 2 | PUT `/posts/:id` | updatePost | admin-dashboard | 없음 | — | author/admin | SERVICE_SPECIFIC | 동일 |
| 3 | DELETE `/posts/:id` | deletePost | admin-dashboard | 없음 | — | author/admin | SERVICE_SPECIFIC | 동일 |
| 4 | POST `/posts/:id/like` | toggleLike | (프런트 소비 0) | 없음 | 없음 | — | SERVICE_SPECIFIC | 동일 |
| 5 | PATCH `/posts/:id/pin` | pinPost | (프런트 소비 0) | 없음 | — | forum owner | SERVICE_SPECIFIC | 동일 |
| 6 | POST `/comments` | createComment | admin-dashboard | 없음 | 있음 | author | SERVICE_SPECIFIC | 동일 |
| 7 | PUT `/comments/:id` | updateComment | forum-core admin-ui | 없음 | 없음 | author/admin | SERVICE_SPECIFIC | 동일 |
| 8 | DELETE `/comments/:id` | deleteComment | forum-core admin-ui | 없음 | 없음 | author/admin | SERVICE_SPECIFIC | 동일 |
| 9~14 | GET reads (`/posts`, `/posts/:id`, `/posts/:postId/comments`, `/categories`, `/stats`, `/health`) | 각 controller | admin-dashboard | 없음 | 부분 | — | OUT_OF_SCOPE(admin read 계약) | 유지 |

> generic write 8건은 서비스 사용자 경로가 아니다(서비스 프런트 소비 0건). platform admin 전용
> guard `requireGenericForumWriteAdmin` 로 분리해 **service boundary 우회 통로**를 제거했다.

### 1-2. 서비스 mount — `createServiceForumRouter` (neture / k-cosmetics / pharmacy-hub)

| # | method / path | scope | closed | ownership | 수정 전 | 수정 후 |
|---|---|---|---|---|---|---|
| 15 | POST `/posts` | forumId 검사 O | **없었음** | author | CORE_ONLY | FULLY_COMMON |
| 16 | PUT `/posts/:id` | O(raw lookup 후) | — | author/admin | CORE_ONLY | FULLY_COMMON |
| 17 | DELETE `/posts/:id` | O(raw lookup 후) | — | author/admin | CORE_ONLY | FULLY_COMMON |
| 18 | POST `/posts/:id/like` | **없었음** | **없었음** | — | SERVICE_SPECIFIC | FULLY_COMMON |
| 19 | PATCH `/posts/:id/pin` | **없었음** | — | owner only | SERVICE_SPECIFIC | FULLY_COMMON |
| 20 | POST `/comments` · `/posts/:postId/comments` | **없었음** | 있음 | author | SERVICE_SPECIFIC | FULLY_COMMON |
| 21 | PUT `/comments/:id` | **없었음** | 없음 | author/admin | SERVICE_SPECIFIC | FULLY_COMMON |
| 22 | DELETE `/comments/:id`, `/posts/:postId/comments/:id` | **없었음** | 없음 | author/admin | SERVICE_SPECIFIC | FULLY_COMMON |
| 23~30 | reads (`/posts`, `/posts/:id`, `/posts/:postId/comments`, `/categories`, `/categories/:id`, `/stats`, `/health`, `/tags/popular`) | O | 있음 | — | FULLY_COMMON | 변경 없음 |

### 1-3. KPA mount (`routes/kpa/kpa.routes.ts`)

| # | method / path | 수정 전 | 조치 |
|---|---|---|---|
| 31 | POST `/posts` | closed forum 미검사 | closed 게이트 추가 |
| 32 | PUT / DELETE `/posts/:id` | raw lookup 후 scope | 공통 resolver |
| 33 | POST `/posts/:id/like` | 무경계 | 공통 resolver + closed 게이트 |
| 34 | PATCH `/posts/:id/pin` | **route 없음(404)** — 프런트는 호출 중 | remount(정합) |
| 35 | POST `/comments`, `/posts/:postId/comments` | 무경계 | 공통 resolver |
| 36 | DELETE `/posts/:postId/comments/:id` | 무경계 | 공통 resolver |
| 37~44 | reads · operator · category-requests | 기존 계약 유지 | 변경 없음 |

### 1-4. 프런트 소비처 census

| 서비스 | 파일 | interaction 소비 | 판정 |
|---|---|---|---|
| KPA | `services/web-kpa-society/src/api/forum.ts` | like · comment create/delete · pin | FULLY_COMMON (pin 은 route 부재로 사망 → 복구) |
| Neture | `services/web-neture/src/services/forumApi.ts` | like · comment create/update/delete | FULLY_COMMON |
| K-Cosmetics | `services/web-k-cosmetics/src/services/forumApi.ts` | post create + reads only | SERVICE_SPECIFIC (의도된 read-only) |
| GlycoPharm | `services/web-glycopharm/src/services/forumApi.ts` | post create + reads only | SERVICE_SPECIFIC (의도된 read-only) |
| Pharmacy-Hub | `services/web-pharmacy-hub/src/services/forumApi.ts` | categories · list · detail · post create | NOT_IMPLEMENTED (백엔드는 공통, UI 미구현) |
| Admin | `apps/admin-dashboard/src/api/unified-client.ts` + `packages/forum-core/src/admin-ui` | generic write | OUT_OF_SCOPE (platform admin 경로) |

---

## 2. Canonical authorization 순서 (§3)

```
1 인증
2 service context 해석 (forumContextMiddleware → ForumContext)
3 service scope 안에서 target 조회   ← 공통 resolver
4 closed forum access 판정
5 ownership / operator / admin 판정
6 mutation
7 count / derived state 갱신
```

- **raw entity lookup → 나중에 service scope 확인** 패턴 제거. 모든 interaction 경로가
  `resolveForumPostInServiceScope` / `resolveForumCommentInServiceScope` 를 통과한다.
- 비공개 계약: 타 서비스 target 은 **404**, 없는 target 과 응답이 구별되지 않는다.
  같은 서비스 + 권한 없음은 기존 정책대로 403 (`CLOSED_FORUM_ACCESS_DENIED` / `NOT_FORUM_OWNER` / `Permission denied`).
- 순서는 spec 에서 명시적으로 검증한다 (타 서비스 pin 시 `forum_category_members` 조회가 **0회**).

---

## 3. 확정 결함과 수정

| # | 결함 | 파일 | 수정 |
|---|---|---|---|
| D1 | comment create 가 `postId` 단독 조회 → 타 서비스 게시글에 댓글 가능, 없는 post 는 400 으로 구별 노출 | `ForumCommentController.createComment` | 공통 resolver + 404 통일 + archived 404 |
| D2 | comment update 가 `commentId` 단독 조회 → 타 서비스 댓글 수정 가능 | `updateComment` | 공통 resolver(404) |
| D3 | comment delete 동일 + 이미 삭제된 댓글 재삭제 시 `commentCount` 중복 차감 | `deleteComment` | 공통 resolver + `alreadyDeleted` 가드 |
| D4 | like/toggleLike 가 `postId` 단독 조회 → 타 서비스 게시글 좋아요, closed forum 비회원 좋아요 가능 | `ForumPostController.toggleLike` | 공통 resolver + closed 게이트 |
| D5 | pin 이 `postId` 단독 조회 → 타 서비스 게시글 존재가 403(NOT_FORUM_OWNER)로 노출 | `pinPost` | 공통 resolver(404) + moderation override |
| D6 | generic `/api/v1/forum/*` write 가 ctx 없이 통과 → service boundary 우회 통로 | `routes/forum/forum.routes.ts` | `requireGenericForumWriteAdmin` (platform admin 전용) |
| D7 | KPA `PATCH /forum/posts/:id/pin` route 미마운트 → 프런트 pin 이 404 | `routes/kpa/kpa.routes.ts`, `ForumController` | 공통 핸들러 remount + facade 위임 추가 |
| D8 | post create 에 closed forum 쓰기 판정 없음 (댓글에만 있었음) | `createPost` | `assertForumWriteAccess` |
| D9 | `ForumPost.isLocked` / `allowComments` 계약이 댓글 생성에서 미강제 | `createComment` | `COMMENTS_DISABLED` 403 |

---

## 4. Closed-forum write policy 정합표 (§7)

| action | public forum | closed + member | closed + non-member | operator/admin | 현재 정책 | 수정 |
|---|---|---|---|---|---|---|
| post create | 허용 | 허용 | **403** | 허용(bypass) | 미검사였음 | 검사 추가 |
| post update/delete | author/admin | 동일 | 대상 접근 불가 | admin | 유지 | 변경 없음 |
| comment create | 허용 | 허용 | 403 | 허용 | 이미 존재 | 유지 |
| comment update/delete | author/admin | 동일 | 대상 접근 불가 | platform admin | 유지 | 변경 없음 |
| like | 허용 | 허용 | **403** | 허용 | 미검사였음 | 검사 추가 |
| pin | forum owner | forum owner | 불가 | **override 추가** | owner only | override(동일 서비스 operator + platform admin) |

> 새 membership 정책을 발명하지 않았다. 판정은 전부 기존 `checkClosedForumAccess`
> (`forum_category_members` + `requester_id` fallback + platform admin/동일 서비스 operator bypass) 재사용이다.

---

## 5. 공통 helper (§9)

`ForumControllerBase` 에 4개 추가 — 경로별 service scope 코드 복제 금지.

| helper | 역할 |
|---|---|
| `resolveForumPostInServiceScope(postId, ctx)` | post 를 서비스 스코프 안에서 해석. 없음/타 서비스 → `null` (호출자는 동일 404) |
| `resolveForumCommentInServiceScope(commentId, ctx, {relations})` | comment → post → forum → service scope 해석 |
| `assertForumWriteAccess(forumId, userId, roles)` | closed forum 쓰기 판정 진입점 (`checkClosedForumAccess` 위임) |
| `hasForumModerationOverride(forumId, roles)` | platform admin 전역 / 동일 서비스 operator 만 override (cross-service bypass 없음) |

기존 `resolveCanonicalServiceKey()` · `ForumContext` · `applyContextFilter()` · `isForumInServiceScope()` 를 그대로 재사용했다.

---

## 6. 서비스별 adoption (§10~§12)

| 서비스 | 판정 | 근거 |
|---|---|---|
| KPA | 회귀 통과 + pin 복구 | 기존 mount 유지, pin route 정합 |
| Neture | 회귀 통과 | `createServiceForumRouter` 공통 경로, 코드 변경 없음 |
| Pharmacy-Hub | 백엔드 FULLY_COMMON / 프런트 NOT_IMPLEMENTED | 공통 라우터로 interaction endpoint 보유, UI 없음. **신규 UI 는 §18 제외 범위** |
| K-Cosmetics | 의도된 read-only 유지 | 공통 라우터 경계 결함만 수정, 신규 UI 없음 |
| GlycoPharm | 의도된 read-only 유지 | 동일 |

---

## 7. Production DB 확인 (§16, read-only)

`cloud-sql-proxy` 경유 SELECT 만 수행. write 0건.

| 항목 | 결과 |
|---|---|
| forum service_code × forum_type | kpa-society open 1 / kpa-society closed 1 / neture open 2 |
| closed forum | 1 |
| post forum_id NULL | 0 |
| post service 분포 | kpa-society 4 (전량) |
| comment postId NULL | 0 |
| orphan comment (post 없음) | 0 |
| service 별 comment | kpa-society 3 |
| service 별 like / orphan like | 0 / 0 |
| pinned post | 0 |
| isLocked / allowComments=false | 0 / 0 |
| closed forum 소속 post / comment | 1 / 0 |
| forum_category_members | 3 |

> cross-service orphan 0건. 데이터 교정 필요 없음 (migration 0).
> 실제 테이블명은 `forum_post` · `forum_comment` · `forum_post_like` (복수형 아님), 컬럼은 혼합 표기(`"postId"`, `"isPinned"`).

---

## 8. 검증 (§20)

| 항목 | 결과 |
|---|---|
| 신규 spec | 25 passed |
| api-server 전체 jest | 154 suites / 2,443 tests PASS (기존 `glycopharm-forum-service-boundary` 정적 가드 1건은 공통 resolver 기준으로 갱신) |
| api-server typecheck | PASS |
| frontend | 프런트 소스 변경 0건 (KPA pin 은 백엔드 route 복구로 해소) |
| migration | 0 |

---

## 9. 잔존 위험

1. `packages/forum-core/src/admin-ui` 가 존재하지 않는 `/v1/forum/posts/:id/toggle-pin` · `toggle-lock` 을 호출한다 (dead call, 본 WO 제외 범위).
2. generic forum write 가 `platform:super_admin` 단일 역할로 좁혀졌다. platform admin 계층이 다시 늘어나면 guard 판정을 함께 조정해야 한다.
3. Pharmacy-Hub interaction UI 부재 (백엔드는 준비됨).
4. comment like 는 현재 구현 자체가 없다 (`NOT_IMPLEMENTED`).

---

## 10. Production 배포 · Browser/Runtime Smoke (§17)

- 배포: CI run `32201235885` success → `o4o-core-api` revision `o4o-core-api-03372-mpn`
- 브라우저 smoke (headless chromium, 비로그인 · mutation 0):

| 화면 | 결과 |
|---|---|
| KPA `/forum`, `/forum/all` | 정상 렌더 · JS error 0 · 4xx/5xx 0 · 게시글 3건(kpa-society) |
| Neture `/forum`, `/forum/posts` | 정상 렌더 · JS error 0 · 4xx/5xx 0 |
| Pharmacy-Hub `/forum`, `/forum/posts` | MembershipGate 로그인 안내 정상 노출 · JS error 0 · 4xx/5xx 0 |
| K-Cosmetics `/forum`, `/forum/posts` | 정상 렌더 · JS error 0 · 4xx/5xx 0 |
| GlycoPharm `/forum`, `/forum/posts` | 정상 렌더 · JS error 0 · 4xx/5xx 0 · 총 0건 |

- 타 서비스 데이터 혼입 0 (게시글 4건 전부 kpa-society, 타 서비스 목록에 미노출).
- API guard smoke (비인증, 상태 변경 없음): generic `POST /api/v1/forum/posts`, `PATCH /api/v1/forum/posts/:id/pin`, `POST /api/v1/forum/comments`, 서비스 `POST /api/v1/kpa/forum/posts/:id/like` 모두 `401 AUTH_REQUIRED`. 서비스 read (`/api/v1/kpa/forum/posts`, `/api/v1/neture/forum/posts`) `200`.
- production 에 대한 cross-service mutation 시도는 하지 않았다. cross-service 거부는 automated negative tests 로 증명한다.

---

## 11. 판정 집계

```
전체 모집단: 44
FULLY_COMMON: 24
CORE_ONLY: 0
VIEW_DUPLICATED: 0
SERVICE_SPECIFIC: 2
NOT_IMPLEMENTED: 2
OUT_OF_SCOPE: 16
미조사: 0
```

---

---

## 12. 2026-08-20 재조사 (WO 재실행 · 현재 main 기준)

> 동일 WO 가 다시 전달되어 **과거 census 를 구현 목록으로 재사용하지 않고** 현재 코드 기준으로 전수 재조사했다.
> 시작 commit `9897eef5b`.

### 12-1. 재조사 결과 — 백엔드 경계

| 축 | 현재 상태 | 판정 |
|---|---|---|
| canonical authorization 순서 (§3) | comment create/update/delete · post update/delete · like · pin 전부 `resolveForumPostInServiceScope` / `resolveForumCommentInServiceScope` → `assertForumWriteAccess` → ownership/override 순서 유지 | 유지 |
| 공통 helper 4종 | `ForumControllerBase` 에 그대로 존재, 서비스별 복붙·`if service === kpa` 분기 0건 | 유지 |
| generic `/api/v1/forum/*` write | `requireGenericForumWriteAdmin` (platform admin 전용) 유지 | 유지 |
| KPA pin remount · `PUT /comments/:id` | 유지 | 유지 |
| comment delete 재삭제 count 중복 차감 가드 | `alreadyDeleted` 가드 유지 | 유지 |

### 12-2. 신규 확정 결함 1건 — 대댓글 `parentId` 미검증

- **증상**: `createComment` 가 body 의 `parentId` 를 검증 없이 저장했다. post 는 service scope 안에서 해석되지만 parent 댓글은 어떤 게시글의 것이어도 통과 → **다른 서비스 게시글의 댓글에 답글을 붙일 수 있는 경계 누수**.
- **수정**: parent 를 조회해 `parent.postId !== post.id` 면 `404 PARENT_COMMENT_NOT_FOUND`. post 가 이미 scope 안에서 해석돼 있으므로 같은 게시글 검사만으로 경계가 닫힌다.
- **파일**: `apps/api-server/src/controllers/forum/ForumCommentController.ts`
- **회귀 테스트**: 2건 추가 (타 게시글 parent → 404 · 존재하지 않는 parent → 404 · 같은 게시글 parent → 201)

### 12-3. 의도된 비대칭 (수정하지 않음, §8)

- comment update/delete 의 override 는 `isPlatformAdmin` 단독인데, pin 은 **same-service operator** override 를 갖는다.
- pin 은 moderation action, comment 삭제는 타인 글 삭제 권한 확대라 **제품 결정**이다. §8 의 목표는 *우연한* 권한 누락 제거이므로 이 차이는 정책으로 보존하고 기록만 한다.

### 12-4. 프런트 adoption 재조사 — §6 표 갱신

§6 표(2026-08-19)는 **stale** 이다. 이후 트랙에서 5개 서비스 전부가 공통 부품을 소비하도록 정리됐다.

| 서비스 | 상세 화면 | `ForumLikeButton` | `ForumCommentForm` | `ForumCommentList` | 판정 |
|---|---|:--:|:--:|:--:|---|
| KPA | `ForumDetailPage.tsx` | O | O | O | FULLY_COMMON (+ pin = SERVICE_SPECIFIC) |
| Neture | `ForumPostPage.tsx` | O | O | O | FULLY_COMMON |
| Pharmacy-Hub | `ForumDetailPage.tsx` | O | O | O | FULLY_COMMON (기존 `NOT_IMPLEMENTED` 해소) |
| K-Cosmetics | `PostDetailPage.tsx` | O | O | O | FULLY_COMMON (기존 "read-only 유지" 무효) |
| GlycoPharm | `ForumPostDetailPage.tsx` | O | O | O | FULLY_COMMON |

- 서비스별 중복 댓글/좋아요 JSX **0건** — 재조사 시점에 이미 제거돼 있어 본 회차 View 재작성 0건 (§13 "backend 수정만 필요하면 억지로 View 를 재작성하지 않는다" 적용).
- KCos / GP 에 신규 write 버튼·endpoint 추가 0건 (§12) — 기존 adoption 확인만 했다.

### 12-5. 중복 제거 수치 (§19)

| 항목 | before | after |
|---|---:|---:|
| interaction backend handler | 8 | 8 (신규 0) |
| 공통 interaction component | 3 | 3 |
| 서비스별 중복 interaction JSX | 0 | 0 |
| 제거한 중복 라인 | — | 0 (이번 회차는 backend 경계 결함 1건 수정) |
| 잔존 `VIEW_DUPLICATED` | 0 | 0 |
| 잔존 `CORE_ONLY` | 0 | 0 |

### 12-6. Production 확인 (§17, read-only)

`cloud-sql-proxy` + `psql` 직접 접속은 이번에도 password 인증에 실패했다 (`apps/api-server/.env` 의 `DB_PASSWORD` 가 빈 값, 런타임 비밀번호는 Secret Manager 참조로 해석). 선례 `docs/checks/CHECK-O4O-CONTENT-RESOURCE-USAGE-TRACE-V1.md:84` 와 동일한 벽이며, 동일하게 **배포된 read-only API** 로 대체 확인했다. **write 시도 0건 · production 에 테스트 post/comment/like 생성 0건.**

| 항목 | 결과 (API 관측) |
|---|---|
| forum service_code × type | kpa-society open 1 / kpa-society closed 1 / neture open 1 · cosmetics·glycopharm·pharmacy-hub 0 |
| post 분포 | kpa-society 3 (전량, 단일 open forum) · 그 외 서비스 0 |
| pinned post | 0 |
| comment | 2 (전부 `postId` = 같은 kpa 게시글, orphan 0) |
| 대댓글(`parentId` 有) | 0 → 12-2 수정의 데이터 영향 없음 |
| cross-service post 조회 | KPA post id 를 neture/cosmetics/glycopharm/pharmacy-hub prefix 로 조회 → **전부 404** |
| cross-service comment 조회 | 동일 id 의 `/comments` → **전부 404** |
| closed forum 비로그인 조회 | `403 CLOSED_FORUM_ACCESS_DENIED` |

### 12-7. 검증 (§22)

| 항목 | 결과 |
|---|---|
| 본 spec | 27 passed (25 → +2) |
| api-server 전체 jest | **161 suites / 2,490 tests PASS** |
| api-server typecheck | PASS |
| frontend build 5종 (kpa-society · k-cosmetics · glycopharm · neture · pharmacy-hub) | 전부 exit 0 |
| migration | 0 |

### 12-8. 판정 집계 (재조사)

```
전체 모집단: 44
FULLY_COMMON: 27
CORE_ONLY: 0
VIEW_DUPLICATED: 0
SERVICE_SPECIFIC: 2   (KPA pin · generic admin write)
NOT_IMPLEMENTED: 1    (comment like)
OUT_OF_SCOPE: 14
미조사: 0
```

```
조사 interaction endpoint: 44
SERVICE_SCOPE_FIXED: 1        (comment parentId cross-post/cross-service)
CLOSED_FORUM_GAP_FIXED: 0     (기 수정분 유지 확인)
OWNERSHIP_GAP_FIXED: 0        (의도된 비대칭 1건 기록 보존)
VIEW_DUPLICATION_FIXED: 0     (재조사 시점 잔여 0)
```

> §9 잔존 위험 중 3번(Pharmacy-Hub interaction UI 부재)은 12-4 로 **해소**됐다. 1·2·4 번은 유지된다.



**이 CHECK 는 Forum Interaction / Write Boundary 축 기록이며, 커뮤니티 전체 공통화 완료를 의미하지 않는다.**
