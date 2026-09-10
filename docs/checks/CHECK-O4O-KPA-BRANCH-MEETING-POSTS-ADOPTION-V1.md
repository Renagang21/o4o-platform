# CHECK — 분회 회의 기록을 기존 branch_events + branch_posts 로 수용 (W11-B)

- **WO**: `WO-O4O-KPA-BRANCH-MEETING-POSTS-ADOPTION-V1`
- **일자**: 2026-09-10
- **판정**: **CLOSED** — 조사 + migration + 기존 UI/API 최소 확장 + 프로덕션 E2E 12항목 + 브라우저 smoke + fixture 전량 원복
- **선행**: [W11-A 임원·위원회 명부](CHECK-O4O-KPA-BRANCH-OFFICER-ROSTER-V1.md) · [W10 행사·참가 응답](CHECK-O4O-KPA-BRANCH-EVENTS-AND-RSVP-V1.md) · 설계 근거 `docs/ir/IR-O4O-KPA-BRANCH-ORGANIZATION-AND-MEETING-MINIMAL-MODEL-V1.md`
- **commit**: `b111ada24` (migration + entity + 회원 라우트 + 공개/회원/운영자 UI) · `798952513` (생성 경로 category 검증 결함 수정) · 본 CHECK 는 후속 커밋
- **환경**: 프로덕션 (`https://api.neture.co.kr/api/v1` · DB `o4o_platform` · 공개 `https://kpa-society.co.kr/kpa/namgu`)

> **본 CHECK 의 수치는 2026-09-10 프로덕션에서 실제로 측정한 값이다.** 추정으로 채운 칸은 없다.
> **신규 meeting 테이블은 만들지 않았다.** 신규 테이블 0 · 신규 컬럼 0 · 신규 entity 0.

---

## 0. 결과 요약 (WO §9 E2E 12항목)

| # | E2E 항목 | 결과 |
|:--:|---|:---:|
| 1 | meeting 게시글 생성 | ✅ 201 · `category='meeting'` 저장 |
| 2 | draft / 게시 상태 | ✅ draft 는 회원 목록 0건 → publish 후 1건 |
| 3 | meeting category 저장 | ✅ DB 실측 `category='meeting'` |
| 4 | notice / resource 회귀 | ✅ 회귀 0 — 공개 목록 2건(공지·자료) 정상 |
| 5 | 첨부자료 유지 | ✅ `attachments` jsonb 왕복 보존 |
| 6 | 회원 조회 | ✅ `GET /branches/:slug/me/posts` 3건 (notice·resource·meeting) |
| 7 | 타 분회 접근 차단 | ✅ 회원 403 `BRANCH_SCOPE_MISMATCH` · 타 분회 경로로 자기 postId PATCH → 404 `BRANCH_POST_NOT_FOUND` |
| 8 | operator write / member write 차단 | ✅ 운영자 201 · 회원의 operator write·list 403 FORBIDDEN · 미인증 401 `AUTH_REQUIRED` |
| 9 | `branch_events` 와 독립 저장 | ✅ §4 — 두 테이블 사이 FK 0 · 참조 컬럼 0 · 일정 중복 저장 0 |
| 10 | 기존 `branch_posts` 데이터 불변 | ✅ baseline 0행 → 검증 4행 → 원복 후 0행 |
| 11 | 브라우저 목록/상세 smoke | ✅ §7 (공개 · 회원 · 운영자 3계층) |
| 12 | fixture 원복 | ✅ §8 — 전 항목 0 복귀 |

추가로 확인한 계약 항목:

| 항목 | 결과 |
|---|:---:|
| 공개 목록에 meeting 노출 | ✅ 노출되지 않음 (`PUBLIC_CATEGORIES = notice, resource`) |
| 공개 `?category=meeting` | ✅ 422 `INVALID_CATEGORY` (조용한 빈 목록 아님) |
| 목록·생성·수정 3경로의 잘못된 category | ✅ 전부 422 `INVALID_CATEGORY` (커밋 `798952513`) |
| 운영자 `?category=meeting` 필터 | ✅ 1건 |
| 한글 본문 왕복 | ✅ 보존 |

