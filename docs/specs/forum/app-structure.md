# Forum App 패키지 구조 설계

**작성일**: 2025-11-29
**목적**: Forum 앱을 독립적인 패키지로 분리하기 위한 구조 설계 문서

---

## 1. 패키지 개요

### 1.1 기본 정보

```json
{
  "name": "@o4o/forum-app",
  "version": "1.0.0",
  "description": "Community forum application for O4O Platform",
  "appId": "forum",
  "type": "module"
}
```

### 1.2 설계 원칙

1. **모듈화**: 프론트엔드/백엔드/공유 코드를 명확히 분리
2. **독립성**: 코어 플랫폼에 대한 의존성 최소화
3. **재사용성**: 다른 앱에서도 활용 가능한 컴포넌트 분리
4. **확장성**: 플러그인 형태로 기능 추가 가능한 구조
5. **타입 안전성**: TypeScript 타입 정의를 공유 패키지로 분리

---

## 2. 디렉토리 구조

### 2.1 전체 구조

```
packages/forum-app/
├── package.json              # 패키지 메타데이터
├── manifest.ts               # 앱 매니페스트 (라우트, 권한, 메뉴 정의)
├── README.md                 # 앱 설명서
├── CHANGELOG.md              # 변경 이력
│
├── frontend/                 # 프론트엔드 코드
│   ├── pages/                # 페이지 컴포넌트
│   │   ├── Dashboard.tsx     # Forum 대시보드 (통계, 빠른 작업)
│   │   ├── BoardList.tsx     # 게시글 목록
│   │   ├── PostDetail.tsx    # 게시글 상세
│   │   ├── PostForm.tsx      # 게시글 작성/수정
│   │   ├── Categories.tsx    # 카테고리 관리
│   │   └── Reports.tsx       # 신고 관리/모더레이션
│   │
│   ├── components/           # 재사용 컴포넌트
│   │   ├── PostCard/         # 게시글 카드
│   │   │   ├── index.tsx
│   │   │   ├── PostCard.module.css
│   │   │   └── PostCard.test.tsx
│   │   ├── CommentList/      # 댓글 목록
│   │   ├── CommentForm/      # 댓글 작성 폼
│   │   ├── CategorySelect/   # 카테고리 선택
│   │   ├── TagInput/         # 태그 입력
│   │   ├── PostEditor/       # 게시글 에디터
│   │   ├── ModerationQueue/  # 모더레이션 큐
│   │   └── StatsCard/        # 통계 카드 (대시보드용)
│   │
│   ├── hooks/                # React 커스텀 훅
│   │   ├── useForumStats.ts  # Forum 통계 조회
│   │   ├── usePosts.ts       # 게시글 CRUD
│   │   ├── usePost.ts        # 게시글 상세
│   │   ├── useCategories.ts  # 카테고리 관리
│   │   ├── useComments.ts    # 댓글 관리
│   │   ├── useTags.ts        # 태그 관리
│   │   └── useModeration.ts  # 모더레이션
│   │
│   ├── api/                  # API 클라이언트
│   │   ├── forum-client.ts   # Forum API 클라이언트
│   │   └── types.ts          # API 요청/응답 타입
│   │
│   ├── routes/               # 라우트 정의
│   │   └── index.tsx         # Forum 앱 라우터
│   │
│   └── utils/                # 유틸리티 함수
│       ├── slug.ts           # Slug 생성
│       ├── sanitize.ts       # HTML sanitization
│       └── validation.ts     # 입력 검증
│
├── backend/                  # 백엔드 코드
│   ├── entities/             # TypeORM 엔티티
│   │   ├── ForumPost.ts
│   │   ├── ForumCategory.ts
│   │   ├── ForumComment.ts
│   │   └── ForumTag.ts
│   │
│   ├── controllers/          # API 컨트롤러
│   │   ├── forum.controller.ts           # Public API
│   │   ├── forum-admin.controller.ts     # Admin API
│   │   └── forum-moderation.controller.ts # Moderation API
│   │
│   ├── services/             # 비즈니스 로직
│   │   ├── forum.service.ts           # 메인 서비스
│   │   ├── post.service.ts            # 게시글 관리
│   │   ├── category.service.ts        # 카테고리 관리
│   │   ├── comment.service.ts         # 댓글 관리
│   │   ├── tag.service.ts             # 태그 관리
│   │   ├── moderation.service.ts      # 모더레이션
│   │   └── statistics.service.ts      # 통계
│   │
│   ├── routes/               # API 라우트
│   │   ├── forum.routes.ts         # Public routes
│   │   └── admin-forum.routes.ts   # Admin routes
│   │
│   ├── dto/                  # Data Transfer Objects
│   │   ├── create-post.dto.ts
│   │   ├── update-post.dto.ts
│   │   ├── create-category.dto.ts
│   │   ├── update-category.dto.ts
│   │   ├── create-comment.dto.ts
│   │   └── search-posts.dto.ts
│   │
│   ├── validators/           # 입력 검증
│   │   ├── post.validator.ts
│   │   ├── category.validator.ts
│   │   └── comment.validator.ts
│   │
│   ├── migrations/           # 데이터베이스 마이그레이션
│   │   ├── 001_create_forum_tables.ts
│   │   ├── 002_add_forum_indexes.ts
│   │   └── 003_seed_initial_categories.ts
│   │
│   └── utils/                # 백엔드 유틸리티
│       ├── slug.ts           # Slug 생성
│       ├── sanitize.ts       # XSS 방지
│       └── pagination.ts     # 페이지네이션
│
├── shared/                   # 프론트엔드/백엔드 공유 코드
│   ├── types/                # 타입 정의
│   │   ├── post.types.ts
│   │   ├── category.types.ts
│   │   ├── comment.types.ts
│   │   ├── tag.types.ts
│   │   ├── statistics.types.ts
│   │   └── index.ts
│   │
│   ├── constants/            # 상수
│   │   ├── post-types.ts
│   │   ├── post-statuses.ts
│   │   ├── access-levels.ts
│   │   └── permissions.ts
│   │
│   └── utils/                # 공통 유틸리티
│       ├── slug.ts           # Slug 생성 (공통)
│       └── validation.ts     # 검증 로직 (공통)
│
├── tests/                    # 테스트 코드
│   ├── unit/                 # 단위 테스트
│   │   ├── frontend/
│   │   └── backend/
│   ├── integration/          # 통합 테스트
│   └── e2e/                  # E2E 테스트
│
└── docs/                     # 문서
    ├── api.md                # API 문서
    ├── architecture.md       # 아키텍처 설명
    ├── development.md        # 개발 가이드
    └── deployment.md         # 배포 가이드
```

