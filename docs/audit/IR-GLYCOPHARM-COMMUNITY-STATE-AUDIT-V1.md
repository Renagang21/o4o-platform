# IR-GLYCOPHARM-COMMUNITY-STATE-AUDIT-V1

## Investigation Report: GlycoPharm Community / Forum 현재 상태 조사

**조사일**: 2026-03-14
**조사 대상**: GlycoPharm (web-glycopharm / api-server)
**비교 대상**: KPA Society / K-Cosmetics Community Hub Template

---

## Executive Summary

**GlycoPharm에는 Forum 기능이 이미 구현되어 있으며, KPA/K-Cosmetics보다 더 풍부한 구조를 가진다.**

| 영역 | 상태 | 설명 |
|------|------|------|
| Forum Pages | **ACTIVE** | ForumHubPage, ForumPage + Forum Extension (ForumListPage, ForumFeedPage) |
| Forum API | **ACTIVE** | `/api/v1/glycopharm/forum/*` 15+ endpoints, `/api/v1/glycopharm/forums/*` 6 endpoints |
| Forum Extension | **ACTIVE** | 약국 공동 서비스 — 회원 전용 포럼 생성/관리 |
| Forum Request | **ACTIVE** | 카테고리 요청 워크플로우 (신청 → 승인 → 생성) |
| Signage/Video | **ACTIVE** | ContentHubPage + ContentLibraryPage + 18+ routes |
| Community Hub | **NOT IMPLEMENTED** | KPA 스타일 7섹션 통합 Hub 없음 |
| Community Ads/Sponsors API | **NOT IMPLEMENTED** | 테이블은 존재하나 controller 미등록 |
| Header 메뉴 노출 | **NOT IMPLEMENTED** | Forum/Community 메뉴가 Header에 없음 |
| 자료실 (Docs) | **NOT IMPLEMENTED** | 없음 |
| Forum Recommendations | **PARTIAL** | Generic만 지원, GlycoPharm 전용 로직 없음 |

**결론**: Forum은 KPA/K-Cosmetics보다 더 발전된 구조(Forum Extension, Category Request 워크플로우)를 가지지만, **Header에 노출되지 않고 Community Hub가 없다.** Community Hub Template 적용 시 기존 Forum 구조와의 통합이 핵심 과제.

---

## 1. Frontend 조사 결과

### 1.1 메뉴 구조

**파일**: `services/web-glycopharm/src/components/common/Header.tsx`

현재 Header 메뉴 (4-item 통합 메뉴):

| 메뉴 | 경로 | 상태 |
|------|------|------|
| Home | `/` | ACTIVE |
| Care 관리 | `/care` | ACTIVE |
| 환자관리 | `/care/patients` | ACTIVE |
| 약국 관리 | `/store` | ACTIVE (인증 필요) |
| **Community** | - | **없음** |
| **Forum** | - | **없음** |

**GAP**: Community/Forum 메뉴가 Header에 존재하지 않음. 사용자는 홈페이지의 ServiceOverviewSection "약국 공동 서비스" 카드를 통해서만 `/forum-ext`에 접근 가능.

---

### 1.2 라우트 구조

**파일**: `services/web-glycopharm/src/App.tsx`

#### Forum 관련 라우트

| 라우트 | 컴포넌트 | 상태 | 비고 |
|--------|----------|------|------|
| `/forum` | ForumHubPage | ACTIVE | Lazy-loaded |
| `/forum/posts` | ForumPage | ACTIVE | Lazy-loaded |
| `/forum/request-category` | RequestCategoryPage | ACTIVE | 카테고리 요청 |
| `/forum/my-requests` | MyRequestsPage | ACTIVE | 내 요청 목록 |
| `/forum/feedback` | ForumFeedbackPage | ACTIVE | 피드백 게시판 |
| `/forum-ext` | ForumListPage | ACTIVE | 약국 공동 서비스 |
| `/forum-ext/:forumId` | ForumFeedPage | ACTIVE | 개별 포럼 피드 |
| `/education` | EducationPage | ACTIVE | 교육 페이지 |

#### Signage 관련 라우트

