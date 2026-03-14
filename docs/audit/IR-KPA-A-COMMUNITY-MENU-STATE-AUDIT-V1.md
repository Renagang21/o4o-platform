# IR-KPA-A-COMMUNITY-MENU-STATE-AUDIT-V1

> **Investigation Request**: KPA-a Community 메뉴 존재 여부 및 현재 구현 상태 조사
> **Status**: COMPLETE
> **Date**: 2026-03-14
> **Scope**: KPA-a Menu · Forum Pages · Backend API · Data Structure · O4O Standard GAP

---

## 1. Executive Summary

KPA-a 서비스의 Community/Forum 구조를 전수 조사한 결과, **Forum/Community 기능이 완전 구현**되어 있다.

| 영역 | 판정 | 비고 |
|------|------|------|
| 메뉴 구조 | **ACTIVE** | Header에 "포럼" 메뉴, Branch에 "커뮤니티" 메뉴 |
| Forum 페이지 (Main) | **ACTIVE** | Home + List + Detail + Write (4페이지, API 연동) |
| Forum 페이지 (Branch) | **ACTIVE** | List + Detail + Write (3페이지, API 연동) |
| Operator 관리 페이지 | **ACTIVE** | 카테고리 승인 관리 + 포럼 분석 대시보드 |
| Admin 관리 페이지 | **PARTIAL** | UI 존재, Mock Data 사용 |
| CommunityHomePage | **ACTIVE** | 홈 페이지에 Forum 통합 (공지, 최근 글, 활동) |
| Forum 컴포넌트 | **ACTIVE** | Hub + Activity + Category + Info + WritePrompt |
| Backend API | **ACTIVE** | ~20 엔드포인트, CRUD + 좋아요 + 댓글 + 검색 |
| Forum Core (APP-FORUM) | **ACTIVE (Frozen)** | 5개 테이블, Entity + Service + QueryService |
| Forum Request 승인 | **ACTIVE** | KPA 확장 — 카테고리 생성 승인 워크플로 |
| O4O 표준 준수 | **COMPLIANT** | @o4o/forum-core + @o4o/types/forum 사용 |

**종합 판정: FULLY ACTIVE** — KPA-a의 Community/Forum은 O4O 표준 구조를 기반으로 완전 구현되어 있다. 새로 만들 필요 없이 **이미 운영 가능한 상태**이다.

---

## 2. KPA-a 정체 확인

### 핵심 발견

**KPA-a는 별도 서비스가 아니다.** `kpa-society-web` 서비스 내의 **커뮤니티 서비스(Community Service)** 영역이다.

KPA Society 도메인의 3개 서비스 구조 (참조: `docs/baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md`):

| 서비스 | 설명 | 상태 | Forum Scope |
|--------|------|------|-------------|
| **커뮤니티 서비스 (KPA-a)** | 약사/학생 커뮤니티 | **유지** | `community` (organizationId IS NULL) |
| **분회 서비스 (KPA-c)** | 지역 분회 운영 | **유지** | `organization` (organizationId = 특정 분회) |
| **데모 서비스 (KPA-b)** | 테스트/데모 | **제거 예정** | `demo` (빈 결과 반환) |

**중요**: 라우트 위치 ≠ 서비스 소속. `/forum` 경로의 Forum은 커뮤니티 서비스의 기능이다.

---

## 3. 메뉴 구조

### 3.1 Main Header

**파일**: `services/web-kpa-society/src/components/Header.tsx`

| 메뉴 | 경로 | 비고 |
|------|------|------|
| 홈 | `/` | 메인 |
| **포럼** | `/forum` | Community Forum 진입 |
| 강의 | `/lms` | LMS |
| 콘텐츠 | `/content` | CMS |
| 운영자 대시보드 | `/operator` | Operator |
| 테스트 센터 | — | 우측 정렬 |

### 3.2 Branch Header

**파일**: `services/web-kpa-society/src/components/branch/BranchHeader.tsx`

| 메뉴 | 경로 | 하위 메뉴 |
|------|------|----------|
| 홈 | `{basePath}` | — |
| 소식 | `{basePath}/news` | 공지사항, 분회 소식, 갤러리 |
| 자료 | `{basePath}/docs` | — |
| **커뮤니티** | `{basePath}/forum` | 전체 글, 글쓰기 |
| 소개 | `{basePath}/about` | — |

**결론**: 메인 헤더에 "포럼", Branch 헤더에 "커뮤니티" 메뉴가 **존재한다.**

---

## 4. Frontend 페이지 구조

### 4.1 Main Forum 페이지 (4개)

