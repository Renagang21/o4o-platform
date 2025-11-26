# Forum 앱 분리 조사 결과

**작성일:** 2025-11-26
**목적:** 현재 내장된 Forum 기능을 독립 앱으로 추출하기 위한 현황 조사
**관련 문서:** [app-market_checklist.md](./app-market_checklist.md)

---

## 1. 현재 Forum 구조 분석

### 1.1 데이터 모델 (TypeORM Entities)

**중요:** Forum은 현재 **CPT가 아닌 일반 TypeORM Entity**로 구현되어 있음

| 엔티티 | 파일 경로 | 테이블명 | 설명 |
|--------|-----------|----------|------|
| ForumPost | `apps/api-server/src/entities/ForumPost.ts` | `forum_post` | 게시글 |
| ForumCategory | `apps/api-server/src/entities/ForumCategory.ts` | `forum_category` | 카테고리 |
| ForumComment | `apps/api-server/src/entities/ForumComment.ts` | `forum_comment` | 댓글 |
| ForumTag | `apps/api-server/src/entities/ForumTag.ts` | `forum_tag` | 태그 |

**추가 테이블 (마이그레이션에만 존재):**
- `forum_like` - 좋아요/공감
- `forum_bookmark` - 북마크

---

### 1.2 엔티티 상세 구조

#### ForumPost

```typescript
@Entity('forum_post')
class ForumPost {
  // 기본 필드
  id: uuid
  title: varchar(200)
  slug: varchar(250) UNIQUE
  content: text
  excerpt?: text
  type: enum(PostType)       // discussion, question, announcement, poll, guide
  status: enum(PostStatus)   // draft, publish, pending, rejected, archived

  // 관계
  categoryId: uuid           → ForumCategory
  authorId: uuid             → User
  lastCommentBy?: uuid       → User

  // 플래그
  isPinned: boolean
  isLocked: boolean
  allowComments: boolean

  // 통계
  viewCount: number
  commentCount: number
  likeCount: number

  // 메타
  tags?: string[]            // simple-array
  metadata?: json

  // 타임스탬프
  publishedAt?: timestamp
  lastCommentAt?: timestamp
  createdAt: timestamp
  updatedAt: timestamp

  // 메서드
  canUserView(userRole): boolean
  canUserEdit(userId, userRole): boolean
  canUserComment(userRole): boolean
  incrementViewCount()
  incrementCommentCount(userId)
  publish()
  generateSlug(): string
}
```

#### ForumCategory

```typescript
@Entity('forum_category')
class ForumCategory {
  id: uuid
  name: varchar(100)
  description?: text
  slug: varchar(200) UNIQUE
  color?: varchar(50)
  sortOrder: number
  isActive: boolean
  requireApproval: boolean
  accessLevel: enum        // all, member, business, admin
  postCount: number
  createdBy?: uuid → User
  createdAt: timestamp
  updatedAt: timestamp

  // 메서드
  canUserAccess(userRole): boolean
  canUserPost(userRole): boolean
  incrementPostCount()
  decrementPostCount()
}
```

#### ForumComment

```typescript
@Entity('forum_comment')
class ForumComment {
  id: uuid
  content: text
  postId: uuid → ForumPost
  authorId: uuid → User
  parentId?: uuid → ForumComment (자기 참조)
  status: enum            // publish, pending, deleted
  likeCount: number
  replyCount: number
  isEdited: boolean
  createdAt: timestamp
  updatedAt: timestamp

  // 메서드
  canUserView(userRole, userId): boolean
  canUserEdit(userId, userRole): boolean
  incrementLike()
  incrementReplyCount()
  softDelete()
  extractMentions()
}
```

#### ForumTag

```typescript
@Entity('forum_tag')
class ForumTag {
  id: uuid
  name: varchar(50) UNIQUE
  slug: varchar(60) UNIQUE
  description?: text
  color?: varchar(50)
  usageCount: number
  isActive: boolean
  createdAt: timestamp
  updatedAt: timestamp

  // 메서드
  static generateSlug(name): string
}
```

---

### 1.3 인덱스 (최적화)

