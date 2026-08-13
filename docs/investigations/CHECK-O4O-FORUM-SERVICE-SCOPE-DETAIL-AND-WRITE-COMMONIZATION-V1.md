# CHECK — WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1

- **작업 브랜치**: `work/commonization-community` (base `b826bf797`)
- **일자**: 2026-08-13
- **상태**: 구현·정적 검증 완료 / 런타임 smoke 는 배포 후로 이월 (§9)
- **관련 WO**: `WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1`

---

## 1. Canonical 계약 (확정)

```
서비스 route (/api/v1/{service}/forum/*)
  → forumContextMiddleware({ serviceCode: <RBAC role prefix>, scope })
  → ForumContext.serviceCode                (= RBAC prefix, DB 값 아님)
  → resolveCanonicalServiceKey(prefix)      (@o4o/security-core · SSOT)
  → forum_category_requests.service_code    (canonical key)
  → applyContextFilter() / applyServiceScope()
```

- `kpa → kpa-society`, `cosmetics → k-cosmetics`, `pharmacy-hub` · `neture` · `glycopharm` 은 self-map.
- **forum 전용 매핑 테이블을 신설하지 않았다.** 변환은 `resolveCanonicalServiceKey()` 단일 경로만 사용한다.
  (근거: RBAC prefix ↔ canonical key 축 변환은 플랫폼 전역 문제이며, 로컬 사본을 두면 두 축이 어긋날 때
  forum 만 조용히 다른 값을 쓰게 된다.)
- **격리 축은 `forum_category_requests.service_code`** 다. `forum_post` 에는 service 컬럼이 없고,
  게시판(원장)이 서비스에 귀속되므로 글의 서비스 소속은 항상 게시판에서 파생된다.
  → 신규 컬럼·migration 없이 EXISTS 서브쿼리로 해결했다 (WO 제외 범위 준수).
- `ForumContext.serviceCode` 주석을 실제 의미(서비스 경계 키 = RBAC prefix, 없으면 격리 미적용)로 정정했다.

### 적용 위치

| 대상 | 방식 |
|---|---|
| `forum_post` 조회 (`ForumControllerBase.applyContextFilter`) | `applyServiceScope()` — `EXISTS (forum_category_requests …)` |
| 포럼 원장 조회 (`ForumDirectoryController.applyForumContextFilter`) | `alias.serviceCode = :ctxServiceKey` 직접 비교 |
| 포럼 단건 (`getForum`) | 타서비스 포럼은 `forum = null` → 기존 404 분기 재사용 |
| 인기 태그 (`getPopularTags`, raw SQL) | 파라미터 바인딩 EXISTS 조건 추가 |

**서비스 조건은 항상 scope 분기보다 먼저 AND 된다.** `applyContextFilter` 의 demo/community/organization
분기는 각각 `return` 하므로, 뒤에 두면 일부 경로에서 격리가 통째로 빠진다 (실제 함정).
기존 organization/scope 정책은 변경하지 않았다.

`ctx` 가 없는 generic/admin 경로(`/api/v1/forum/*`)는 **무필터 현행 유지**다.

---

## 2. 임시 계약 제거

| 제거 대상 | 위치 | 사유 |
|---|---|---|
| `req.query.serviceCode` 기반 EXISTS 필터 | `ForumPostController.listPosts()` | Boundary Policy Guard Rule 4 — serviceKey 는 URL 경로에서만 도출한다. 클라이언트 질의 파라미터는 스푸핑 가능 |
| `serviceCode` 질의 파라미터 + 클라이언트측 `filter(f => f.serviceCode === …)` | `services/web-pharmacy-hub/src/services/forumApi.ts` | 격리가 서버로 이관돼 불필요 |

임시 필터에는 `status = 'completed'` 조건이 함께 있었으나, **신규 `applyServiceScope()` 에는 넣지 않았다.**
임시 필터는 PharmacyHub 에만 적용됐지만 신규 조건은 KPA 를 포함한 전 서비스에 적용되므로,
`status` 조건을 그대로 옮기면 본 WO 범위 밖에서 KPA 노출 범위를 좁히게 된다.