---

## 3. 주요 파일 상세

### 3.1 manifest.ts

```typescript
import { AppManifest } from '@o4o/types';

export const forumManifest: AppManifest = {
  // 기본 정보
  appId: 'forum',
  name: 'Forum',
  version: '1.0.0',
  description: 'Community forum with posts, comments, categories, and tags',
  author: 'O4O Platform Team',

  // 라우트 정의
  routes: [
    // Admin routes
    {
      path: '/forum',
      component: 'frontend/pages/Dashboard.tsx',
      permissions: ['forum.read'],
      appGuard: true,  // 앱 활성화 시에만 접근 가능
    },
    {
      path: '/forum/posts/new',
      component: 'frontend/pages/PostForm.tsx',
      permissions: ['forum.write'],
      appGuard: true,
    },
    {
      path: '/forum/posts/:id',
      component: 'frontend/pages/PostDetail.tsx',
      permissions: ['forum.read'],
      appGuard: true,
    },
    {
      path: '/forum/posts/:id/edit',
      component: 'frontend/pages/PostForm.tsx',
      permissions: ['forum.write'],
      appGuard: true,
    },
    {
      path: '/forum/categories',
      component: 'frontend/pages/Categories.tsx',
      permissions: ['forum.admin'],
      appGuard: true,
    },
    {
      path: '/forum/reports',
      component: 'frontend/pages/Reports.tsx',
      permissions: ['forum.moderate'],
      appGuard: true,
    },
  ],

  // 메뉴 정의
  menu: {
    id: 'forum',
    label: '포럼',
    icon: 'MessageSquare',
    path: '/forum',
    position: 100,  // 메뉴 순서
    children: [
      {
        id: 'forum-dashboard',
        label: '대시보드',
        icon: 'LayoutDashboard',
        path: '/forum',
      },
      {
        id: 'forum-posts',
        label: '게시글 관리',
        icon: 'FileText',
        path: '/forum',  // BoardList 표시
      },
      {
        id: 'forum-categories',
        label: '카테고리',
        icon: 'Folder',
        path: '/forum/categories',
      },
      {
        id: 'forum-reports',
        label: '신고 검토',
        icon: 'Shield',
        path: '/forum/reports',
        badge: 'pendingModeration',  // 대기 중인 신고 수 표시
      },
    ],
  },

  // 권한 정의
  permissions: [
    {
      id: 'forum.read',
      name: 'View Forum',
      description: 'View forum posts and comments',
      roles: ['all'],
    },
    {
      id: 'forum.write',
      name: 'Write Forum Posts',
      description: 'Create and edit forum posts',
      roles: ['customer', 'business', 'affiliate', 'admin', 'manager'],
    },
    {
      id: 'forum.moderate',
      name: 'Moderate Forum',
      description: 'Review reports and moderate content',
      roles: ['admin', 'manager'],
    },
    {
      id: 'forum.admin',
      name: 'Administer Forum',
      description: 'Manage categories and forum settings',
      roles: ['admin', 'manager'],
    },
  ],

  // API 엔드포인트 정의
  api: {
    baseUrl: '/api/v1/forum',
    endpoints: [
      // Public endpoints
      'GET /posts',
      'POST /posts',
      'GET /posts/:id',
      'PUT /posts/:id',
      'DELETE /posts/:id',
      'GET /categories',
      'GET /posts/:id/comments',
      'POST /posts/:id/comments',

      // Admin endpoints
      'GET /admin/stats',
      'POST /admin/categories',
      'PUT /admin/categories/:id',
      'DELETE /admin/categories/:id',
      'GET /admin/moderation',
      'POST /admin/moderation/:id/approve',
      'POST /admin/moderation/:id/reject',
    ],
  },

  // 데이터베이스 마이그레이션
  migrations: [
    'backend/migrations/001_create_forum_tables.ts',
    'backend/migrations/002_add_forum_indexes.ts',
    'backend/migrations/003_seed_initial_categories.ts',
  ],

  // 의존성
  dependencies: {
    core: {
      '@o4o/auth-client': '^1.0.0',
      '@o4o/types': '^1.0.0',
    },
    peer: {
      'react': '^18.0.0',
      'react-router-dom': '^6.0.0',
      '@tanstack/react-query': '^5.0.0',
      'typeorm': '^0.3.0',
    },
  },

  // 설정
  settings: {
    // 기본 카테고리
    defaultCategories: [
      { name: '일반 토론', slug: 'general', accessLevel: 'all' },
      { name: '제품 리뷰', slug: 'reviews', accessLevel: 'member' },
      { name: 'Q&A', slug: 'qna', accessLevel: 'all' },
      { name: '공지사항', slug: 'announcements', accessLevel: 'all' },
    ],

    // 기능 플래그
    features: {
      comments: true,
      likes: true,
      reports: true,
      tags: true,
      moderation: true,
      notifications: false,  // 향후 지원
    },

    // 제한
    limits: {
      postTitleMaxLength: 200,
      postContentMaxLength: 50000,
      commentMaxLength: 5000,
      tagsPerPost: 5,
      postsPerPage: 20,
      commentsPerPage: 20,
    },
  },

  // 위젯 (대시보드 등에 표시)
  widgets: [
    {
      id: 'forum-stats',
      name: 'Forum Statistics',
      component: 'frontend/components/StatsCard',
      positions: ['main-dashboard'],
      size: 'medium',
    },
  ],
};

export default forumManifest;
```