---

## 1. 기존 `branch_posts` 구조 (WO §1·§3 조사 결과)

프로덕션 실측 컬럼 14개 — **meeting 을 위해 추가한 컬럼은 없다.**

```
id · organization_id · category · title · content · attachments(jsonb)
is_pinned · status · published_at · author_user_id · view_count
deleted_at · created_at · updated_at
```

- 회의록 본문 = `content` · 회의자료 = `attachments` · 게시 상태 = `status` + `published_at`
- 작성자 = `author_user_id` · 분회 경계 = `organization_id` (FK `FK_branch_posts_organization` → `kpa_organizations`)
- soft delete 구조(`deleted_at`)이므로 검증 fixture 원복은 물리 DELETE 로 수행했다(§8)

### visibility 계약 (WO §5)

**`branch_posts` 에는 visibility 컬럼이 없다.** 즉 기존 구조는 public-only 이고, 회원 전용 조회 라우트도 없었다.

WO §5 의 "기존이 public-only 구조면 새 visibility 시스템을 억지로 만들지 말라" 는 지침에 따라
**컬럼도 enum 도 추가하지 않고, 노출 범위를 라우트 단위로 갈랐다.**

| 라우트 | 허용 category | 가드 |
|---|---|---|
| `GET /branches/:slug/posts` (공개) | `notice`, `resource` | 없음 |
| `GET /branches/:slug/me/posts` (신규) | `notice`, `resource`, `meeting` | 회원 가드 |
| `GET /branches/:slug/operator/posts` | `notice`, `resource`, `meeting` | `kpa-branch:operator` |

결과적으로 **회의록은 회원 기본 노출**(WO §5 권고)이 되고, 공개 화면에는 어떤 경로로도 나오지 않는다.

---

## 2. category migration (WO §2)

`apps/api-server/src/database/migrations/20270401000000-ExtendBranchPostsCategoryMeeting.ts`

```sql
ALTER TABLE "branch_posts" DROP CONSTRAINT IF EXISTS "CHK_branch_posts_category";
ALTER TABLE "branch_posts" ADD CONSTRAINT "CHK_branch_posts_category"
  CHECK ("category" IN ('notice','resource','meeting'));
```

프로덕션 적용 실측:

```
pg_get_constraintdef → CHECK (category = ANY (ARRAY['notice','resource','meeting']))
typeorm_migrations   → ExtendBranchPostsCategoryMeeting20270401000000 등재
```

- `down()` 은 `('notice','resource')` 로 복원한다. meeting 행이 남아 있으면 실패하는데, 이는 올바른 신호로 의도한 것이다.
- 기존 notice / resource 데이터 불변 — 제약 확장은 값 변경을 수반하지 않는다.

---

## 3. UI 변경 (WO §4·§7)

**새 회의 전용 편집기는 만들지 않았다.** 기존 posts 화면만 확장했다.

| 파일 | 변경 |
|---|---|
| `services/web-kpa-branch/src/pages/operator/PostsAdminPage.tsx` | 분류 select 에 `회의` 추가 · 목록 배지를 `CATEGORY_LABEL` 로 통일 · meeting 선택 시 "회의 일정·장소·참석은 «행사»에서 관리합니다" 안내 |
| `services/web-kpa-branch/src/pages/BranchPostsPage.tsx` | `scope` prop(`public` / `member`, 기본 public) 추가 · meeting 라벨/배지 · 목록 행 분류 배지 |
| `services/web-kpa-branch/src/App.tsx` | `meetings` 라우트 = `BranchPostsPage category="meeting" scope="member"` |
| `services/web-kpa-branch/src/layouts/BranchLayout.tsx` | 로그인 회원 nav 에 `회의록` 추가 (**공개 메뉴 아님**) |
| `services/web-kpa-branch/src/lib/api/branch.ts` | `BranchPostCategory` 에 `meeting` · `getMemberPosts()` |

