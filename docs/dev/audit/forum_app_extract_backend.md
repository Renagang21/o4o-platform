# Forum App 백엔드 코드 추출 현황

**작성일**: 2025-11-29
**목적**: Forum 앱을 별도 패키지로 분리하기 위한 백엔드 파일 목록 및 의존성 조사

---

## 1. 백엔드 파일 목록

### 1.1 엔티티 (TypeORM Entities)

#### `/apps/api-server/src/entities/`

| 파일 | 테이블명 | 주요 컬럼 | 관계 |
|------|----------|-----------|------|
| `ForumPost.ts` | `forum_post` | id, title, slug, content, excerpt, type, status, categoryId, authorId, isPinned, isLocked, viewCount, commentCount, likeCount, tags | ↔ ForumCategory, User, ForumComment |
| `ForumCategory.ts` | `forum_category` | id, name, description, slug, color, sortOrder, isActive, requireApproval, accessLevel, postCount | ↔ ForumPost, User |
| `ForumComment.ts` | `forum_comment` | id, postId, parentId, authorId, content, status, likeCount, replyCount, mentions | ↔ ForumPost, User |
| `ForumTag.ts` | `forum_tag` | id, name, slug, description, usageCount, isActive | ↔ ForumPost (many-to-many) |

**상세 정보**:

#### ForumPost 엔티티
```typescript
enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'publish',
  PENDING = 'pending',
  REJECTED = 'rejected',
  ARCHIVED = 'archived'
}

enum PostType {
  DISCUSSION = 'discussion',
  QUESTION = 'question',
  ANNOUNCEMENT = 'announcement',
  POLL = 'poll',
  GUIDE = 'guide'
}

// 주요 메서드
- canUserView(userRole: string): boolean
- canUserEdit(userId: string, userRole: string): boolean
- canUserComment(userRole: string): boolean
- incrementViewCount(): void
- incrementCommentCount(userId: string): void
- publish(): void
- generateSlug(): string
```

#### ForumCategory 엔티티
```typescript
// accessLevel 타입
enum: ['all', 'member', 'business', 'admin']

// 주요 메서드
- canUserAccess(userRole: string): boolean
- canUserPost(userRole: string): boolean
- incrementPostCount(): void
- decrementPostCount(): void
```

**이동 대상**: Forum App 패키지 `backend/entities/`

---

### 1.2 서비스 (Services)

#### `/apps/api-server/src/services/forumService.ts`

**주요 기능**:
```typescript
export class ForumService {
  // Category Methods
  createCategory(data, creatorId): Promise<ForumCategory>
  updateCategory(categoryId, data): Promise<ForumCategory | null>
  getCategories(includeInactive): Promise<ForumCategory[]>
  getCategoryBySlug(slug): Promise<ForumCategory | null>

  // Post Methods
  createPost(data, authorId): Promise<ForumPost>
  updatePost(postId, data, userId, userRole): Promise<ForumPost | null>
  getPost(postId, userId?): Promise<ForumPost | null>
  getPostBySlug(slug, userId?): Promise<ForumPost | null>
  searchPosts(options, userRole): Promise<{ posts, totalCount, pagination }>

  // Comment Methods
  createComment(data, authorId): Promise<ForumComment>
  getComments(postId, page, limit): Promise<{ comments, totalCount, pagination }>

  // Statistics
  getForumStatistics(): Promise<ForumStatistics>

  // Helper Methods (private)
  - generateSlug(text): string
  - processTags(tags): Promise<void>
  - updateCategoryStats(categoryId, action): Promise<void>
  - updatePostStats(postId, action, userId?): Promise<void>
  - incrementPostViews(postId): Promise<void>
  - getPopularTags(limit): Promise<Array<{ name, count }>>
  - getActiveCategories(limit): Promise<Array<{ name, postCount }>>
  - getTopContributors(limit): Promise<Array<{ userId, username, postCount, commentCount }>>
}
```

**의존성**:
- `AppDataSource` - TypeORM 연결
- `cacheService` - 캐싱 (Redis)
- TypeORM Repositories: ForumCategory, ForumPost, ForumComment, ForumTag, User

