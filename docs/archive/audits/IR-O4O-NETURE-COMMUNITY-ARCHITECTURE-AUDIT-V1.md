# IR-O4O-NETURE-COMMUNITY-ARCHITECTURE-AUDIT-V1

> Neture Community 메인 화면 재구성을 위한 기존 시스템 조사 보고서

**조사일**: 2026-03-13
**목적**: Community 화면 재설계 전 Content, Forum, Signage 현황 파악

---

## 1. 조사 요약

### 현재 Community 구조

```
/community                    → CommunityPage (정적 3카드 허브)
├── /announcements           → CommunityAnnouncementsPage (CMS notice 타입)
│   └── /:id                 → CommunityAnnouncementDetailPage
├── /forum                   → ForumHubPage (Daum Cafe 스타일)
│   ├── /posts              → ForumPage (테이블 목록)
│   ├── /write              → ForumWritePage
│   └── /post/:slug         → ForumPostPage
└── /signage                 → CommunitySignagePage (정적 안내)
```

### 핵심 발견

| 항목 | 상태 | 설명 |
|------|------|------|
| CommunityPage | **정적 3카드** | API 연동 없음, 단순 링크 카드 |
| Content 시스템 | **완성** | CMS Entity + API + UI 모두 존재 |
| Forum 시스템 | **완성** | Entity + API + UI + 권한 + 모더레이션 |
| Signage 안내 | **정적** | 기능 소개 페이지, 실제 콘텐츠 없음 |
| Content → Forum 연결 | **없음** | 두 시스템 간 직접 연결 메커니즘 부재 |
| Knowledge 자료실 | **미구현** | CommunityPreviewSection에서 링크만 존재 |

---

## 2. Content 시스템

### 2.1 Entity 구조

**CmsContent** (`packages/cms-core/src/entities/CmsContent.entity.ts`)
- 테이블: `cms_contents`
- 핵심 필드: id, serviceKey, type, title, summary, body, imageUrl, linkUrl, status, publishedAt, viewCount
- 타입: `hero | notice | promo | news | featured | event`
- 상태: `draft → pending → published → archived`
- 범위: visibilityScope (`platform | service | organization`)
- 작성자 역할: authorRole (`admin | service_admin | supplier | community`)

**CmsContentSlot** (`packages/cms-core/src/entities/CmsContentSlot.entity.ts`)
- 테이블: `cms_content_slots`
- UI 위치 지정 + 시간 기반 표시 제어
- 계약 잠금 지원 (isLocked, lockedBy, lockedUntil)

**CmsContentRecommendation** (`apps/api-server/src/entities/CmsContentRecommendation.entity.ts`)
- 테이블: `cms_content_recommendations`
- 사용자별 추천 추적 (1인 1추천)

### 2.2 Content API

**Neture 콘텐츠 API** (`/api/v1/neture/content`)
```
GET  /api/v1/neture/content           # 목록 (type, sort, page, limit)
GET  /api/v1/neture/content/:id       # 상세
POST /api/v1/neture/content/:id/view  # 조회수 증가
POST /api/v1/neture/content/:id/recommend  # 추천 토글 (인증)
```

**CMS 관리 API** (`/api/v1/cms`)
```
GET    /api/v1/cms/contents           # 목록 (관리용)
POST   /api/v1/cms/contents           # 생성 (admin)
PUT    /api/v1/cms/contents/:id       # 수정 (admin)
PATCH  /api/v1/cms/contents/:id/status # 상태 전환 (admin)
```

**HUB 통합 API** (`/api/v1/hub/contents`)
```
GET /api/v1/hub/contents?serviceKey=neture  # 3개 소스 통합
  - CMS (cms_contents)
  - Signage Media (signage_media)
  - Signage Playlist (signage_playlists)
```

### 2.3 Content UI