**디렉토리**: `services/web-kpa-society/src/pages/forum/`

| 페이지 | 파일 | 경로 | 판정 |
|--------|------|------|------|
| Forum Home | `ForumHomePage.tsx` | `/forum` | **ACTIVE** |
| Forum List | `ForumListPage.tsx` | `/forum/all` | **ACTIVE** |
| Forum Detail | `ForumDetailPage.tsx` | `/forum/post/:id` | **ACTIVE** |
| Forum Write | `ForumWritePage.tsx` | `/forum/write`, `/forum/edit/:id` | **ACTIVE** |

#### ForumHomePage 화면 구조

| 섹션 | 존재 | 설명 |
|------|------|------|
| Hero | **YES** | "약사회 포럼" 타이틀 + 배경 |
| Forum Hub (카테고리 카드) | **YES** | ForumHubSection — 서버 집계 카테고리 |
| Forum Activity | **YES** | ForumActivitySection — 카테고리별 최근 활동 |
| Forum Category | **YES** | ForumCategorySection — 카테고리 탭 + 글 목록 |
| Write Prompt | **YES** | ForumWritePrompt — 글쓰기 CTA |
| Info Section | **YES** | ForumInfoSection — 이용 안내 + 빠른 링크 |
| Ads | NO | — |
| Videos | NO | — |
| Resources | NO | 별도 자료실 경로 존재 |

#### ForumListPage 기능

- Phase 22-F 테이블 형태, 10개 페이지네이션
- 컬럼: 카테고리 | 제목 | 작성자 | 날짜 | 좋아요 | 조회 | 댓글
- 검색, 카테고리 필터, 활성 필터 표시
- **API**: `forumApi.getPosts()` — 실 API 호출

#### ForumDetailPage 기능

- ForumBlockRenderer (`@o4o/forum-core/public-ui`) 사용
- 좋아요, 댓글 작성/목록
- 인증 기반 수정/삭제 버튼
- **API**: `forumApi.getPost(id)`, `forumApi.getComments(id)` — 실 API 호출

#### ForumWritePage 기능

- RichTextEditor (`@o4o/content-editor`) 사용
- `htmlToBlocks`, `blocksToHtml` (`@o4o/forum-core/utils`)
- 제목, 카테고리 선택, 본문 에디터
- 생성/수정 모드 지원
- **API**: `forumApi.createPost()`, `forumApi.updatePost()` — 실 API 호출

### 4.2 Branch Forum 페이지 (3개)

**디렉토리**: `services/web-kpa-society/src/pages/branch/`

| 페이지 | 파일 | 경로 | 판정 |
|--------|------|------|------|
| Branch Forum List | `BranchForumListPage.tsx` | `/branch-services/:branchId/forum` | **ACTIVE** |
| Branch Forum Detail | `BranchForumDetailPage.tsx` | `/branch-services/:branchId/forum/post/:id` | **ACTIVE** |
| Branch Forum Write | `BranchForumWritePage.tsx` | `/branch-services/:branchId/forum/write` | **ACTIVE** |

- BranchContext에서 branchId 사용
- **API**: `branchApi.getForumPosts()`, `branchApi.getForumPostDetail()` — 실 API 호출

### 4.3 Operator 관리 페이지 (2개)

**디렉토리**: `services/web-kpa-society/src/pages/operator/`

| 페이지 | 파일 | 경로 | 판정 |
|--------|------|------|------|
| Forum Management | `ForumManagementPage.tsx` | `/operator/forum-management` | **ACTIVE** |
| Forum Analytics | `ForumAnalyticsDashboard.tsx` | `/operator/forum-analytics` | **ACTIVE** |

- Forum Management: 카테고리 생성 요청 승인/반려/수정요청 워크플로
- Forum Analytics: KPI (포럼 수, 활성 포럼, 7일 게시글/댓글), Top 5 활성, 비활성 목록
- **API**: `apiClient` for forum-requests, `operatorApi.getForumAnalytics()` — 실 API 호출

### 4.4 Admin 관리 페이지 (2개)

| 페이지 | 파일 | 판정 |
|--------|------|------|
| ForumPage (HQ/Division) | `pages/admin-branch/ForumPage.tsx` | **PARTIAL** (Mock Data) |
| ForumManagementPage (Branch) | `pages/branch-admin/ForumManagementPage.tsx` | **PARTIAL** (Mock Data) |

### 4.5 CommunityHomePage

**파일**: `services/web-kpa-society/src/pages/CommunityHomePage.tsx`
**경로**: `/` (메인 홈페이지)
**판정**: **ACTIVE**