```sql
-- ForumCategory
CREATE INDEX "IDX_FORUM_CATEGORY_ACTIVE_SORT"
  ON "forum_category" ("isActive", "sortOrder");

-- ForumPost
CREATE INDEX "IDX_FORUM_POST_CATEGORY_STATUS"
  ON "forum_post" ("categoryId", "status", "isPinned", "createdAt");

-- ForumComment
CREATE INDEX "IDX_FORUM_COMMENT_POST_STATUS"
  ON "forum_comment" ("postId", "status", "createdAt");

CREATE INDEX "IDX_FORUM_COMMENT_PARENT"
  ON "forum_comment" ("parentId");
```

---

### 1.4 마이그레이션 파일

**위치:** `apps/api-server/src/migrations/create-forum-tables.ts`

**생성 테이블:**
1. `forum_category` (카테고리)
2. `forum_post` (게시글)
3. `forum_comment` (댓글)
4. `forum_tag` (태그)
5. `forum_like` (좋아요)
6. `forum_bookmark` (북마크)

**외래 키 관계:**
- `forum_post.categoryId` → `forum_category.id` (CASCADE)
- `forum_post.author_id` → `users.id`
- `forum_comment.postId` → `forum_post.id` (CASCADE)
- `forum_comment.author_id` → `users.id`
- `forum_comment.parentId` → `forum_comment.id` (CASCADE, self-reference)

---

## 2. 서비스 계층 분석

### 2.1 ForumService

**위치:** `apps/api-server/src/services/forumService.ts`

**주요 기능:**

```typescript
class ForumService {
  // Category 관리
  async createCategory(data, creatorId): Promise<ForumCategory>
  async updateCategory(categoryId, data): Promise<ForumCategory | null>
  async getCategories(includeInactive): Promise<ForumCategory[]>
  async getCategoryBySlug(slug): Promise<ForumCategory | null>

  // Post 관리
  async createPost(data, authorId): Promise<ForumPost>
  async updatePost(postId, data, userId, userRole): Promise<ForumPost | null>
  async getPost(postId, userId?): Promise<ForumPost | null>
  async getPostBySlug(slug, userId?): Promise<ForumPost | null>
  async searchPosts(options, userRole): Promise<{
    posts: ForumPost[];
    totalCount: number;
    pagination: PaginationInfo;
  }>

  // Comment 관리
  async createComment(data, authorId): Promise<ForumComment>
  async getComments(postId, page, limit): Promise<{
    comments: ForumComment[];
    totalCount: number;
    pagination: PaginationInfo;
  }>

  // Statistics
  async getForumStatistics(): Promise<ForumStatistics>

  // Helper Methods (private)
  private generateSlug(text): string
  private processTags(tags): Promise<void>
  private updateCategoryStats(categoryId, action): Promise<void>
  private updatePostStats(postId, action, userId?): Promise<void>
  private incrementPostViews(postId): Promise<void>
  private getPopularTags(limit): Promise<TagInfo[]>
  private getActiveCategories(limit): Promise<CategoryInfo[]>
  private getTopContributors(limit): Promise<ContributorInfo[]>
  private invalidateCategoryCache(): Promise<void>
  private invalidatePostCache(categoryId): Promise<void>
}
```

**캐싱 전략:**
- `cacheService` 사용 (CacheService 의존)
- Category 목록 캐시 (10분 TTL)
- Forum Statistics 캐시 (5분 TTL)
- 수정 시 자동 캐시 무효화

**검색 및 정렬 옵션:**
```typescript
interface ForumSearchOptions {
  query?: string;           // ILIKE 검색
  categoryId?: string;
  authorId?: string;
  tags?: string[];
  type?: PostType;
  status?: PostStatus;
  page?: number;
  limit?: number;
  sortBy?: 'latest' | 'popular' | 'trending' | 'oldest';
  dateRange?: { start?: Date; end?: Date; };
}
```

---

## 3. API 엔드포인트 분석

### 3.1 현재 상태

**문제:** API 라우트 파일이 실제로 **존재하지 않음** ❌

**설정은 있으나 미구현:**
- `apps/admin-dashboard/src/config/apps.config.ts`에 엔드포인트 정의됨:
  ```typescript
  forum: {
    stats: '/forum/stats',
    posts: '/forum/posts',
    categories: '/forum/categories',
    users: '/forum/users',
    moderation: '/forum/moderation',
  }
  ```