**이동 대상**: Forum App 패키지 `backend/services/`

---

### 1.3 컨트롤러 (Controllers)

**현재 상태**: 별도 컨트롤러 없음

**API 엔드포인트 위치**:
- 현재는 `routes/v1/apps.routes.ts` 또는 직접 라우트에서 처리
- 컨트롤러 계층 추가 필요

**향후 추가 필요**:
```
backend/controllers/
├── forum.controller.ts        # 일반 사용자용 Forum API
├── forum-admin.controller.ts  # 관리자용 Forum API
└── forum-moderation.controller.ts  # 모더레이션 API
```

---

### 1.4 라우트 (Routes)

#### 검색 결과

Forum 관련 라우트가 명시적으로 정의된 파일 없음.

**추정 위치**:
- `routes/v1/apps.routes.ts` - 앱 관련 API 라우트
- `routes/services.ts` - 서비스 라우트

**필요한 라우트 구조**:
```typescript
// GET /api/v1/forum/stats
// GET /api/v1/forum/posts
// POST /api/v1/forum/posts
// GET /api/v1/forum/posts/:id
// PUT /api/v1/forum/posts/:id
// DELETE /api/v1/forum/posts/:id

// GET /api/v1/forum/categories
// POST /api/v1/forum/categories
// GET /api/v1/forum/categories/:id
// PUT /api/v1/forum/categories/:id
// DELETE /api/v1/forum/categories/:id

// GET /api/v1/forum/posts/:postId/comments
// POST /api/v1/forum/posts/:postId/comments
// PUT /api/v1/forum/comments/:id
// DELETE /api/v1/forum/comments/:id

// GET /api/v1/forum/moderation
// POST /api/v1/forum/moderation/:id/approve
// POST /api/v1/forum/moderation/:id/reject
```

**이동 대상**: Forum App 패키지 `backend/routes/`

---

### 1.5 App Manifest

#### `/apps/api-server/src/app-manifests/forum.manifest.ts`

```typescript
export const forumManifest: AppManifest = {
  appId: 'forum',
  name: 'Forum',
  version: '1.0.0',
  description: 'Community forum with posts, comments, categories, and tags',

  routes: [
    '/forum',
    '/forum/posts',
    '/forum/posts/:id',
    '/forum/categories',
    '/forum/categories/:id',
    '/admin/forum',
    '/admin/forum/posts',
    '/admin/forum/categories',
    '/admin/forum/comments',
  ],

  permissions: [
    'forum.read',
    'forum.write',
    'forum.moderate',
    'forum.admin',
  ],
};
```

**이동 대상**: Forum App 패키지 루트 `manifest.ts`

---

### 1.6 마이그레이션 (Migrations)

#### `/apps/api-server/src/migrations/create-forum-tables.ts`