| 섹션 | 설명 |
|------|------|
| HeroSection | KPA Community 배지 + 타이틀 |
| NoticeSection | 공지사항 (CMS) |
| ActivitySection | 최근 Forum 글 + 주요 콘텐츠 |
| SignageSection | 디지털 사이니지 |
| CommunityServiceSection | 2x2 서비스 그리드 (포럼, 교육, 이벤트, 자료실) |
| UtilitySection | 유틸리티 링크 |

- `homeApi.prefetchAll()` 병렬 API 호출
- **API**: 공지 + 커뮤니티 글 + 사이니지 — 실 API 호출

---

## 5. Forum 컴포넌트

**디렉토리**: `services/web-kpa-society/src/components/forum/`

| 컴포넌트 | 파일 | 설명 |
|---------|------|------|
| ForumHubSection | `ForumHubSection.tsx` | 카테고리 카드 그리드 (멤버 수, 최근 활동, 정렬 탭) |
| ForumActivitySection | `ForumActivitySection.tsx` | 카테고리별 글 목록 (최신/인기/추천 서버 정렬) |
| ForumCategorySection | `ForumCategorySection.tsx` | 카테고리 탭 + 글 목록 |
| ForumInfoSection | `ForumInfoSection.tsx` | 이용 안내 + 빠른 링크 |
| ForumWritePrompt | `ForumWritePrompt.tsx` | 글쓰기 CTA |
| ForumQuickActions | `ForumQuickActions.tsx` | 빠른 액션 버튼 |

**Home 컴포넌트**: `services/web-kpa-society/src/components/home/`

| 컴포넌트 | 설명 |
|---------|------|
| ActivitySection | 최근 포럼 글 (2/3) + 주요 콘텐츠 (1/3) |
| RecentForumPosts | 최근 3-5개 글, "포럼에서 소통하기 →" 링크 |
| CommunityServiceSection | 2x2 서비스 그리드 (포럼, 교육, 이벤트, 자료실) |

---

## 6. Frontend API 클라이언트

**파일**: `services/web-kpa-society/src/api/forum.ts`
**Base Path**: `/api/v1/kpa/forum`

| Method | 엔드포인트 | 함수 |
|--------|----------|------|
| GET | `/forum/categories` | `forumApi.getCategories()` |
| GET | `/forum/posts` | `forumApi.getPosts({categoryId, page, limit, search})` |
| GET | `/forum/posts/:id` | `forumApi.getPost(id)` |
| POST | `/forum/posts` | `forumApi.createPost(data)` |
| PUT | `/forum/posts/:id` | `forumApi.updatePost(id, data)` |
| DELETE | `/forum/posts/:id` | `forumApi.deletePost(id)` |
| POST | `/forum/posts/:id/like` | `forumApi.likePost(id)` |
| GET | `/forum/posts/:postId/comments` | `forumApi.getComments(postId)` |
| POST | `/forum/posts/:postId/comments` | `forumApi.createComment(postId, content, parentId)` |
| DELETE | `/forum/posts/:postId/comments/:commentId` | `forumApi.deleteComment(postId, commentId)` |

**모두 실 API 호출** — Mock Data 없음.

---

## 7. Backend API 구조

### 7.1 Forum Core 엔드포인트