배지는 WO §7 의 "최소 badge" 그대로 `공지` / `자료` / `회의` 3종이다. 신규 필터 UI 는 만들지 않았고, 운영자 화면에 이미 있던 분류 필터에 `회의` 만 한 칸 더했다.

---

## 4. `branch_events` 와의 경계 (WO §6·§9-9)

프로덕션 실측:

```
FK 조사 → branch_posts 의 FK 는 FK_branch_posts_organization 하나뿐
          branch_events 를 참조하는 컬럼·FK 0
          branch_events → branch_posts 참조도 0
          (branch_events 를 참조하는 것은 FK_branch_event_rsvps_event 뿐)
```

같은 회의("2026년 9월 정기이사회")에 대해 두 축을 각각 만들어 측정했다.

| 축 | 테이블 | 담은 것 |
|---|---|---|
| 일정·장소·참석 | `branch_events` (+ `branch_event_rsvps`) | `starts_at=2026-09-20T10:00Z` · `location='분회 회의실'` · `rsvp_enabled=true` |
| 회의록·회의자료 | `branch_posts` (`category='meeting'`) | `title` · `content` · `attachments` |

- 회의 일정이 `branch_posts` 에 중복 저장되지 않았다 — post 행에는 일시·장소 컬럼 자체가 없다.
- 두 축을 한 row 로 합치지 않았다.
- 회의 ↔ 행사 연결은 WO §3 대로 **V1 에서 DB FK 로 만들지 않았다.** 필요하면 본문/링크로 참조한다.
- 운영자 화면의 meeting 안내 문구가 이 경계를 화면에서도 말해 준다(§3).

---

## 5. 권한 / tenant (WO §8)

| 규칙 | 구현 |
|---|---|
| organizationId primary | 모든 조회·수정 쿼리에 `organization_id = req.branch!.id` |
| operator·admin 만 작성·수정 | `requireBranchScope('kpa-branch:operator')` |
| member 는 자기 분회 범위 조회 | 신규 `/me/posts` 는 회원 가드 + 자기 분회 필터 |
| 타 분회 postId 접근 차단 | 타 분회 경로로 자기 postId PATCH → **404 `BRANCH_POST_NOT_FOUND`** |
| body organizationId 신뢰 금지 | body 를 읽지 않고 slug→branch 미들웨어 결과만 사용 |
| UUID 단독 조회 금지 | `WHERE id = :id AND organization_id = :orgId` 복합 조건 (CLAUDE.md §7 Guard 1) |

### 관찰 — super_admin 우회 (범위 밖, W11-A 와 동일 사실)

`requireBranchScope` 는 `isBranchServiceAdmin`(= `kpa-branch:admin` 또는 `platform:super_admin`)을 통과시킨다.
따라서 `platform:super_admin` 보유 계정으로 타 분회 운영자 경로를 부르면 403 이 아니라 **200 / 0건**이다.
경계 자체는 `organization_id` 필터와 404 로 유지되므로 데이터 누출은 없다. 이 동작의 변경은 본 WO 범위 밖이다.

---

## 6. E2E 실측 (프로덕션)

fixture: 운영자 1 · 회원 1 (namgu = `ba1e90a6-…`), 게시글 4행.