| 페이지 | 경로 | 용도 |
|--------|------|------|
| ContentListPage | `/partner/contents` | 콘텐츠 목록 (정렬/페이징) |
| ContentDetailPage | `/partner/contents/:id` | 콘텐츠 상세 (조회수/추천) |
| MyContentPage | `/workspace/my-content` | 내가 복사한 콘텐츠 |

### 2.4 Content API Client

**파일**: `services/web-neture/src/lib/api/content.ts`

```typescript
cmsApi.getContents(params?)       // 목록
cmsApi.getContentById(id)         // 상세
cmsApi.trackView(id)              // 조회수
cmsApi.toggleRecommend(id)        // 추천
```

### 2.5 Content → LMS 관계

- **완전 분리**: Content Core와 LMS Extension은 독립 시스템
- LMS: lesson.videoUrl (URL 참조만), cms_media FK 없음
- Community에서 LMS 콘텐츠 표시 불필요

---

## 3. Forum 시스템

### 3.1 Entity 구조

**ForumCategory** (`packages/forum-core/src/backend/entities/ForumCategory.ts`)
- 필드: name, slug, description, iconEmoji, color, sortOrder
- 접근 수준: `all | member | business | admin`
- 조직 범위: organizationId (null = 전체 공개)
- 승인 모드: requireApproval (글 작성 시 pending 상태)

**ForumPost** (`packages/forum-core/src/backend/entities/ForumPost.ts`)
- 상태: `DRAFT | PUBLISHED | PENDING | REJECTED | ARCHIVED`
- 유형: `DISCUSSION | QUESTION | ANNOUNCEMENT | POLL | GUIDE`
- 필드: title, slug, content (Block[] JSONB), excerpt, tags
- 카운터: viewCount, commentCount, likeCount
- 메타데이터: SEO, moderation, analytics, AI 데이터

**ForumComment** (`packages/forum-core/src/backend/entities/ForumComment.ts`)
- 상태: `PUBLISHED | PENDING | DELETED` (soft delete)
- 중첩 답글: parentId (self-referential)
- 수정 제한: 24시간 이내만 canUserEdit()

**ForumPostLike** — 좋아요 추적 (1인 1좋아요)
**ForumTag** — 태그 시스템 (usageCount 비정규화)

### 3.2 Forum API

**공개 API** (`/api/v1/forum`)
```
GET  /posts                    # 글 목록 (category, search, sort, page)
GET  /posts/:id                # 글 상세
GET  /categories               # 카테고리 목록
GET  /categories/popular       # 7일 활동 기준 인기 포럼
GET  /posts/:postId/comments   # 댓글 목록
GET  /stats                    # 포럼 통계
```

**인증 API**
```
POST   /posts                  # 글 작성
PUT    /posts/:id              # 글 수정 (작성자/관리자)
DELETE /posts/:id              # 글 삭제 (아카이브)
POST   /posts/:id/like         # 좋아요 토글
POST   /comments               # 댓글 작성
PUT    /comments/:id           # 댓글 수정
DELETE /comments/:id           # 댓글 삭제 (soft)
```

**관리자 API**
```
GET  /moderation               # 승인 대기 큐
POST /moderation/:type/:id     # 승인/거절
POST /categories               # 카테고리 생성
PUT  /categories/:id           # 카테고리 수정
```

### 3.3 Forum 권한 체계

| 역할 | 글 작성 | 글 관리 | 카테고리 생성 | 모더레이션 |
|------|---------|---------|-------------|-----------|
| user | O | 본인만 | X | X |
| supplier | O | 본인만 | X | X |
| partner | O | 본인만 | X | X |
| seller | O | 본인만 | X | X |
| operator/admin | O | 전체 | O | O |

- 카테고리별 접근 수준 제어 가능 (`all | member | business | admin`)
- 조직 범위 격리: organizationId로 조직별 포럼 분리

### 3.4 Forum API Client

**파일**: `services/web-neture/src/services/forumApi.ts`