**파일**: `apps/api-server/src/routes/kpa/kpa.routes.ts` (Lines 330-376)

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/forum/health` | — | 헬스체크 |
| GET | `/forum/stats` | — | 통계 |
| GET | `/forum/posts` | optionalAuth | 글 목록 (검색/필터/페이지네이션) |
| GET | `/forum/posts/:id` | optionalAuth | 글 상세 (UUID/slug) |
| POST | `/forum/posts` | requireAuth | 글 작성 |
| PUT | `/forum/posts/:id` | requireAuth | 글 수정 (작성자/관리자) |
| DELETE | `/forum/posts/:id` | requireAuth | 글 삭제 (소프트 아카이브) |
| POST | `/forum/posts/:id/like` | requireAuth | 좋아요 토글 |
| GET | `/forum/posts/:postId/comments` | optionalAuth | 댓글 목록 |
| POST | `/forum/comments` | requireAuth | 댓글 작성 |
| GET | `/forum/categories` | — | 카테고리 목록 |
| GET | `/forum/categories/:id` | — | 카테고리 상세 |
| POST | `/forum/categories` | kpa:admin | 카테고리 생성 |
| PUT | `/forum/categories/:id` | kpa:admin | 카테고리 수정 |
| DELETE | `/forum/categories/:id` | kpa:admin | 카테고리 삭제 |
| GET | `/forum/moderation` | kpa:operator | 모더레이션 큐 |
| POST | `/forum/moderation/:type/:id` | kpa:operator | 모더레이션 처리 |

### 7.2 Forum Request 승인 워크플로 (KPA 확장)

**Controller**: `apps/api-server/src/routes/kpa/controllers/forum-request.controller.ts`
**Service**: `apps/api-server/src/routes/kpa/services/forum-request.service.ts`

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| POST | `/forum-requests` | requireAuth | 카테고리 생성 요청 |
| GET | `/forum-requests/my` | requireAuth | 내 요청 목록 |
| GET | `/forum-requests/:id` | requireAuth | 요청 상세 |
| GET | `/forum-requests` | kpa:operator | 전체 요청 목록 |
| GET | `/branches/:branchId/forum-requests/pending` | branchAdmin | 분회 대기 요청 |
| PATCH | `/branches/:branchId/forum-requests/:id/approve` | branchAdmin | 승인 → forum_category 생성 |
| PATCH | `/branches/:branchId/forum-requests/:id/reject` | branchAdmin | 반려 |
| PATCH | `/branches/:branchId/forum-requests/:id/request-revision` | branchAdmin | 수정 요청 |

**트랜잭션**: 승인 시 `kpa_approval_requests` 상태 변경 + `forum_category` 레코드 생성이 원자적으로 처리됨.

### 7.3 Forum Context Middleware

**파일**: `apps/api-server/src/middleware/forum-context.middleware.ts`

```
Community Forum: serviceCode='kpa', scope='community' → organizationId IS NULL
Demo Forum:      serviceCode='kpa-demo', scope='demo' → 빈 결과 반환
Branch Forum:    scope='organization' → organizationId = 특정 분회
```

Scope 격리를 통해 커뮤니티 글과 분회 글, 데모 글이 섞이지 않음.

---

## 8. 데이터 구조

### 8.1 Forum Core 테이블 (APP-FORUM Frozen)

**패키지**: `packages/forum-core/`
**마이그레이션**: `packages/forum-core/src/migrations/`

| 테이블 | 주요 컬럼 | 설명 |
|--------|----------|------|
| `forum_category` | id, name, slug, sortOrder, isActive, requireApproval, accessLevel, postCount, organizationId | 포럼 카테고리 |
| `forum_post` | id, title, slug, content(JSONB), type, status, categoryId, authorId, organizationId, viewCount, commentCount, likeCount | 게시글 |
| `forum_comment` | id, content, postId, authorId, parentId, status, likeCount, replyCount | 댓글 (대댓글 지원) |
| `forum_tag` | id, name, postCount | 태그 |
| `forum_like` | id, postId, userId (unique composite) | 좋아요 |
| `forum_bookmark` | — | 북마크 |

### 8.2 KPA 확장 테이블

| 테이블 | 주요 컬럼 | 설명 |
|--------|----------|------|
| `kpa_approval_requests` | id, entity_type, organization_id, payload(JSONB), status, requester_id, reviewed_by, result_entity_id | 승인 요청 (forum_category 생성 포함) |

### 8.3 Yaksa Community 확장

| 테이블 | 주요 컬럼 | 설명 |
|--------|----------|------|
| `yaksa_forum_community` | id, name, type(personal/branch/division/global), ownerUserId, organizationId | 약사 커뮤니티 타입 |

---

## 9. O4O 표준 준수 분석

### 9.1 Core 패키지 사용

| 패키지 | 사용 여부 | 비고 |
|--------|----------|------|
| `@o4o/forum-core` Entity | **YES** | ForumPost, ForumCategory, ForumComment |
| `@o4o/forum-core/public-ui` | **YES** | ForumBlockRenderer (Detail 페이지) |
| `@o4o/forum-core/utils` | **YES** | htmlToBlocks, blocksToHtml (Write 페이지) |
| `@o4o/types/forum` | **YES** | ForumPostResponse, ForumCategoryResponse 등 |
| `@o4o/content-editor` | **YES** | RichTextEditor (Write 페이지) |
| ForumQueryService | **YES** | 공유 쿼리 레이어 사용 |
| ForumController | **YES** | 표준 CRUD 컨트롤러 사용 |

### 9.2 APP-FORUM Baseline 준수

APP-FORUM은 Frozen Baseline (CLAUDE.md Section 12):
- ForumQueryService 호출 + 설정만 허용
- Raw SQL/중복 로직/서비스별 UI 분기 금지
- **KPA-a는 이 규칙을 준수하고 있음**

### 9.3 Boundary Policy 준수

- organizationId 기반 Scope 격리 적용
- ForumContext middleware로 쿼리 필터 자동 적용
- UUID 단독 조회 방지 (scope filter 포함)
- **CLAUDE.md Section 7 준수**

---

## 10. 기능 존재 확인

| 기능 | 존재 | API 연동 | 판정 |
|------|------|---------|------|
| 포럼 카테고리 조회 | YES | YES | **ACTIVE** |
| 포럼 카테고리 생성 (Admin) | YES | YES | **ACTIVE** |
| 포럼 카테고리 생성 요청 (User) | YES | YES | **ACTIVE** |
| 글 작성 | YES | YES | **ACTIVE** |
| 글 수정 | YES | YES | **ACTIVE** |
| 글 삭제 (아카이브) | YES | YES | **ACTIVE** |
| 글 목록 (검색/필터/페이지네이션) | YES | YES | **ACTIVE** |
| 글 상세 (Block 렌더링) | YES | YES | **ACTIVE** |
| 댓글 작성 | YES | YES | **ACTIVE** |
| 댓글 삭제 | YES | YES | **ACTIVE** |
| 대댓글 (parentId) | YES | YES | **ACTIVE** |
| 좋아요 | YES | YES | **ACTIVE** |
| 조회수 | YES | YES | **ACTIVE** (자동 증가) |
| 검색 (풀텍스트) | YES | YES | **ACTIVE** |
| 모더레이션 | YES | YES | **ACTIVE** (Operator) |
| 포럼 분석 | YES | YES | **ACTIVE** (Operator) |

---

## 11. GAP 분석 (O4O Community Standard 대비)

### 11.1 GAP 없음 (완전 준수)

| 항목 | O4O 표준 | KPA-a 현재 | GAP |
|------|---------|-----------|-----|
| Entity 사용 | @o4o/forum-core | 사용 중 | **NONE** |
| QueryService | ForumQueryService | 사용 중 | **NONE** |
| API 계약 | 표준 CRUD + JSON | 준수 | **NONE** |
| Scope 격리 | organizationId 필터 | 적용 중 | **NONE** |
| Block 에디터 | @o4o/content-editor | 사용 중 | **NONE** |
| Block 렌더러 | @o4o/forum-core/public-ui | 사용 중 | **NONE** |
| 타입 정의 | @o4o/types/forum | 사용 중 | **NONE** |

### 11.2 Minor GAP (운영 영향 없음)

| # | 항목 | 설명 | 영향 |
|---|------|------|------|
| 1 | Admin 관리 페이지 Mock | HQ/Division/Branch Admin 포럼 관리가 Mock Data | Operator 관리는 ACTIVE이므로 운영 가능 |
| 2 | 북마크 UI 미구현 | `forum_bookmark` 테이블 존재하나 UI 없음 | 핵심 기능 아님 |
| 3 | 태그 UI 미노출 | `forum_tag` 테이블 존재하나 태그 필터 UI 없음 | 검색으로 대체 가능 |

---

## 12. 결론

### 최종 판정: **FULLY ACTIVE**

KPA-a의 Community/Forum은 **이미 완전 구현**되어 있다.

| 영역 | 상태 |
|------|------|
| 메뉴 | "포럼" 메뉴 존재 (Main Header + Branch Header) |
| 페이지 | 7개 Forum 페이지 + 2개 Operator 페이지 (실 API 연동) |
| 컴포넌트 | 6개 Forum 전용 컴포넌트 + 3개 Home 통합 컴포넌트 |
| Backend | ~20 API 엔드포인트 + KPA 확장 승인 워크플로 |
| 데이터 | 6개 Core 테이블 + 2개 확장 테이블 |
| O4O 표준 | **완전 준수** — APP-FORUM Frozen Baseline + Boundary Policy |

### ChatGPT 예상 vs 실제

| ChatGPT 예상 | 실제 |
|-------------|------|
| "Forum 관련 코드가 이미 존재할 가능성이 높다" | **정확** — 완전 구현되어 있음 |
| "Community 구조 미정리" 가능성 | **해당 없음** — O4O 표준 완전 준수 |
| "정비(refactor)가 필요할 수 있다" | **불필요** — 이미 정비 완료 상태 |

### 권고

1. **새로운 Community 구조 적용 불필요** — 이미 O4O 표준으로 구현됨
2. **Admin 관리 페이지 Mock → API 연동**만 향후 개선 대상 (우선순위 Low)
3. 필요시 기능 추가(북마크, 태그 필터)는 기존 테이블 활용 가능

---

*Investigated by: Claude Code*
*Date: 2026-03-14*