| 라우트 | 컴포넌트 | 상태 |
|--------|----------|------|
| `/signage` | ContentLibraryPage | ACTIVE (public) |
| `/store/signage` | SmartDisplayPage | ACTIVE (operator) |
| `/store/signage/playlists` | PlaylistsPage | ACTIVE |
| `/store/signage/media` | MediaLibraryPage | ACTIVE |
| `/store/signage/forum` | PlaylistForumPage | ACTIVE |
| `/store/signage/library` | ContentLibraryPage | ACTIVE |
| `/store/signage/playlist/:id` | SignagePlaylistDetailPage | ACTIVE |
| `/store/signage/media/:id` | SignageMediaDetailPage | ACTIVE |
| `/admin/signage/content` | ContentHubPage | ACTIVE |
| `/admin/signage/hq-media` | HqMediaPage | ACTIVE |
| `/admin/signage/hq-playlists` | HqPlaylistsPage | ACTIVE |
| `/admin/signage/templates` | SignageTemplatesPage | ACTIVE |

#### 미존재 라우트

| 라우트 | 상태 |
|--------|------|
| `/community` | **없음** |
| `/forum/write` | **없음** |
| `/forum/post/:postId` | **없음** (forum-ext에서 게시글 표시) |
| `/docs`, `/resources`, `/library` | **없음** |

---

### 1.3 Forum 페이지 상세

#### ForumHubPage (`pages/forum/ForumHubPage.tsx`)
- Daum Cafe 스타일 포럼 허브
- 카테고리 그리드 + 최근/인기 게시글
- API: `GET /api/v1/glycopharm/forum/posts`, `/categories`

#### ForumPage (`pages/forum/ForumPage.tsx`)
- 게시글 목록 (검색, 필터, 페이지네이션)

#### Forum Extension Pages (`pages/forum-ext/`)
- **ForumListPage**: 회원 전용 포럼 목록 (약국 공동 서비스)
- **ForumFeedPage**: 개별 포럼 피드 (게시글 + 댓글)
- API: `GET /api/v1/glycopharm/forums`, `/forums/:forumId/posts`
- 포럼 생성 신청 기능 포함

#### 추가 Forum Pages
- **RequestCategoryPage**: 카테고리 생성 요청
- **MyRequestsPage**: 내 요청 목록
- **ForumFeedbackPage**: 피드백 게시판

---

### 1.4 Forum API 서비스

**파일**: `services/web-glycopharm/src/services/api.ts`

| API | 엔드포인트 | 용도 |
|-----|-----------|------|
| `forumRequestApi.create()` | POST `/api/v1/forum/category-requests` | 카테고리 요청 |
| `forumRequestApi.getMyRequests()` | GET `/api/v1/forum/category-requests/my?serviceCode=glycopharm` | 내 요청 |
| `forumRequestApi.approve()` | PATCH `/api/v1/forum/category-requests/:id/approve` | 승인 |

**참고**: 전용 `forumApi.ts` 파일은 없음. 페이지에서 직접 `apiClient.get()` / `apiClient.post()` 사용.

---

### 1.5 Signage 시스템

**파일**: `services/web-glycopharm/src/lib/api/signageV2.ts`

```
serviceKey: 'glycopharm' (default)
Base URL: ${VITE_API_BASE_URL}/api/signage/glycopharm
```

| 메서드 | 용도 |
|--------|------|
| `publicContentApi.listPlaylists(source?, serviceKey?, params?)` | 플레이리스트 목록 |
| `publicContentApi.listMedia(source?, serviceKey?, params?)` | 미디어 목록 |
| `publicContentApi.getMedia(id, serviceKey?)` | 미디어 상세 |
| `publicContentApi.getPlaylist(id, serviceKey?)` | 플레이리스트 상세 |

ContentHubPage: `hq` | `community` 탭으로 콘텐츠 소스 구분

---

## 2. Backend 조사 결과

### 2.1 서비스 키

| 용도 | 키 | 출처 |
|------|-----|------|
| Forum Context | `glycopharm` | forumContextMiddleware |
| Forum Organization | `a1b2c3d4-0001-4000-a000-forum00000001` | FORUM_ORGS.GLYCOPHARM |
| Signage | `glycopharm` | signageV2.ts default |

---

### 2.2 Forum API 구조

**GlycoPharm Forum Routes** (`glycopharm.routes.ts`):

| 엔드포인트 | 인증 | 용도 |
|-----------|------|------|
| GET `/api/v1/glycopharm/forum/health` | - | Health check |
| GET `/api/v1/glycopharm/forum/stats` | 선택 | 통계 |
| GET `/api/v1/glycopharm/forum/posts` | 선택 | 게시글 목록 |
| GET `/api/v1/glycopharm/forum/posts/:id` | 선택 | 게시글 상세 |
| POST `/api/v1/glycopharm/forum/posts` | 필수 | 게시글 작성 |
| PUT `/api/v1/glycopharm/forum/posts/:id` | 필수 | 게시글 수정 |
| DELETE `/api/v1/glycopharm/forum/posts/:id` | 필수 | 게시글 삭제 |
| POST `/api/v1/glycopharm/forum/posts/:id/like` | 필수 | 좋아요 토글 |
| GET `/api/v1/glycopharm/forum/posts/:postId/comments` | - | 댓글 목록 |
| POST `/api/v1/glycopharm/forum/comments` | 필수 | 댓글 작성 |
| GET `/api/v1/glycopharm/forum/categories` | - | 카테고리 목록 |
| POST `/api/v1/glycopharm/forum/categories` | 필수 | 카테고리 생성 |
| GET `/api/v1/glycopharm/forum/moderation` | 필수 | 관리 큐 |