**예상 내용**:
```sql
CREATE TABLE forum_category (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100),
  description TEXT,
  slug VARCHAR(200) UNIQUE,
  color VARCHAR(50),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  require_approval BOOLEAN DEFAULT FALSE,
  access_level VARCHAR(20) DEFAULT 'all',
  post_count INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE forum_post (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200),
  slug VARCHAR(250) UNIQUE,
  content TEXT,
  excerpt TEXT,
  type VARCHAR(50) DEFAULT 'discussion',
  status VARCHAR(50) DEFAULT 'publish',
  category_id UUID REFERENCES forum_category(id),
  author_id UUID REFERENCES user(id),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  allow_comments BOOLEAN DEFAULT TRUE,
  view_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  tags TEXT[],
  metadata JSONB,
  published_at TIMESTAMP,
  last_comment_at TIMESTAMP,
  last_comment_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE forum_comment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES forum_post(id),
  parent_id UUID REFERENCES forum_comment(id),
  author_id UUID REFERENCES user(id),
  content TEXT,
  status VARCHAR(50) DEFAULT 'publish',
  like_count INT DEFAULT 0,
  reply_count INT DEFAULT 0,
  mentions UUID[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE forum_tag (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50),
  slug VARCHAR(100) UNIQUE,
  description TEXT,
  usage_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**이동 대상**: Forum App 패키지 `backend/migrations/`

---

## 2. 의존성 분석

### 2.1 코어 의존성 (분리 불가)

| 의존성 | 용도 | 위치 | 비고 |
|--------|------|------|------|
| `AppDataSource` | TypeORM 데이터베이스 연결 | `database/connection.ts` | ❌ 코어 유지 |
| `CacheService` | Redis 캐싱 | `services/CacheService.ts` | ❌ 코어 유지 |
| `User` Entity | 사용자 정보 | `entities/User.ts` | ❌ 코어 유지 |
| 인증/권한 미들웨어 | JWT 검증, RBAC | `middleware/` | ❌ 코어 유지 |
| `menu.service.ts` | 메뉴 관리 | `services/menu.service.ts` | ❌ 코어 유지 |

### 2.2 Forum 전용 의존성 (분리 가능)

| 의존성 | 용도 | 이동 대상 |
|--------|------|-----------|
| Forum 엔티티 | 데이터 모델 | ✅ Forum App 패키지 |
| Forum 서비스 | 비즈니스 로직 | ✅ Forum App 패키지 |
| Forum 컨트롤러 | API 엔드포인트 | ✅ Forum App 패키지 |
| Forum 마이그레이션 | DB 스키마 | ✅ Forum App 패키지 |

### 2.3 공유 유틸리티

| 유틸리티 | 용도 | 위치 | 분리 여부 |
|----------|------|------|-----------|
| Slug 생성 | URL 친화적 문자열 | Forum 서비스 내부 | ⚠️ 공통 유틸로 추출 고려 |
| 페이지네이션 | 목록 페이징 | 서비스 내부 | ⚠️ 공통 유틸로 추출 고려 |
| 검색 쿼리 빌더 | 동적 WHERE 절 | 서비스 내부 | ✅ Forum 전용 유지 |

---

## 3. API 엔드포인트 설계

### 3.1 현재 정의된 엔드포인트

#### 프론트엔드 `apps.config.ts`에서 정의:
```typescript
forum: {
  stats: '/forum/stats',
  posts: '/forum/posts',
  categories: '/forum/categories',
  users: '/forum/users',
  moderation: '/forum/moderation',
}
```

### 3.2 완전한 API 엔드포인트 목록

#### Public API (일반 사용자)

```
GET    /api/v1/forum/posts              # 게시글 목록
POST   /api/v1/forum/posts              # 게시글 작성
GET    /api/v1/forum/posts/:id          # 게시글 상세
PUT    /api/v1/forum/posts/:id          # 게시글 수정
DELETE /api/v1/forum/posts/:id          # 게시글 삭제

GET    /api/v1/forum/categories         # 카테고리 목록
GET    /api/v1/forum/categories/:id     # 카테고리 상세

GET    /api/v1/forum/posts/:id/comments # 댓글 목록
POST   /api/v1/forum/posts/:id/comments # 댓글 작성
PUT    /api/v1/forum/comments/:id       # 댓글 수정
DELETE /api/v1/forum/comments/:id       # 댓글 삭제

GET    /api/v1/forum/tags               # 태그 목록
GET    /api/v1/forum/tags/:slug         # 태그별 게시글
```

#### Admin API (관리자)

```
GET    /api/v1/admin/forum/stats        # Forum 통계
POST   /api/v1/admin/forum/categories   # 카테고리 생성
PUT    /api/v1/admin/forum/categories/:id # 카테고리 수정
DELETE /api/v1/admin/forum/categories/:id # 카테고리 삭제

GET    /api/v1/admin/forum/moderation   # 모더레이션 큐
POST   /api/v1/admin/forum/moderation/:id/approve # 승인
POST   /api/v1/admin/forum/moderation/:id/reject  # 거부