---

### 3.2 package.json

```json
{
  "name": "@o4o/forum-app",
  "version": "1.0.0",
  "description": "Community forum application for O4O Platform",
  "type": "module",
  "main": "./manifest.ts",
  "exports": {
    ".": "./manifest.ts",
    "./frontend": "./frontend/index.ts",
    "./backend": "./backend/index.ts",
    "./shared": "./shared/index.ts"
  },
  "scripts": {
    "build": "tsc && vite build",
    "test": "vitest",
    "test:unit": "vitest run --dir tests/unit",
    "test:integration": "vitest run --dir tests/integration",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@o4o/auth-client": "workspace:*",
    "@o4o/types": "workspace:*"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-router-dom": "^6.0.0",
    "@tanstack/react-query": "^5.0.0",
    "typeorm": "^0.3.0",
    "express": "^4.18.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@playwright/test": "^1.40.0",
    "eslint": "^8.0.0"
  }
}
```

---

### 3.3 frontend/routes/index.tsx

```typescript
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppRouteGuard } from '@o4o/admin-dashboard/components';

// Lazy load pages
const Dashboard = lazy(() => import('../pages/Dashboard'));
const BoardList = lazy(() => import('../pages/BoardList'));
const PostDetail = lazy(() => import('../pages/PostDetail'));
const PostForm = lazy(() => import('../pages/PostForm'));
const Categories = lazy(() => import('../pages/Categories'));
const Reports = lazy(() => import('../pages/Reports'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-96">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export const ForumRoutes = () => {
  return (
    <AppRouteGuard appId="forum">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/posts" element={<BoardList />} />
          <Route path="/posts/new" element={<PostForm />} />
          <Route path="/posts/:id" element={<PostDetail />} />
          <Route path="/posts/:id/edit" element={<PostForm />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Suspense>
    </AppRouteGuard>
  );
};

export default ForumRoutes;
```