**Forum Request Controller** (`controllers/forum-request.controller.ts`):

| 엔드포인트 | 용도 |
|-----------|------|
| POST `/api/v1/glycopharm/forum-requests` | 카테고리 생성 요청 |
| GET `/api/v1/glycopharm/forum-requests/my` | 내 요청 목록 |
| GET `/api/v1/glycopharm/forum-requests/:id` | 요청 상세 |
| GET `/api/v1/glycopharm/forum-requests/admin/all` | 관리자 전체 목록 |
| PATCH `/api/v1/glycopharm/forum-requests/:id/review` | 요청 승인/거부 |

---

### 2.3 Community Hub API

**상태: NOT IMPLEMENTED**

- `community_ads`, `community_sponsors` 테이블은 존재 (`service_code` 컬럼으로 multi-tenant 지원)
- `CommunityHubService`는 generic (serviceCode 파라미터)
- **GlycoPharm용 controller 없음** → 광고/스폰서 API 접근 불가

---

### 2.4 Forum Recommendations

| 서비스 | GlycoPharm 지원 |
|--------|----------------|
| Generic Recommendations | 지원 (기본 스코어링) |
| GlycoPharm 전용 추천 | **미구현** |
| Cosmetics 전용 추천 | 구현됨 (참고) |
| Yaksa 전용 추천 | 구현됨 (참고) |

---

### 2.5 App Manifest

**GlycoPharm Forum in appsCatalog.ts**: **없음**

| App ID | Service Group | 상태 |
|--------|-------------|------|
| `forum-yaksa` | yaksa | 등록됨 |
| `forum-cosmetics` | cosmetics | 등록됨 |
| `forum-glycopharm` | - | **없음** |

---

## 3. KPA Community Hub Template 비교

### KPA CommunityHubPage 7섹션 vs GlycoPharm

| # | 섹션 | KPA | K-Cosmetics | GlycoPharm |
|---|------|-----|------------|------------|
| 1 | HeroBannerSection (광고 캐러셀) | ACTIVE | ACTIVE | **없음** |
| 2 | ForumSection (카테고리 카드) | ACTIVE | ACTIVE | ForumHubPage에 유사 존재 |
| 3 | LatestPostsSection (최근 게시글) | ACTIVE | ACTIVE | ForumHubPage에 유사 존재 |
| 4 | AdSection (페이지 광고) | ACTIVE | ACTIVE | **없음** |
| 5 | VideoSection (Signage 미디어) | ACTIVE | ACTIVE | ContentHubPage에 분리 구현 |
| 6 | ResourceSection (자료실) | ACTIVE | Placeholder | **없음** |
| 7 | SponsorBar (스폰서 로고) | ACTIVE | ACTIVE | **없음** |

---

## 4. GAP 분석

### 4.1 즉시 해결 필요 (Critical GAP)

| # | GAP | 현재 상태 | 필요 작업 |
|---|-----|----------|----------|
| G1 | **Header 메뉴 미노출** | Forum 라우트 있으나 메뉴 없음 | Header.tsx에 Community/Forum 메뉴 추가 |
| G2 | **글쓰기 전용 라우트 없음** | `/forum/write` 미등록 | ForumWritePage 구현 + 라우트 등록 |

### 4.2 Community Hub Template 적용 GAP

| # | GAP | 설명 | 우선순위 |
|---|-----|------|---------|
| G3 | **CommunityHubPage 부재** | `/community` 통합 Hub 페이지 없음 | HIGH |
| G4 | **Community Hub API 미연결** | community_ads/sponsors controller 없음 | HIGH |
| G5 | **HeroBannerSection 없음** | 광고 캐러셀 미구현 | MEDIUM |
| G6 | **VideoSection 통합 안됨** | Signage가 별도 경로에 분리 | MEDIUM |
| G7 | **ResourceSection 없음** | 자료실 기능 없음 | LOW |
| G8 | **SponsorBar 없음** | 스폰서 로고 바 없음 | LOW |
| G9 | **AdSection 없음** | 커뮤니티 페이지 광고 없음 | LOW |