---

## 3. 서비스별 mount 결과

| 서비스 | 경로 | context | 조치 |
|---|---|---|---|
| KPA | `/api/v1/kpa/forum/*` | `serviceCode:'kpa', scope:'community'` | 기존 mount 유지 (무변경 · 회귀 확인만) |
| GlycoPharm | `/api/v1/glycopharm/forum/*` | `serviceCode:'glycopharm', organizationId` | 기존 mount 유지 (무변경) |
| PharmacyHub | `/api/v1/pharmacy-hub/forum/*` | `serviceCode:'pharmacy-hub', scope:'community'` | **신규** + active membership write gate |
| Neture | `/api/v1/neture/forum/*` | `serviceCode:'neture', scope:'community'` | **신규** (write guard 없음 — 기존 쓰기 권한 불변) |
| K-Cosmetics | `/api/v1/cosmetics/forum/*` | `serviceCode:'cosmetics', scope:'community'` | **신규** (write guard 없음 — 동일) |

신규 3서비스는 `apps/api-server/src/routes/forum/service-forum.routes.ts` 의
`createServiceForumRouter()` 공통 팩토리를 사용한다 (서비스별 forum API 중복 구현 없음).

### operator / admin 제외 방법

`forum.routes.ts` 를 서비스 prefix 로 재마운트하지 않고, **커뮤니티 endpoint 만 담은 별도 팩토리**를 만들었다.
따라서 `/operator/*` · `/admin/*` · `/category-requests/*` 는 서비스 prefix 아래에 존재하지 않으며,
기존 공통 경로 `/api/v1/forum/...` 를 그대로 소비한다 (권한 계약 이중 적용 없음 · 계약 변경 없음).
프론트엔드에서도 `OPERATOR_BASE='/forum/operator'` · `ADMIN_BASE='/forum/admin'` ·
`/forum/category-requests` 는 손대지 않았다.

---

## 4. 조회 경로 격리 범위

`applyContextFilter()` 6개 호출자(모두 alias `'post'`)가 단일 seam 이므로 아래가 한 번에 격리된다.

- 게시글 목록 / `forumId` 없는 전체 목록 / 검색
- 최신 글 (`latest`)
- 상세 — UUID 조회 · slug 조회
- 댓글 목록의 부모 게시글 조회
- 통계 / 최근 활동

추가로 원장 조회(목록·단건·인기·내 포럼)와 인기 태그 raw SQL 을 별도 처리했다 (§1 표).

---

## 5. 쓰기 경계 (post write boundary)

| 메서드 | 조치 | 응답 |
|---|---|---|
| `createPost` | body `forumId` / `forumSlug` 로 해석된 게시판이 컨텍스트 서비스 소속인지 검사. `forumSlug` 해석 쿼리에도 `service_code` 조건 추가 | `403 FORUM_SERVICE_SCOPE_DENIED` |
| `updatePost` | 대상 글의 게시판 소속 검사 (기존 작성자/플랫폼관리자 규칙 **앞**) | `404 Post not found` |
| `deletePost` | 동일 | `404 Post not found` |

- update/delete 를 403 이 아닌 **404** 로 한 것은 타서비스 글의 존재 자체를 노출하지 않기 위해서다.
- 기존 작성자·플랫폼 관리자 규칙은 변경하지 않았다 (검사 순서만 앞에 추가).
- **폐쇄형 포럼 쓰기 가드 비대칭은 본 WO 에서 고치지 않았다** (WO 제외 범위) → §8 로 이월.

---

## 6. PharmacyHub 상세 · 작성

### 상세 (`/forum/posts/:postId`)

`services/web-pharmacy-hub/src/pages/forum/ForumDetailPage.tsx` (신규).
공통 부품만 사용: `ForumPostHeader` · `ForumPostContent` · `ForumDetailLoadingState` ·
`ForumDetailErrorState` · `ForumDetailNotFoundState` · `formatForumDate`.
**신규 `ForumDetailTemplate` 을 만들지 않았다** — 현재 KPA/Neture/KCos 상세는 각각 자체 레이아웃 +
공통 부품 조합이고 PharmacyHub 도 동일 조합으로 충분해 "실증된 중복" 이 없었다.