POST   /api/v1/admin/forum/posts/bulk/delete      # 일괄 삭제
POST   /api/v1/admin/forum/posts/bulk/move        # 일괄 이동
```

---

## 4. 데이터베이스 스키마

### 4.1 테이블 목록

| 테이블명 | 용도 | 레코드 수 (예상) | 인덱스 |
|----------|------|------------------|--------|
| `forum_category` | 카테고리 | ~50 | slug, isActive + sortOrder |
| `forum_post` | 게시글 | ~10,000+ | categoryId + status + isPinned + createdAt |
| `forum_comment` | 댓글 | ~50,000+ | postId + parentId + status |
| `forum_tag` | 태그 | ~500 | slug, usageCount |

### 4.2 주요 인덱스

```sql
-- ForumPost 복합 인덱스
CREATE INDEX idx_forum_post_category_status
ON forum_post(category_id, status, is_pinned, created_at);

-- ForumCategory 인덱스
CREATE INDEX idx_forum_category_active_order
ON forum_category(is_active, sort_order);

-- ForumComment 인덱스
CREATE INDEX idx_forum_comment_post
ON forum_comment(post_id, parent_id, status);
```

### 4.3 외래 키 관계

```
forum_post.category_id  → forum_category.id
forum_post.author_id    → user.id
forum_post.last_comment_by → user.id

forum_comment.post_id   → forum_post.id
forum_comment.parent_id → forum_comment.id (self-reference)
forum_comment.author_id → user.id

forum_category.created_by → user.id
```

---

## 5. 비즈니스 로직 분석

### 5.1 권한 제어 (RBAC)

#### ForumCategory 접근 제어
```typescript
accessLevel: 'all' | 'member' | 'business' | 'admin'

canUserAccess(userRole: string): boolean {
  switch (this.accessLevel) {
    case 'all': return true;
    case 'member': return ['customer', 'business', 'affiliate', 'admin', 'manager'].includes(userRole);
    case 'business': return ['business', 'affiliate', 'admin', 'manager'].includes(userRole);
    case 'admin': return ['admin', 'manager'].includes(userRole);
  }
}
```

#### ForumPost 권한 체크
```typescript
canUserView(userRole: string): boolean {
  if (status !== PUBLISHED) return ['admin', 'manager'].includes(userRole);
  return true;
}

canUserEdit(userId: string, userRole: string): boolean {
  if (['admin', 'manager'].includes(userRole)) return true;
  if (authorId === userId && !isLocked) return true;
  return false;
}
```

### 5.2 승인 워크플로우

```typescript
// 카테고리별 승인 설정
if (category.requireApproval) {
  post.status = PostStatus.PENDING;
} else {
  post.status = PostStatus.PUBLISHED;
  post.publishedAt = new Date();
}
```

### 5.3 통계 업데이트

```typescript
// 게시글 작성 시
- category.incrementPostCount()
- tag.usageCount++

// 댓글 작성 시
- post.incrementCommentCount(userId)
- post.lastCommentAt = new Date()
- post.lastCommentBy = userId
- category.incrementCommentCount()  # (현재 미구현)

// 조회수 증가
- post.incrementViewCount()  # (작성자 제외)
```

---

## 6. 캐싱 전략

### 6.1 캐싱 대상

| 데이터 | 캐시 키 | TTL | 무효화 시점 |
|--------|---------|-----|-------------|
| 카테고리 목록 | `forum_categories_{includeInactive}` | 10분 | 카테고리 생성/수정/삭제 |
| Forum 통계 | `forum_statistics` | 5분 | 게시글/댓글 생성 시 |
| 인기 태그 | (통계 내부) | 5분 | 통계 새로고침 시 |
| 활성 카테고리 | (통계 내부) | 5분 | 통계 새로고침 시 |

### 6.2 캐시 무효화

```typescript
private async invalidateCategoryCache(): Promise<void> {
  await cacheService.del('forum_categories_true');
  await cacheService.del('forum_categories_false');
}

private async invalidatePostCache(categoryId: string): Promise<void> {
  // 향후 구현: 패턴 매칭으로 관련 캐시 일괄 삭제
  // await cacheService.delPattern(`forum_posts_${categoryId}*`);
}
```

---

## 7. 성능 최적화

### 7.1 쿼리 최적화

#### 게시글 목록 조회
```typescript
// Lazy loading 사용
@ManyToOne('ForumCategory', { lazy: true })
category?: Promise<ForumCategory>;