```typescript
fetchForumPosts(params)          // 글 목록
fetchPinnedPosts(limit)          // 고정 글
fetchForumPostBySlug(slug)       // 슬러그 기반 조회
fetchForumComments(postId)       // 댓글
fetchForumCategories()           // 카테고리
fetchPopularForums(limit)        // 인기 포럼
createForumPost(payload)         // 글 작성
toggleForumPostLike(postId)      // 좋아요
```

### 3.5 Forum UI

| 페이지 | 경로 | 설명 |
|--------|------|------|
| ForumHubPage | `/community/forum` | 카테고리 카드 + 인기/최근 글 |
| ForumPage | `/community/forum/posts` | 테이블 뷰 목록 (20개/페이지) |
| ForumWritePage | `/community/forum/write` | 글 작성 폼 |
| ForumPostPage | `/community/forum/post/:slug` | 글 상세 + 댓글 |

추가 진입점:
- `/supplier/forum` — 공급자 포럼
- `/partner/forum` — 파트너 포럼
- `/workspace/forum` — 워크스페이스 포럼

---

## 4. Digital Signage

### 4.1 시스템 구조

**Core**: `packages/digital-signage-core/`
- Entity: SignagePlaylist, SignageMedia, Display, DisplaySlot, SignageTemplate 등
- 도메인 확장: Cosmetics, Pharmacy, Seller별 특화 엔티티

### 4.2 Community에서의 의미

**`/community/signage` = 정적 안내 페이지**

파일: `services/web-neture/src/pages/community/CommunitySignagePage.tsx`

내용:
- Digital Signage 소개 Hero 섹션
- 3가지 기능 설명: 매장 디스플레이, 콘텐츠 관리, 플레이리스트
- 3단계 사용법: 콘텐츠 등록 → 플레이리스트 구성 → 매장 표시
- CTA: "공급자 참여하기" → `/supplier`

**실제 관리 인터페이스**: `/workspace/operator/signage/*` (운영자 전용)

### 4.3 Signage API

```
GET /api/signage/:serviceKey/public/media      # 공개 미디어
GET /api/signage/:serviceKey/public/playlists   # 공개 플레이리스트
```

---

## 5. Content → Community 연결 구조

### 5.1 현재 상태: **연결 없음**

- CmsContent와 ForumPost 사이에 FK 없음
- 포럼 글에서 콘텐츠 참조 메커니즘 없음
- 콘텐츠 하단 토론/댓글 기능 없음

### 5.2 확장 가능 지점

ForumPost.metadata.extensions (JSONB)에 도메인별 데이터 저장 가능:
```typescript
metadata.extensions.neture.contentId  // 콘텐츠 연결
metadata.extensions.neture.linkUrl    // 외부 링크
```

하지만 현재 이를 활용하는 코드는 없음.

---

## 6. Community 메인에 표시 가능한 데이터

### 6.1 사용 가능한 API

| 데이터 | API | 인증 | 상태 |
|--------|-----|------|------|
| 공지사항 | `GET /api/v1/neture/content?type=notice` | 불필요 | **사용 가능** |
| 최근 포럼 글 | `GET /api/v1/forum/posts?sortBy=latest` | 불필요 | **사용 가능** |
| 인기 포럼 글 | `GET /api/v1/forum/posts?sortBy=popular` | 불필요 | **사용 가능** |
| 고정 포럼 글 | `GET /api/v1/forum/posts?isPinned=true` | 불필요 | **사용 가능** |
| 포럼 카테고리 | `GET /api/v1/forum/categories` | 불필요 | **사용 가능** |
| 인기 포럼 | `GET /api/v1/forum/categories/popular` | 불필요 | **사용 가능** |
| 포럼 통계 | `GET /api/v1/forum/stats` | 선택 | **사용 가능** |
| 뉴스 콘텐츠 | `GET /api/v1/neture/content?type=news` | 불필요 | **사용 가능** |
| HUB 통합 | `GET /api/v1/hub/contents?serviceKey=neture` | 불필요 | **사용 가능** |
| Signage 미디어 | `GET /api/signage/neture/public/media` | 불필요 | **사용 가능** |