동선: `/forum` → `/forum/posts` → `/forum/posts/:postId`.
`ForumListPage.onPostClick` 이 `() => undefined` 였던 dead handler 를 상세로 연결했고,
목록 하단의 "상세·작성은 다음 단계" 안내문을 제거했다. **dead link 0.**

### 작성 (`/forum/write`)

`ForumWritePage.tsx` (신규) — 공통 `ForumWriteForm` 재사용 (신규 write 컴포넌트·에디터 도입 없음).
게시판 선택 select(기본값 = 첫 게시판, `?forum=` 쿼리 우선) + 제목 + 본문 + 검증/로딩/에러 +
성공 시 `/forum/posts/:id` 이동. `ForumHubPage` 의 CTA 를 `/forum/posts` → `/forum/write` 로 교정했다.

### 쓰기 게이트 위치와 근거

`requireActiveServiceMembership('pharmacy-hub')` 를 **route mount 단계**(`createServiceForumRouter` 의
`writeGuards`)에 적용했다. 판정 소스는 `membership-guard.middleware` 와 동일한 JWT `user.memberships`
이며 **role scope 를 요구하지 않는다** — 일반 회원도 커뮤니티에 글을 쓸 수 있어야 하기 때문이다.
컨트롤러가 아니라 mount 단계에 둔 이유는, 컨트롤러는 5개 서비스가 공유하므로 거기에 PharmacyHub
조건을 넣으면 다른 서비스의 쓰기 권한이 함께 바뀌기 때문이다 (WO 금지 사항).
프론트 `MembershipGate` 는 UX 안내이며 판정 근거가 아니다.

### PharmacyHub 수정(edit) — 제외 판정

**포함하지 않았다.** edit 는 (1) 작성자 판정 UI, (2) 기존 content HTML 역변환, (3) 목록/상세의 편집
진입점까지 함께 필요해 "자연히 붙는" 범위가 아니다. 다른 4서비스도 edit parity 가 제각각이라
공통화 대상이지 신규 추가 대상이 아니다. 후속 WO 로 이월한다 (§8).

---

## 7. K-Cosmetics · Neture 조정

프론트엔드 `forumApi.ts` 의 **커뮤니티 경로만** 서비스 컨텍스트 base 로 이관했다.

- Neture: `FORUM_BASE = '/neture/forum'` (posts / comments / categories 계열)
- K-Cosmetics: `FORUM_BASE = '/cosmetics/forum'` (동일 계열)
- **유지**: `/forum/category-requests*`, `OPERATOR_BASE='/forum/operator'`, `ADMIN_BASE='/forum/admin'`
- Neture 의 `contactSection` / `basePath` 는 손대지 않았다 (WO 제외 범위).
- 백엔드는 두 서비스 라우터에 `/forum` mount 를 추가했을 뿐, 기존 공통 `/api/v1/forum/*` 는 그대로 살아 있다
  → 미이관 소비처가 있어도 즉시 깨지지 않는다.

**전면 재작성으로 번지지 않았다** — 두 서비스 모두 API 경로가 `forumApi.ts` 한 파일에 집약돼 있어
base 상수 도입만으로 끝났다. WO 의 "분리 후 사유 기록" 조항은 발동하지 않았다.

---

## 8. 후속 이월

| 항목 | 이월 대상 |
|---|---|
| 폐쇄형 포럼 쓰기 가드 비대칭 | `WO-O4O-COMMUNITY-FORUM-INTERACTION-AND-WRITE-BOUNDARY-COMMONIZATION-V1` |
| 댓글 mutation · 좋아요 서비스 경계 | 동일 WO |
| `pinPost` 서비스 경계 미적용 | 동일 WO (현재 운영자 전용 경로라 노출도 낮음) |
| PharmacyHub 글 수정(edit) | 커뮤니티 공통화 후속 |