| 요청 | 결과 |
|---|---|
| `POST /branches/namgu/operator/posts` (meeting, draft) | 201 · `category='meeting'` |
| 회원 `/me/posts?category=meeting` (draft 상태) | 200 · **0건** |
| `PATCH .../posts/:id` (status=published) | 200 |
| 회원 `/me/posts?category=meeting` (게시 후) | 200 · **1건** |
| 공개 `/branches/namgu/posts` | 200 · **2건** (notice·resource — meeting 제외) |
| 공개 `/branches/namgu/posts?category=meeting` | **422 `INVALID_CATEGORY`** |
| 회원 `/branches/namgu/me/posts` | 200 · **3건** |
| 회원 → 타 분회 `/branches/bukgu/me/posts` | **403 `BRANCH_SCOPE_MISMATCH`** |
| 타 분회 경로로 자기 postId PATCH | **404 `BRANCH_POST_NOT_FOUND`** |
| 회원 → operator write / list | **403 FORBIDDEN** |
| 미인증 → `/me/posts` | **401 `AUTH_REQUIRED`** |
| 운영자 `/operator/posts?category=meeting` | 200 · **1건** |
| 잘못된 category(`minutes`) 목록 / 생성 / 수정 | **전부 422 `INVALID_CATEGORY`** |
| 첨부자료 · 한글 본문 왕복 | 보존 |

### 검증 중 확정한 결함 1건 (수정 완료)

`createPost` 만 알 수 없는 category 를 조용히 `'notice'` 로 강등시켜, `category='minutes'` 요청이 **201 로 notice 저장**됐다.
목록·수정 경로는 이미 422 였으므로 계약이 세 경로에서 갈렸다. 커밋 `798952513` 에서 생성 경로도 같은 422 계약으로 통일했고,
재배포 후 동일 요청이 `422 INVALID_CATEGORY` 로 바뀐 것을 실측했다.

---

## 7. 브라우저 smoke (WO §9-11)

프로덕션 `https://kpa-society.co.kr` · Playwright · 3계층.

| 화면 | 확인 |
|---|---|
| 공개 `/kpa/namgu` · `/notices` · `/resources` (비로그인) | nav = 홈 · 공지 · 자료실 · 임원·위원회 — **회의록 메뉴 없음**. 공지 1건(배지 `공지`) · 자료실 1건(배지 `자료`) · meeting 미노출 |
| 회원 `/kpa/namgu/meetings` | nav 에 `회의록` 추가 · 목록에 `회의` 배지 + "2026년 9월 정기이사회 회의록" 1건 |
| 회원 `/kpa/namgu/notices` | 회귀 없음 — 공지 1건 그대로 |
| 운영자 `/kpa/namgu/operator/posts` | 분류 필터 `공지 / 자료실 / 회의` · 목록 4행이 각각 `공지`·`자료실`·`회의` 배지로 표시 · 게시/내리기/삭제 동작 노출 |

---

## 8. fixture 원복 (WO §9-12)

`branch_posts` 는 soft delete 구조이므로 물리 DELETE 로 원복했다. **이번에 만든 row id 만** 삭제했다.

| 대상 | 삭제 |
|---|:--:|
| `branch_posts` 4행 | 4 |
| `branch_events` 1행 (경계 검증용) | 1 |
| `branch_event_rsvps` | 0 |
| `branch_memberships` `f11b0000-…0007/0008` | 2 |
| `role_assignments` `…0005/0006` | 2 |
| `service_credentials` `…0003/0004` | 2 |
| `service_memberships` `…0001/0002` | 2 |

원복 후 실측:

```
branch_posts 0 · branch_events 0 · branch_event_rsvps 0
f11b0000 접두 잔여 0
service_memberships 36 · role_assignments 69   (검증 전과 동일)
```

migration 으로 확장한 `CHK_branch_posts_category` 는 산출물이므로 유지된다(fixture 아님).

---

## 9. 범위 밖 (WO §10 — 손대지 않았다)

별도 `meetings` 테이블 · 의결/투표 · 전자결재 · 회의 참석 체크(참석은 기존 `branch_event_rsvps` 축) ·
Zoom·Meet 회의 생성 · 회의록 자동 요약 · 회의↔행사 FK · 조직별 회의 권한 세분화.

`requireBranchScope` 의 `platform:super_admin` 우회(§5)도 범위 밖으로 두고 기록만 남긴다.