- `apps/api-server/src/routes/`에 실제 라우트 파일 없음
- `apps/api-server/src/config/routes.config.ts`에도 forum 라우트 등록 없음

**예상 엔드포인트 (구현 필요):**

```typescript
// Category
GET    /api/forum/categories          // 카테고리 목록
POST   /api/forum/categories          // 카테고리 생성 (admin)
GET    /api/forum/categories/:slug    // 카테고리 조회
PUT    /api/forum/categories/:id      // 카테고리 수정 (admin)
DELETE /api/forum/categories/:id      // 카테고리 삭제 (admin)

// Post
GET    /api/forum/posts               // 게시글 목록 (검색, 필터, 정렬)
POST   /api/forum/posts               // 게시글 작성
GET    /api/forum/posts/:id           // 게시글 조회
GET    /api/forum/posts/slug/:slug    // Slug로 조회
PUT    /api/forum/posts/:id           // 게시글 수정
DELETE /api/forum/posts/:id           // 게시글 삭제
POST   /api/forum/posts/:id/publish   // 게시글 발행 (approve)

// Comment
GET    /api/forum/posts/:postId/comments  // 댓글 목록
POST   /api/forum/posts/:postId/comments  // 댓글 작성
PUT    /api/forum/comments/:id            // 댓글 수정
DELETE /api/forum/comments/:id            // 댓글 삭제 (soft delete)

// Like & Bookmark
POST   /api/forum/posts/:id/like          // 좋아요
DELETE /api/forum/posts/:id/like          // 좋아요 취소
POST   /api/forum/posts/:id/bookmark      // 북마크
DELETE /api/forum/posts/:id/bookmark      // 북마크 취소

// Statistics
GET    /api/forum/stats                   // 포럼 통계

// Moderation
GET    /api/forum/moderation              // 신고 목록 (admin)
POST   /api/forum/moderation/:id/approve  // 승인 (admin)
POST   /api/forum/moderation/:id/reject   // 거부 (admin)
```

---

## 4. Admin UI 분석

### 4.1 페이지 구조

**경로:** `/admin/forum/*`

| 경로 | 파일 | 기능 |
|------|------|------|
| `/admin/forum` | `ForumApp.tsx` | 포럼 대시보드 (메인) |
| `/admin/forum/posts/new` | `forum/ForumPostForm.tsx` | 게시글 작성 |
| `/admin/forum/posts/:id` | `forum/ForumPostDetail.tsx` | 게시글 상세 |
| `/admin/forum/posts/:id/edit` | `forum/ForumPostForm.tsx` | 게시글 수정 |
| `/admin/forum/categories` | `forum/ForumCategories.tsx` | 카테고리 관리 |
| `/admin/forum` (list) | `forum/ForumBoardList.tsx` | 게시판 목록 |

**컴포넌트 경로:**
```
apps/admin-dashboard/src/pages/apps/
├── ForumApp.tsx                # 메인 대시보드
├── ForumReports.tsx            # 신고 관리
├── forum/
│   ├── ForumBoardList.tsx      # 게시글 목록
│   ├── ForumPostForm.tsx       # 작성/수정 폼
│   ├── ForumPostDetail.tsx     # 게시글 상세
│   └── ForumCategories.tsx     # 카테고리 관리
└── (CPT 폼들)
    ├── cpt-acf/ForumCategoryForm.tsx
    ├── cpt-acf/ForumPostForm.tsx
    ├── cpt-acf/ForumCategoryArchive.tsx
    └── cpt-acf/ForumPostArchive.tsx
```

**중복 발견:** CPT 폼과 일반 폼이 중복 존재 (통합 필요)

---

### 4.2 API 클라이언트

**위치:** `apps/admin-dashboard/src/api/apps/forum.ts`