### 4.3 GlycoPharm 고유 고려사항

| 항목 | 설명 |
|------|------|
| Forum Extension 통합 | `/forum-ext` 약국 공동 서비스를 Community Hub에 어떻게 표시할지 결정 필요 |
| Forum Request 워크플로우 | 카테고리 신청/승인 시스템이 있음 — Hub에서 접근 경로 제공 가능 |
| Education 페이지 | `/education` 라우트가 있음 — Community Hub Resource 섹션과 연결 가능 |
| Care 중심 구조 | Header 4-item 메뉴 변경 시 Care 중심 UX 유지 필요 |

### 4.4 이미 구현된 항목 (No GAP)

| 항목 | 상태 |
|------|------|
| Forum 카테고리 카드 그리드 | ForumHubPage에 구현됨 |
| Forum 게시글 목록 | ForumPage에 구현됨 |
| Forum Extension (약국 공동 서비스) | ForumListPage + ForumFeedPage에 구현됨 |
| Forum Category Request 워크플로우 | Backend + Frontend 완전 구현됨 |
| Signage 콘텐츠 허브 | ContentHubPage에 구현됨 (hq/community 탭) |
| Signage 미디어/플레이리스트 | 18+ routes 완전 구현됨 |
| Forum API 연동 (Backend) | 15+ endpoints 완전 구현됨 |
| Forum Moderation | Backend 구현됨 |

---

## 5. K-Cosmetics 구현 대비 GlycoPharm 특이 사항

| 항목 | K-Cosmetics | GlycoPharm |
|------|------------|------------|
| Forum 구조 | 기본 (Hub + List + Detail) | 확장형 (Hub + List + Extension + Request) |
| 전용 Forum API | `/api/v1/forum/*` 공유 | `/api/v1/glycopharm/forum/*` 전용 + 공유 |
| Forum Request | 없음 | 카테고리 요청 워크플로우 있음 |
| Signage 통합 | 기본 (Partner 경로) | 확장형 (public + store + admin 경로) |
| API 패턴 | direct `fetch()` + `VITE_API_URL` | `apiClient` 중앙화 패턴 |
| communityApi.ts | 직접 생성 | 미존재 (생성 필요) |
| Header 메뉴 수 | 5개 (홈, 커뮤니티, 포럼, 문의, 매장) | 4개 (홈, Care, 환자, 약국) |

---

## 6. 결론 및 권장 사항

### 현재 상태 요약

```
GlycoPharm Forum = IMPLEMENTED but HIDDEN (Header 미노출)
GlycoPharm Forum Extension = IMPLEMENTED (약국 공동 서비스)
GlycoPharm Community Hub = NOT IMPLEMENTED
GlycoPharm Signage = IMPLEMENTED (확장형, 별도 경로)
GlycoPharm Community API = NOT IMPLEMENTED (테이블은 존재)
```

### 권장 작업 순서

**Phase 1: Backend (Community Hub API)**
1. `glycopharm-community-hub.controller.ts` 생성 (CommunityHubService 재사용, `SERVICE_CODE='glycopharm'`)
2. `glycopharm.routes.ts`에 마운트

**Phase 2: Frontend (Community Hub Template)**
1. `communityApi.ts` 생성 (GlycoPharm API 패턴 사용)
2. Community UI 컴포넌트 생성 (HeroBanner, AdSection, SponsorBar)
3. `CommunityHubPage.tsx` 생성 (7섹션)
   - Forum Extension "약국 공동 서비스" 섹션 추가 (GlycoPharm 고유)
4. `ForumWritePage.tsx` 생성 (간소화 버전)

**Phase 3: 메뉴 노출**
1. Header.tsx 메뉴 추가 (Care 중심 UX 유지하면서)
2. App.tsx 라우트 등록

**Phase 4: 부가 기능 (선택)**
1. Education 섹션 연결
2. Forum Recommendations GlycoPharm 전용 로직
3. appsCatalog.ts에 `forum-glycopharm` 등록

### 주의 사항

- Forum Core 수정 불필요 (Frozen)
- GlycoPharm Forum Extension은 기존 구조 유지 (별도 라우트)
- Header 메뉴 변경 시 Care 관리 / 환자관리 중심 UX 보존 필요
- API 패턴은 GlycoPharm 기존 패턴 (`apiClient` 중앙화) 따라야 함
- **구현 전 반드시 WO (Work Order) 작성 후 검토 필요**

---

*작성: Claude Opus 4.6*
*상태: 조사 완료 — 구현 대기*