---

## 9. 검증 결과

### 정적 · 빌드

| 항목 | 결과 |
|---|---|
| `apps/api-server` `pnpm run type-check` (`tsc --noEmit`) | **PASS** |
| `pharmacy-hub-web` `tsc -b && vite build` | **PASS** |
| `@o4o/web-kpa-society` build | **PASS** |
| `@o4o/web-k-cosmetics` build | **PASS** |
| `@o4o/web-neture` build | **PASS** |
| `glycopharm-web` build | **PASS** |
| jest `market-trial-neture-forum-sync.spec` + `admin-api-guard-inventory.spec` | **PASS** (14 tests) |

### 프로덕션 DB 실측 (read-only · SELECT 만)

```
forum_category_requests :  kpa-society/completed 2 · neture/completed 1 · neture/rejected 1
forum_post              :  총 4건 — 전부 kpa-society 게시판 소속
                           forum_id IS NULL 0건 · organization_id IS NULL 4건
```

이 실측으로 확인된 사실:

1. **GlycoPharm · K-Cosmetics · PharmacyHub 는 forum 원장 행이 0건**이다.
   따라서 서비스 격리 도입으로 "기존에 보이던 글이 사라지는" 회귀는 **구조적으로 발생할 수 없다**
   (애초에 표시할 글이 없다). GP 무회귀 요건은 이 근거로 충족된다.
2. **`forum_id IS NULL` 게시글 0건** — 사전에 우려했던 "서비스 컨텍스트에서 영구히 보이지 않는 글"
   잠재 리스크는 현재 데이터에 존재하지 않는다.
3. KPA 게시글 4건 모두 `organization_id IS NULL` → `scope:'community'` 조건과 정합하며,
   `kpa → kpa-society` 변환이 실제 저장값과 일치한다.

### 런타임 smoke — 이월 (미실시)

본 WO 는 `work/commonization-community` 브랜치 작업이고 **main 직접 push·병합이 금지**돼 있어,
변경된 코드가 배포된 환경이 존재하지 않는다. 프로덕션 API 를 지금 호출하면 **변경 전 코드**를
검증하게 되므로 의미가 없다. 아래 항목은 **배포 후** 수행한다.

- KPA: list/detail 비어있지 않음 · scope=community 보존 · write/edit 무회귀
- PharmacyHub: list/detail/write 정상 · 타서비스 postId/slug/forumId 읽기 차단 ·
  타서비스 forumId/forumSlug write 차단 · 비회원/pending/rejected write 차단
- K-Cosmetics · Neture: 기존 list/detail/write 정상 · cross-service 차단 · operator/admin forum 무회귀
- GlycoPharm: 무회귀

교차 서비스 차단 시나리오는 현재 프로덕션 데이터로는 재현 자체가 불가능하다
(타서비스 게시글 0건). 배포 후 PharmacyHub 게시판 생성 → KPA postId 로 접근하는 순서로 확인한다.

---

## 10. 잔여 리스크

1. **런타임 미검증** (§9) — 정적 타입·빌드·DB 실측으로만 확인됐다. 배포 후 smoke 필요.
2. **Neture · K-Cosmetics 에 `scope:'community'` 신규 부여** — 이전에는 컨텍스트가 아예 없었다.
   조직 스코프 글이 있었다면 숨겨질 수 있으나, 실측상 두 서비스의 게시글은 0건이라 현재 영향 없음.
   향후 조직 포럼을 쓰기 시작하면 scope 정책을 다시 판단해야 한다.
3. **`pinPost` · `forumId` 없는 `createPost`** 는 서비스 경계 미적용 (§8 이월).
4. 미이관 소비처가 남아 있어도 공통 `/api/v1/forum/*` 가 살아 있어 즉시 장애는 아니지만,
   그 경로는 **격리되지 않는다**. 공통 경로의 최종 처리는 커뮤니티 마감 감사에서 판단한다.

---

## 11. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 — **해당 없음**.