```typescript
class ForumService {
  async getStats(): Promise<ForumStats>
  async getPosts(params): Promise<PostsResponse>
  async getPost(id): Promise<ForumPost>
  async createPost(data): Promise<ForumPost>
  async updatePost(id, data): Promise<ForumPost>
  async deletePost(id): Promise<void>

  async getCategories(): Promise<ForumCategory[]>
  async createCategory(data): Promise<ForumCategory>
  async updateCategory(id, data): Promise<ForumCategory>
  async deleteCategory(id): Promise<void>

  async getModerationQueue(params): Promise<ModerationResponse>
  async moderateContent(id, action, reason?): Promise<any>

  // Bulk operations
  async bulkDeletePosts(ids): Promise<void>
  async bulkMovePostsToCategory(postIds, categoryId): Promise<void>
}

export const forumService = new ForumService();
```

**Base API:** `api` (`apps/admin-dashboard/src/api/base.ts`)
- authClient 사용 (인증 처리)
- 에러 핸들링 통합

---

### 4.3 대시보드 위젯

**위치:** `apps/admin-dashboard/src/pages/dashboard/components/StatsOverview/ForumStatsCard.tsx`

**기능:**
- 전체 게시글 수
- 활성 사용자 수
- 답글 수
- 신고된 게시글 수

---

## 5. 권한 시스템 분석

### 5.1 Category 권한

**AccessLevel:** `all` | `member` | `business` | `admin`

```typescript
canUserAccess(userRole: string): boolean {
  switch (this.accessLevel) {
    case 'all': return true;
    case 'member': return ['customer', 'business', 'affiliate', 'admin', 'manager'].includes(userRole);
    case 'business': return ['business', 'affiliate', 'admin', 'manager'].includes(userRole);
    case 'admin': return ['admin', 'manager'].includes(userRole);
    default: return false;
  }
}
```

---

### 5.2 Post 권한

```typescript
canUserView(userRole: string): boolean {
  if (this.status !== PostStatus.PUBLISHED) {
    return ['admin', 'manager'].includes(userRole);
  }
  return true;
}

canUserEdit(userId: string, userRole: string): boolean {
  if (['admin', 'manager'].includes(userRole)) return true;
  if (this.authorId === userId && !this.isLocked) return true;
  return false;
}

canUserComment(userRole: string): boolean {
  if (this.isLocked || !this.allowComments) return false;
  return true;
}
```

---

### 5.3 Comment 권한

```typescript
canUserView(userRole: string, userId: string): boolean {
  if (this.status === CommentStatus.DELETED) {
    return ['admin', 'manager'].includes(userRole) || userId === this.authorId;
  }
  return this.status === CommentStatus.PUBLISHED;
}

canUserEdit(userId: string, userRole: string): boolean {
  if (['admin', 'manager'].includes(userRole)) return true;
  if (this.authorId === userId && this.status !== CommentStatus.DELETED) {
    const hoursSinceCreation = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation < 24; // 24시간 이내만 수정 가능
  }
  return false;
}
```

---

### 5.4 필요한 권한 정의 (앱 Manifest용)

```typescript
permissions: [
  'forum.read',           // 게시글 읽기 (public)
  'forum.write',          // 게시글 작성 (authenticated)
  'forum.comment',        // 댓글 작성 (authenticated)
  'forum.moderate',       // 모더레이션 (admin/manager)
  'forum.admin',          // 카테고리 관리, 통계 (admin)
]
```

---

## 6. 의존성 분석

### 6.1 서버 의존성

**TypeORM Entities:**
- `User` (author, creator 관계)

**서비스:**
- `CacheService` (캐싱)
- `AppDataSource` (DB 연결)

**기타:**
- TypeORM (`MoreThanOrEqual` 등)
- 없음 (독립적인 서비스)

---

### 6.2 클라이언트 의존성

**React 컴포넌트:**
- `@/components/ui/button` (UI 컴포넌트)
- `lucide-react` (아이콘)
- `react-router-dom` (라우팅)

**API 클라이언트:**
- `@/api/base` (authClient)

**공통 타입:**
- 없음 (자체 타입 정의)

---

## 7. 데이터 볼륨 및 마이그레이션 요구사항

### 7.1 예상 데이터 규모

| 테이블 | 예상 레코드 수 | 비고 |
|--------|----------------|------|
| forum_category | < 50 | 적음 |
| forum_post | 수천 ~ 수만 | 증가율 높음 |
| forum_comment | 수만 ~ 수십만 | 증가율 매우 높음 |
| forum_tag | < 500 | 적음 |
| forum_like | 수만 ~ 수십만 | 증가율 높음 |
| forum_bookmark | 수천 ~ 수만 | 중간 |