### 6.2 홈페이지 Community 미리보기 현황

**CommunityPreviewSection** (`components/home/CommunityPreviewSection.tsx`)
- 2컬럼: Forum Preview (API) + Knowledge Preview (정적)
- Forum: 최근 5개 글 (1200ms 딜레이 로딩)
- Knowledge: 하드코딩 3항목 (제품 소개, POP 디자인, 운영 가이드)
- `/community/knowledge` 링크 → **미구현 페이지**

---

## 7. 현재 CommunityPage 분석

**파일**: `services/web-neture/src/pages/CommunityPage.tsx`

### 현재 구조
```
Hero (gradient)
  ↓
3카드 그리드 (정적)
  ├── Announcements → /community/announcements
  ├── Forum → /community/forum
  └── Digital Signage → /community/signage
```

### 문제점

1. **API 연동 없음** — 모든 콘텐츠가 정적, 최신 데이터 없음
2. **콘텐츠 미리보기 없음** — 카드 클릭 전까지 내용을 알 수 없음
3. **활성도 표시 없음** — 최근 활동, 글 수, 참여자 수 미표시
4. **Knowledge 자료실 부재** — 홈페이지 프리뷰에서 링크하나 실제 페이지 없음
5. **역할별 맞춤 콘텐츠 없음** — 공급자/파트너/셀러 구분 없이 동일 화면

---

## 8. Community 재설계를 위한 기초 자료

### 8.1 활용 가능한 기존 컴포넌트

| 컴포넌트 | 파일 | 재사용 가능 |
|---------|------|-----------|
| CommunityPreviewSection | `components/home/CommunityPreviewSection.tsx` | Forum 프리뷰 패턴 |
| ForumHubPage | `pages/forum/ForumHubPage.tsx` | 카테고리 카드 그리드 |
| CommunityAnnouncementsPage | `pages/community/CommunityAnnouncementsPage.tsx` | 공지 목록 패턴 |

### 8.2 Community 메인에 보여줄 수 있는 섹션

```
1. 공지사항 (notice) — CMS API, 최근 3~5개
2. 최근 포럼 글 — Forum API, 최근 5~10개
3. 인기 포럼 카테고리 — Forum categories/popular API
4. 포럼 통계 — Forum stats API (참여 현황)
5. 콘텐츠 하이라이트 — CMS API (news/featured)
6. Signage 소개 — 정적 또는 공개 미디어 API
```

### 8.3 데이터 로딩 패턴 권장

```typescript
// Community 메인 데이터 병렬 로딩
const [notices, recentPosts, categories, popularForums] = await Promise.all([
  cmsApi.getContents({ type: 'notice', sort: 'latest', limit: 5 }),
  fetchForumPosts({ limit: 10, sortBy: 'latest' }),
  fetchForumCategories(),
  fetchPopularForums(50),
]);
```

---

## 9. 결론

### 시스템 준비 상태

| 시스템 | 백엔드 | 프론트엔드 | API Client | 상태 |
|--------|--------|-----------|-----------|------|
| Content (CMS) | 완성 | 완성 | 완성 | **연동 가능** |
| Forum | 완성 | 완성 | 완성 | **연동 가능** |
| Signage | 완성 | 운영자 전용 | 완성 | **공개 API 연동 가능** |
| Knowledge 자료실 | — | — | — | **미구현** |

### 다음 단계 권장

**WO-O4O-NETURE-COMMUNITY-HOME-V1** 작업 시:

1. CommunityPage를 정적 3카드에서 **데이터 기반 허브**로 전환
2. 공지 + 포럼 + 콘텐츠를 한 화면에서 미리보기
3. 기존 API 모두 활용 가능 — 백엔드 변경 없음
4. Knowledge 자료실은 별도 WO로 분리 권장

---

*조사 완료: 2026-03-13*
*다음 작업: WO-O4O-NETURE-COMMUNITY-HOME-V1*