---

### 3.4 backend/index.ts

```typescript
import { Express } from 'express';
import { AppDataSource } from '@o4o/api-server/database/connection';
import forumRoutes from './routes/forum.routes';
import adminForumRoutes from './routes/admin-forum.routes';
import { ForumService } from './services/forum.service';

/**
 * Forum App Backend Entry Point
 *
 * 앱이 활성화되면 이 함수가 호출되어 라우트를 등록합니다.
 */
export function registerForumApp(app: Express) {
  // 서비스 초기화
  const forumService = new ForumService(AppDataSource);

  // Public routes
  app.use('/api/v1/forum', forumRoutes);

  // Admin routes
  app.use('/api/v1/admin/forum', adminForumRoutes);

  console.log('[Forum App] Routes registered');
}

/**
 * 앱 비활성화 시 정리 작업
 */
export function unregisterForumApp() {
  console.log('[Forum App] Cleanup completed');
}

// 엔티티 export (TypeORM이 자동으로 로드)
export * from './entities/ForumPost';
export * from './entities/ForumCategory';
export * from './entities/ForumComment';
export * from './entities/ForumTag';

// 서비스 export
export * from './services/forum.service';
```

---

### 3.5 shared/types/index.ts

```typescript
// Post types
export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'publish',
  PENDING = 'pending',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

export enum PostType {
  DISCUSSION = 'discussion',
  QUESTION = 'question',
  ANNOUNCEMENT = 'announcement',
  POLL = 'poll',
  GUIDE = 'guide',
}

export interface ForumPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  type: PostType;
  status: PostStatus;
  categoryId: string;
  authorId: string;
  isPinned: boolean;
  isLocked: boolean;
  allowComments: boolean;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  publishedAt?: Date;
  lastCommentAt?: Date;
  lastCommentBy?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  category?: ForumCategory;
  author?: User;
  comments?: ForumComment[];
  lastCommenter?: User;
}

// Category types
export enum AccessLevel {
  ALL = 'all',
  MEMBER = 'member',
  BUSINESS = 'business',
  ADMIN = 'admin',
}

export interface ForumCategory {
  id: string;
  name: string;
  description?: string;
  slug: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  requireApproval: boolean;
  accessLevel: AccessLevel;
  postCount: number;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  creator?: User;
  posts?: ForumPost[];
}

// Comment types
export enum CommentStatus {
  PUBLISHED = 'publish',
  PENDING = 'pending',
  REJECTED = 'rejected',
  DELETED = 'deleted',
}

export interface ForumComment {
  id: string;
  postId: string;
  parentId?: string;
  authorId: string;
  content: string;
  status: CommentStatus;
  likeCount: number;
  replyCount: number;
  mentions?: string[];
  createdAt: Date;
  updatedAt: Date;

  // Relations
  post?: ForumPost;
  parent?: ForumComment;
  author?: User;
  replies?: ForumComment[];
}

// Statistics types
export interface ForumStatistics {
  totalPosts: number;
  totalComments: number;
  totalUsers: number;
  todayPosts: number;
  todayComments: number;
  popularTags: Array<{ name: string; count: number }>;
  activeCategories: Array<{ name: string; postCount: number }>;
  topContributors: Array<{
    userId: string;
    username: string;
    postCount: number;
    commentCount: number;
  }>;
}
```

---

## 4. 코어 플랫폼과의 통합

### 4.1 앱 등록 (API 서버)

```typescript
// apps/api-server/src/app-manifests/index.ts
import { forumManifest } from '@o4o/forum-app';

export const appCatalog = [
  forumManifest,
  // ... 다른 앱들
];
```

### 4.2 라우트 등록 (Admin Dashboard)

```typescript
// apps/admin-dashboard/src/App.tsx
import { ForumRoutes } from '@o4o/forum-app/frontend';

function App() {
  return (
    <Routes>
      {/* ... 다른 라우트들 */}
      <Route path="/forum/*" element={<ForumRoutes />} />
    </Routes>
  );
}
```