---

### 7.2 마이그레이션 전략

#### 옵션 A: In-Place 전환 (권장)

**방법:**
1. 앱 설치 시 기존 테이블 **유지**
2. Manifest에 `adoptExistingTables: true` 설정
3. 마이그레이션 스킵 (테이블 이미 존재)
4. 앱 제거 시 `keep-data` 기본 설정

**장점:**
- ✅ 데이터 손실 없음
- ✅ 다운타임 없음
- ✅ 롤백 쉬움

**단점:**
- ⚠️ 테이블 구조 변경 어려움

---

#### 옵션 B: 이관 (복잡함, 비권장)

**방법:**
1. 새 테이블 생성 (`forum_app_post` 등)
2. 기존 데이터 → 새 테이블 복사
3. ID 매핑 테이블 작성
4. 외래 키 재연결

**장점:**
- ✅ 완전히 새로운 구조 가능

**단점:**
- ❌ 복잡도 높음
- ❌ 다운타임 필요
- ❌ 데이터 손실 위험

---

**권장:** 옵션 A (In-Place 전환)

---

## 8. 앱 추출 시 수정 필요 사항

### 8.1 코어에서 제거할 부분

**파일 제거/이동:**
```
apps/api-server/src/
├── entities/
│   ├── ForumPost.ts        → @o4o-apps/forum/entities/
│   ├── ForumCategory.ts    → @o4o-apps/forum/entities/
│   ├── ForumComment.ts     → @o4o-apps/forum/entities/
│   └── ForumTag.ts         → @o4o-apps/forum/entities/
├── services/
│   └── forumService.ts     → @o4o-apps/forum/services/
└── migrations/
    └── create-forum-tables.ts → @o4o-apps/forum/migrations/

apps/admin-dashboard/src/
├── pages/apps/
│   ├── ForumApp.tsx        → @o4o-apps/forum/admin-ui/
│   ├── ForumReports.tsx    → @o4o-apps/forum/admin-ui/
│   └── forum/              → @o4o-apps/forum/admin-ui/pages/
├── api/apps/
│   └── forum.ts            → @o4o-apps/forum/admin-ui/api/
└── pages/dashboard/components/StatsOverview/
    └── ForumStatsCard.tsx  → @o4o-apps/forum/admin-ui/widgets/
```

**routes.config.ts 수정:**
- Forum 라우트 등록 제거 (동적 등록으로 전환)

**connection.ts 수정:**
- Forum entities 제거

---

### 8.2 Forum 앱 디렉토리 구조 (제안)

```
apps-marketplace/forum/
├── manifest.json
├── package.json
├── tsconfig.json
├── README.md
│
├── src/
│   ├── server/                    # Backend
│   │   ├── entities/
│   │   │   ├── ForumPost.ts
│   │   │   ├── ForumCategory.ts
│   │   │   ├── ForumComment.ts
│   │   │   └── ForumTag.ts
│   │   ├── services/
│   │   │   └── forumService.ts
│   │   ├── controllers/
│   │   │   └── forum.controller.ts (신규)
│   │   ├── routes/
│   │   │   └── forum.routes.ts (신규)
│   │   └── migrations/
│   │       └── 001-create-forum-tables.ts
│   │
│   ├── admin-ui/                  # Admin Dashboard UI
│   │   ├── pages/
│   │   │   ├── ForumApp.tsx
│   │   │   ├── ForumReports.tsx
│   │   │   ├── ForumBoardList.tsx
│   │   │   ├── ForumPostForm.tsx
│   │   │   ├── ForumPostDetail.tsx
│   │   │   └── ForumCategories.tsx
│   │   ├── widgets/
│   │   │   └── ForumStatsCard.tsx
│   │   └── api/
│   │       └── forumClient.ts
│   │
│   ├── lifecycle/                 # App Lifecycle
│   │   ├── install.ts
│   │   ├── activate.ts
│   │   ├── deactivate.ts
│   │   └── uninstall.ts
│   │
│   └── types/
│       └── forum.types.ts
│
└── dist/                          # Build output
```