// 필요 시 명시적 join
queryBuilder
  .leftJoinAndSelect('post.category', 'category')
  .leftJoinAndSelect('post.author', 'author')
  .leftJoinAndSelect('post.lastCommenter', 'lastCommenter');
```

#### 인기도/트렌딩 계산
```typescript
// 인기도 = viewCount * 0.1 + commentCount * 2 + likeCount * 1.5
.addSelect('(post.viewCount * 0.1 + post.commentCount * 2 + post.likeCount * 1.5)', 'popularity')
.orderBy('popularity', 'DESC')

// 트렌딩 = 인기도 / 경과 시간 (일 단위)
.addSelect(
  '(post.viewCount * 0.1 + post.commentCount * 2 + post.likeCount * 1.5) / EXTRACT(epoch FROM (NOW() - post.createdAt)) * 86400',
  'trending'
)
```

### 7.2 N+1 쿼리 방지

```typescript
// ❌ N+1 발생
const posts = await postRepo.find();
for (const post of posts) {
  const category = await post.category;  // N개의 추가 쿼리
}

// ✅ Join 사용
const posts = await postRepo.find({
  relations: ['category', 'author']
});
```

---

## 8. 보안 고려사항

### 8.1 입력 검증

- XSS 방지: HTML 컨텐츠 sanitize
- SQL Injection 방지: TypeORM 파라미터 바인딩 사용
- CSRF 방지: 토큰 검증

### 8.2 권한 검증

```typescript
// 모든 CUD 작업에 권한 체크 필수
if (!post.canUserEdit(userId, userRole)) {
  throw new Error('Insufficient permissions');
}
```

### 8.3 Rate Limiting

- 게시글 작성: 10분당 5개
- 댓글 작성: 분당 10개
- 조회: 분당 100회

---

## 9. Forum App 패키지화 시 이동 대상

### ✅ 완전 이동 가능

```
apps/api-server/src/
├── entities/
│   ├── ForumPost.ts
│   ├── ForumCategory.ts
│   ├── ForumComment.ts
│   └── ForumTag.ts
├── services/
│   └── forumService.ts
├── app-manifests/
│   └── forum.manifest.ts
└── migrations/
    └── create-forum-tables.ts
```

### ⚠️ 신규 생성 필요

```
Forum App 패키지/backend/
├── controllers/
│   ├── forum.controller.ts
│   ├── forum-admin.controller.ts
│   └── forum-moderation.controller.ts
├── routes/
│   ├── forum.routes.ts
│   └── admin-forum.routes.ts
├── dto/
│   ├── create-post.dto.ts
│   ├── update-post.dto.ts
│   ├── create-category.dto.ts
│   └── create-comment.dto.ts
└── validators/
    ├── post.validator.ts
    └── category.validator.ts
```

### ❌ 코어에 유지

```
apps/api-server/src/
├── database/connection.ts
├── services/CacheService.ts
├── entities/User.ts
├── middleware/auth.middleware.ts
└── middleware/rbac.middleware.ts
```

---

## 10. 마이그레이션 체크리스트

### 백엔드 마이그레이션

- [ ] Forum 엔티티 4개를 Forum App 패키지로 이동
- [ ] Forum 서비스를 Forum App 패키지로 이동
- [ ] Forum 컨트롤러 신규 생성 (3개)
- [ ] Forum 라우트 신규 생성 (2개)
- [ ] DTO/Validator 클래스 신규 생성
- [ ] 마이그레이션 파일 이동
- [ ] App Manifest를 루트로 이동
- [ ] 코어 의존성 최소화 및 인터페이스 정의

### 테스트

- [ ] 모든 API 엔드포인트 정상 작동 확인
- [ ] 권한 제어 동작 확인 (RBAC)
- [ ] 승인 워크플로우 동작 확인
- [ ] 통계 업데이트 동작 확인
- [ ] 캐싱 동작 확인
- [ ] 성능 테스트 (N+1 쿼리 확인)
- [ ] 마이그레이션 롤백 테스트

---

**문서 끝**