### 4.3 엔티티 등록 (TypeORM)

```typescript
// apps/api-server/src/database/connection.ts
import { ForumPost, ForumCategory, ForumComment, ForumTag } from '@o4o/forum-app/backend';

export const AppDataSource = new DataSource({
  entities: [
    // ... 코어 엔티티들
    ForumPost,
    ForumCategory,
    ForumComment,
    ForumTag,
  ],
});
```

---

## 5. 빌드 및 배포

### 5.1 개발 모드

```bash
# Forum App 패키지 빌드
cd packages/forum-app
pnpm build

# 전체 프로젝트에서 사용
cd ../../apps/admin-dashboard
pnpm dev  # Forum 앱 자동으로 로드됨
```

### 5.2 프로덕션 빌드

```bash
# Monorepo 루트에서
pnpm build  # 모든 패키지 빌드 (forum-app 포함)
```

### 5.3 독립 배포 (선택사항)

Forum App을 별도 NPM 패키지로 배포하여 다른 O4O 플랫폼 인스턴스에서도 사용 가능:

```bash
cd packages/forum-app
pnpm publish --access public
```

---

## 6. 테스트 전략

### 6.1 단위 테스트

```typescript
// tests/unit/frontend/hooks/usePosts.test.ts
import { renderHook } from '@testing-library/react';
import { usePosts } from '@o4o/forum-app/frontend/hooks';

describe('usePosts', () => {
  it('should fetch posts', async () => {
    const { result } = renderHook(() => usePosts());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });
});
```

### 6.2 통합 테스트

```typescript
// tests/integration/backend/post.test.ts
import request from 'supertest';
import { app } from '@o4o/api-server';

describe('POST /api/v1/forum/posts', () => {
  it('should create a new post', async () => {
    const response = await request(app)
      .post('/api/v1/forum/posts')
      .set('Authorization', 'Bearer token')
      .send({
        title: 'Test Post',
        content: 'Test Content',
        categoryId: 'category-id',
      });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Test Post');
  });
});
```

---

## 7. 마이그레이션 로드맵

### Phase 1: 준비 (현재)
- [x] 프론트엔드 코드 조사
- [x] 백엔드 코드 조사
- [x] 의존성 분석
- [x] 패키지 구조 설계

### Phase 2: 패키지 생성
- [ ] `packages/forum-app` 디렉토리 생성
- [ ] `package.json`, `manifest.ts` 작성
- [ ] 디렉토리 구조 생성

### Phase 3: 코드 이동
- [ ] 백엔드 엔티티 이동
- [ ] 백엔드 서비스 이동
- [ ] 프론트엔드 페이지 이동
- [ ] API 클라이언트 이동
- [ ] 공유 타입 정의

### Phase 4: 통합
- [ ] 코어 플랫폼에 패키지 통합
- [ ] 라우트 등록
- [ ] 메뉴 등록
- [ ] 테스트 작성

### Phase 5: 정리
- [ ] CPT-ACF 방식 코드 제거
- [ ] 중복 코드 제거
- [ ] 문서 작성
- [ ] 배포 테스트

---

## 8. 체크리스트

### 패키지 설정
- [ ] `package.json` 작성
- [ ] `manifest.ts` 작성
- [ ] `README.md` 작성
- [ ] `.gitignore` 설정
- [ ] TypeScript 설정
- [ ] ESLint 설정

### 프론트엔드
- [ ] 모든 페이지 컴포넌트 이동
- [ ] 모든 재사용 컴포넌트 이동
- [ ] 모든 훅 이동
- [ ] API 클라이언트 이동
- [ ] 라우트 설정
- [ ] 스타일 파일 이동

### 백엔드
- [ ] 모든 엔티티 이동
- [ ] 모든 서비스 이동
- [ ] 컨트롤러 생성
- [ ] 라우트 생성
- [ ] DTO 생성
- [ ] Validator 생성
- [ ] 마이그레이션 이동

### 공유 코드
- [ ] 타입 정의
- [ ] 상수 정의
- [ ] 공통 유틸리티

### 통합
- [ ] 앱 카탈로그에 등록
- [ ] 라우트 등록
- [ ] 메뉴 등록
- [ ] 엔티티 등록

### 테스트
- [ ] 단위 테스트 작성
- [ ] 통합 테스트 작성
- [ ] E2E 테스트 작성
- [ ] 테스트 실행 확인

### 문서
- [ ] API 문서
- [ ] 개발 가이드
- [ ] 배포 가이드
- [ ] CHANGELOG

---

**문서 끝**