---

### 8.3 Manifest 예시

```json
{
  "name": "forum",
  "version": "1.0.0",
  "displayName": "커뮤니티 포럼",
  "description": "게시판, 댓글, 카테고리 기능을 제공하는 포럼 앱",
  "author": "O4O Platform",
  "icon": "/assets/forum-icon.png",
  "homepage": "https://docs.o4o.com/apps/forum",

  "o4oCore": ">=0.5.0 <1.0.0",

  "permissions": [
    "forum.read",
    "forum.write",
    "forum.comment",
    "forum.moderate",
    "forum.admin"
  ],

  "routes": [
    { "path": "/api/forum/*", "handler": "dist/server/routes/forum.routes.js" }
  ],

  "adminRoutes": [
    { "path": "/admin/forum", "component": "dist/admin-ui/pages/ForumApp.js" }
  ],

  "lifecycle": {
    "install": "dist/lifecycle/install.js",
    "activate": "dist/lifecycle/activate.js",
    "deactivate": "dist/lifecycle/deactivate.js",
    "uninstall": "dist/lifecycle/uninstall.js"
  },

  "migrations": [
    "dist/server/migrations/001-create-forum-tables.js"
  ],

  "adoptExistingTables": true,
  "tablePrefix": "forum_",

  "uninstallPolicy": {
    "defaultMode": "keep-data",
    "allowPurge": true,
    "autoBackup": true
  },

  "widgets": [
    {
      "id": "forum-stats",
      "name": "Forum Statistics",
      "component": "dist/admin-ui/widgets/ForumStatsCard.js",
      "area": "dashboard",
      "order": 10
    }
  ],

  "menuItems": [
    {
      "id": "forum",
      "label": "포럼",
      "icon": "MessageSquare",
      "path": "/admin/forum",
      "permission": "forum.read",
      "order": 50
    }
  ],

  "dependencies": {},

  "tags": ["community", "forum", "discussion", "social"],
  "category": "community",
  "license": "MIT"
}
```

---

## 9. 단계별 추출 계획

### Phase 1: 준비 (1일)

- [ ] 앱 마켓 인프라 구축 완료 확인
- [ ] `apps-marketplace/forum/` 디렉토리 생성
- [ ] `manifest.json` 작성
- [ ] 빌드 설정 (`tsconfig.json`, `package.json`)

---

### Phase 2: 코드 이동 (2일)

- [ ] Server 코드 이동
  - [ ] Entities 복사 → `src/server/entities/`
  - [ ] Service 복사 → `src/server/services/`
  - [ ] Controller 신규 작성
  - [ ] Routes 신규 작성
  - [ ] Migration 이동

- [ ] Admin UI 코드 이동
  - [ ] Pages 복사
  - [ ] Widgets 복사
  - [ ] API Client 복사

- [ ] Lifecycle 스크립트 작성
  - [ ] `install.ts`: 마이그레이션 실행 (adoptExisting 체크)
  - [ ] `activate.ts`: 라우트/메뉴 등록
  - [ ] `deactivate.ts`: 라우트/메뉴 제거
  - [ ] `uninstall.ts`: 데이터 정리 (옵션)

---

### Phase 3: 빌드 및 패키징 (1일)

- [ ] TypeScript 빌드 설정
- [ ] 빌드 스크립트 작성 (`build.sh`)
- [ ] dist/ 생성 및 검증
- [ ] ZIP 패키징 (선택)

---

### Phase 4: 테스트 (2일)

- [ ] 로컬 설치 테스트
  - [ ] `adoptExistingTables` 동작 확인
  - [ ] 기존 데이터 유지 확인
  - [ ] 라우트 등록 확인
  - [ ] 권한 체크 확인

- [ ] 활성화/비활성화 테스트
  - [ ] 메뉴 표시/숨김
  - [ ] 라우트 활성/비활성

- [ ] 제거 테스트
  - [ ] `keep-data` 모드
  - [ ] `purge-data` 모드 (신중)

---

### Phase 5: 코어 정리 (1일)

- [ ] 코어에서 Forum 코드 제거
  - [ ] Entities 제거
  - [ ] Service 제거
  - [ ] Admin UI 제거

- [ ] routes.config.ts 정리
- [ ] connection.ts 정리
- [ ] 빌드 확인

---

### Phase 6: 배포 (1일)

- [ ] 앱 마켓에 등록
- [ ] 문서 작성
- [ ] 사용자 가이드 작성

---

**총 소요 기간:** 8일 (약 1.5주)

---

## 10. 위험 요소 및 완화 방안

### 위험 1: 데이터 손실

**리스크:** 마이그레이션 중 데이터 손실 가능

**완화:**
- ✅ `adoptExistingTables: true` 사용 (테이블 재사용)
- ✅ 백업 필수 (설치 전 자동 pg_dump)
- ✅ 롤백 계획 (백업 복원 스크립트)

---

### 위험 2: 기능 호환성

**리스크:** 앱 전환 후 기능 동작 안 할 수 있음

**완화:**
- ✅ 동일한 코드 복사 (로직 변경 최소화)
- ✅ 통합 테스트 (모든 기능 검증)
- ✅ 스테이징 환경 테스트

---

### 위험 3: API 라우트 누락

**리스크:** 현재 API 라우트가 구현되어 있지 않음

**완화:**
- ✅ API 라우트 신규 작성 필수
- ✅ forumService 기반 Controller 작성
- ✅ Postman/Swagger 테스트

---

### 위험 4: UI 의존성 문제

**리스크:** Admin UI가 공통 컴포넌트에 의존

**완화:**
- ✅ `@o4o/ui` 패키지 사용 (workspace dependency)
- ✅ pnpm workspace 설정 유지
- ✅ 빌드 시 번들링

---

## 11. DoD (Definition of Done)

### 앱 추출 완료 기준

- [ ] **코드 이동 완료**
  - [ ] Server 코드 (entities, service, controller, routes)
  - [ ] Admin UI 코드 (pages, widgets, api client)
  - [ ] Lifecycle 스크립트 (install, activate, deactivate, uninstall)
  - [ ] Migrations

- [ ] **Manifest 작성 완료**
  - [ ] 모든 필수 필드 작성
  - [ ] Permissions 정의
  - [ ] Routes 정의
  - [ ] Widgets, MenuItems 정의

- [ ] **빌드 및 패키징 완료**
  - [ ] TypeScript 빌드 성공
  - [ ] dist/ 생성 확인
  - [ ] 의존성 번들링 (선택)

- [ ] **테스트 통과**
  - [ ] 설치 테스트 (adoptExisting)
  - [ ] 활성화/비활성화 테스트
  - [ ] 제거 테스트 (keep-data, purge-data)
  - [ ] 기능 테스트 (게시글, 댓글, 카테고리)
  - [ ] 권한 테스트

- [ ] **코어 정리 완료**
  - [ ] Forum 관련 코드 제거
  - [ ] 빌드 성공
  - [ ] 테스트 통과 (Forum 없이)

- [ ] **문서화 완료**
  - [ ] README.md (앱 설명, 설치 방법)
  - [ ] CHANGELOG.md
  - [ ] 사용자 가이드

- [ ] **배포 완료**
  - [ ] 앱 마켓 등록
  - [ ] 테스트 설치 성공

---

## 12. 다음 액션

### 즉시 (오늘)

1. **본 조사 결과 검토**
2. **앱 마켓 인프라 구축 확인** (app-market_checklist.md 참조)
3. **추출 착수 여부 결정**

### 착수 전 (준비 단계)

1. **백업 계획 수립**
   - 프로덕션 DB 백업 스케줄
   - 롤백 절차 문서화

2. **테스트 환경 준비**
   - 로컬 환경 설정
   - 스테이징 환경 준비

3. **리소스 할당**
   - 개발자 배정
   - 일정 조율

### 완료 후

1. **포럼 앱 설치 및 검증**
2. **사용자 피드백 수집**
3. **다른 앱 추출 계획 (Crowdfunding, Signage 등)**

---

**조사 담당:** Claude Code (AI Assistant)
**완료 일자:** 2025-11-26
**검토자:** (사용자 검토 필요)
**다음 단계:** 앱 마켓 인프라 구축 → Forum 앱 추출 착수
