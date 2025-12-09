# Forum-Core Phase 1 Full Investigation Report

**Report Version:** 1.0
**Investigation Date:** 2025-12-07
**Investigator:** Rena (Claude Code)
**Scope:** forum-core 전수조사 (Backend, Services/Controllers, Lifecycle, Extension Points, Frontend Impact)

---

## Executive Summary

forum-core는 O4O Platform의 커뮤니티 포럼 엔진으로, 다음과 같은 구조로 구성되어 있습니다:

- **Package Path**: `/packages/forum-app`
- **App ID**: `forum-core`
- **Type**: Core App
- **Dependencies**: organization-core (RBAC 통합)
- **Extensions**: forum-neture, forum-yaksa

### 주요 발견사항 (Critical Findings)

1. ✅ **Backend 구조 안정**: Entity, Service, Permissions 모두 정상 구현
2. ⚠️ **API 라우트 누락**: 범용 forum-core API 엔드포인트가 routes.config.ts에 등록되지 않음
3. ✅ **Lifecycle 완성**: install/activate/deactivate/uninstall 모두 구현
4. ✅ **Extension 구조 명확**: forum-neture가 정상적으로 core 확장
5. ⚠️ **Admin UI CMS 비호환**: shadcn/ui 기반, CMS 통합 필요

---

## 1. Backend Entities & Schema Investigation

### 1.1 Entity 구조 분석

#### ForumPost (forum_post)
**파일**: `packages/forum-app/src/backend/entities/ForumPost.ts` (4149 bytes)

```typescript
@Entity('forum_post')
export class ForumPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 500 })
  title!: string;

  @Column({ type: 'text' })  // ⚠️ CMS Issue: Should be Block[]
  content!: string;

  @Column({ type: 'json', nullable: true })  // ⚠️ CMS Issue: Untyped metadata
  metadata?: Record<string, unknown>;

  @Column({ type: 'enum', enum: PostType, default: PostType.DISCUSSION })
  type!: PostType;

  @Column({ type: 'enum', enum: PostStatus, default: PostStatus.DRAFT })
  status!: PostStatus;

  @Column('simple-array', { nullable: true })
  tags?: string[];

  // Relationships
  @ManyToOne(() => ForumCategory, (category) => category.posts)
  @JoinColumn({ name: 'category_id' })
  category?: Promise<ForumCategory>;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author?: Promise<User>;

  @OneToMany(() => ForumComment, (comment) => comment.post)
  comments?: Promise<ForumComment[]>;

  // Organization-based permissions
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  // Stats
  viewCount: number = 0;
  commentCount: number = 0;
  likeCount: number = 0;
}
```

**Critical Issues:**
- ❌ `content` field is `text` type (not Block-based) → CMS V2 incompatible
- ❌ `metadata` is untyped `Record<string, unknown>` → Type safety issue
- ✅ Organization-based permissions properly implemented

---

#### ForumCategory (forum_category)
**파일**: `packages/forum-app/src/backend/entities/ForumCategory.ts` (2809 bytes)

```typescript
@Entity('forum_category')
export class ForumCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 200 })
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Hierarchy
  @ManyToOne(() => ForumCategory, (category) => category.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: ForumCategory;

  @OneToMany(() => ForumCategory, (category) => category.parent)
  children?: ForumCategory[];

  // Access control
  @Column({ type: 'enum', enum: AccessLevel, default: AccessLevel.ALL })
  accessLevel!: AccessLevel;

  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  // Methods
  canUserAccess(userRole: string): boolean { ... }
  canUserPost(userRole: string): boolean { ... }
}
```

**Key Features:**
- ✅ Hierarchical category structure (parent/children)
- ✅ Access level enum: 'all', 'member', 'business', 'admin'
- ✅ Organization-scoped categories

---

#### ForumComment (forum_comment)
**파일**: `packages/forum-app/src/backend/entities/ForumComment.ts` (2902 bytes)

```typescript
@Entity('forum_comment')
export class ForumComment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'enum', enum: CommentStatus, default: CommentStatus.PUBLISHED })
  status!: CommentStatus;

  // Nested comments
  @ManyToOne(() => ForumComment, (comment) => comment.replies, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: ForumComment;

  @OneToMany(() => ForumComment, (comment) => comment.parent)
  replies?: ForumComment[];

  // Methods
  extractMentions(): void { ... }
  canEdit(userId: string): boolean { ... }  // 24-hour limit
  softDelete(): void { ... }
}
```

**Key Features:**
- ✅ Nested comment structure (parent/replies)
- ✅ Mention extraction (`@username`)
- ✅ Time-based edit restriction (24 hours)
- ✅ Soft delete implementation

---

#### ForumTag (forum_tag)
**파일**: `packages/forum-app/src/backend/entities/ForumTag.ts` (1091 bytes)

```typescript
@Entity('forum_tag')
export class ForumTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  slug!: string;

  @Column()
  name!: string;

  @Column({ type: 'int', default: 0 })
  usageCount!: number;

  static generateSlug(name: string): string { ... }
}
```

**Key Features:**
- ✅ Simple tag structure with usage tracking
- ✅ Automatic slug generation

---

### 1.2 Schema Map (Entity Relationship Diagram)

```
┌─────────────────┐
│      User       │ (from api-server/entities/User.ts)
└────────┬────────┘
         │ author_id
         │
         ▼
┌─────────────────────────────┐
│        ForumPost            │
│─────────────────────────────│
│ id (uuid, PK)               │
│ title (varchar 500)         │
│ content (text) ⚠️           │
│ metadata (json) ⚠️          │
│ type (enum)                 │
│ status (enum)               │
│ slug (unique)               │
│ tags (array)                │
│ category_id (FK)            │
│ author_id (FK)              │
│ organizationId (FK)         │
│ viewCount, commentCount     │
│ isPinned, isClosed          │
│ createdAt, updatedAt        │
└──────────┬──────────────────┘
           │
           ├──────► ForumCategory (category_id)
           ├──────► ForumComment (post_id)
           └──────► Organization (organizationId)

┌─────────────────────────────┐
│     ForumCategory           │
│─────────────────────────────│
│ id (uuid, PK)               │
│ name (varchar 200)          │
│ slug (unique)               │
│ description (text)          │
│ parent_id (FK, self)        │
│ accessLevel (enum)          │
│ requireApproval (boolean)   │
│ organizationId (FK)         │
│ postCount, commentCount     │
│ isActive, sortOrder         │
└─────────────────────────────┘
           │
           └──────► ForumCategory (hierarchical)

┌─────────────────────────────┐
│     ForumComment            │
│─────────────────────────────│
│ id (uuid, PK)               │
│ content (text)              │
│ post_id (FK)                │
│ author_id (FK)              │
│ parent_id (FK, self)        │
│ status (enum)               │
│ mentions (array)            │
│ replyCount, likeCount       │
│ createdAt, updatedAt        │
└─────────────────────────────┘

┌─────────────────────────────┐
│       ForumTag              │
│─────────────────────────────│
│ id (uuid, PK)               │
│ name (varchar)              │
│ slug (unique)               │
│ usageCount (int)            │
│ isActive (boolean)          │
└─────────────────────────────┘
```

---

## 2. Services/Controllers/API Routes Investigation

### 2.1 Backend Service

**파일**: `packages/forum-app/src/backend/services/forum.service.ts` (670 lines)

#### ForumService Class

```typescript
export class ForumService {
  private categoryRepository = AppDataSource.getRepository(ForumCategory);
  private postRepository = AppDataSource.getRepository(ForumPost);
  private commentRepository = AppDataSource.getRepository(ForumComment);
  private tagRepository = AppDataSource.getRepository(ForumTag);
  private userRepository = AppDataSource.getRepository(User);

  // Category Methods
  async createCategory(data, creatorId): Promise<ForumCategory>
  async updateCategory(categoryId, data): Promise<ForumCategory | null>
  async getCategories(includeInactive, organizationId): Promise<ForumCategory[]>
  async getCategoryBySlug(slug): Promise<ForumCategory | null>

  // Post Methods
  async createPost(data, authorId): Promise<ForumPost>
  async updatePost(postId, data, userId, userRole): Promise<ForumPost | null>
  async getPost(postId, userId?): Promise<ForumPost | null>
  async getPostBySlug(slug, userId?): Promise<ForumPost | null>
  async searchPosts(options, userRole): Promise<{posts, totalCount, pagination}>

  // Comment Methods
  async createComment(data, authorId): Promise<ForumComment>
  async getComments(postId, page, limit): Promise<{comments, totalCount, pagination}>

  // Statistics
  async getForumStatistics(): Promise<ForumStatistics>
}
```

**Key Features:**
- ✅ Permission integration: Uses `canCreatePost`, `canManagePost`, etc.
- ✅ Cache integration: Uses `cacheService` for categories/stats
- ✅ Search/filter: Supports query, category, author, tags, date range
- ✅ Pagination: Built-in pagination support
- ✅ Sort modes: 'latest', 'popular', 'trending', 'oldest'

---

### 2.2 API Routes

#### ⚠️ Critical Issue: Missing Generic Forum API Routes

**Expected routes (from manifest.ts):**
```typescript
routes: [
  '/admin/forum',
  '/admin/forum/posts',
  '/admin/forum/posts/:id',
  '/admin/forum/posts/:id/edit',
  '/admin/forum/posts/new',
  '/admin/forum/categories',
  '/admin/forum/reports',
]
```

**Actual routes registered (in routes.config.ts):**
```typescript
// Line 474: Only Neture-specific routes
app.use('/api/v1/neture/forum', standardLimiter, netureForumRoutes);
```

**Impact:**
- ❌ Admin UI calls `/forum/*` endpoints that don't exist
- ❌ forumClient.ts expects `apiEndpoints.forum.*` that return 404
- ✅ Extension pattern works (Neture has its own routes)

---

#### Neture Forum Controller (Extension Example)

**파일**: `apps/api-server/src/controllers/neture/NetureForumController.ts`

```typescript
export class NetureForumController {
  private forumService: NetureForumService;

  constructor() {
    const forumPostRepository = AppDataSource.getRepository(ForumPost);
    this.forumService = new NetureForumService(forumPostRepository);
  }

  async listPosts(req, res): GET /api/v1/neture/forum/posts
  async getPost(req, res): GET /api/v1/neture/forum/posts/:id
  async createPost(req, res): POST /api/v1/neture/forum/posts (authenticated)
  async getProductPosts(req, res): GET /api/v1/neture/forum/posts/product/:productId
}
```

**Routes (neture/forum.routes.ts):**
```typescript
router.get('/health', controller.health);
router.get('/posts', controller.listPosts);  // Public
router.get('/posts/:id', controller.getPost);  // Public
router.get('/posts/product/:productId', controller.getProductPosts);  // Public
router.post('/posts', authenticate, controller.createPost);  // Authenticated
```

---

### 2.3 Admin UI API Client

**파일**: `apps/admin-dashboard/src/admin-ui/api/forumClient.ts`

```typescript
class ForumService {
  async getStats(): Promise<ForumStats> {
    const response = await api.get<ForumStats>(apiEndpoints.forum.stats);  // ❌ /forum/stats doesn't exist
    return response.data;
  }

  async getPosts(params?) { ... }  // ❌ /forum/posts doesn't exist
  async createPost(data) { ... }
  async updatePost(id, data) { ... }
  async deletePost(id) { ... }
  async getCategories() { ... }
  async getModerationQueue(params?) { ... }
  async bulkDeletePosts(ids) { ... }
}
```

**apiEndpoints (apps/admin-dashboard/src/config/apps.config.ts):**
```typescript
forum: {
  stats: '/forum/stats',  // ❌ Not registered
  posts: '/forum/posts',  // ❌ Not registered
  categories: '/forum/categories',  // ❌ Not registered
  users: '/forum/users',  // ❌ Not registered
  moderation: '/forum/moderation',  // ❌ Not registered
}
```

---

## 3. Lifecycle Investigation

### 3.1 Lifecycle Files

**Directory**: `packages/forum-app/src/lifecycle/`

#### install.ts
```typescript
export async function install(context: InstallContext): Promise<void> {
  // 1. Check for existing tables (adoptExistingTables support)
  // 2. Seed forum permissions
  // 3. Seed default categories (optional)
}
```

**Responsibilities:**
- ✅ Adopt existing forum tables if found
- ✅ Create forum permissions (forum.read, forum.write, forum.comment, forum.moderate, forum.admin)
- ✅ Seed default categories (공지사항, 자유게시판, 질문답변)

---

#### activate.ts
```typescript
export async function activate(context: ActivateContext): Promise<void> {
  // 1. Register admin menu
  // 2. Enable forum routes
  // 3. Clear caches
}
```

**Responsibilities:**
- ✅ Register forum menu in admin dashboard
- ✅ Enable routes: /admin/forum/*
- ✅ Clear forum caches (categories, stats, recent-posts)

---

#### deactivate.ts
```typescript
export async function deactivate(context: DeactivateContext): Promise<void> {
  // 1. Unregister admin menu
  // 2. Disable forum routes
  // 3. Clear caches
}
```

**Responsibilities:**
- ✅ Unregister forum menu
- ✅ Disable routes
- ✅ Clear caches
- ✅ Does NOT delete data (deactivate ≠ uninstall)

---

#### uninstall.ts
```typescript
export async function uninstall(context: UninstallContext): Promise<void> {
  // Optionally purge data (keep-data by default)
}
```

**Responsibilities:**
- ✅ Default mode: keep-data
- ✅ Optional: purge all forum tables (forum_like, forum_bookmark, forum_comment, forum_tag, forum_post, forum_category)
- ✅ Permissions removal handled by AppManager

---

## 4. Extension Points Investigation

### 4.1 Extension Structure

forum-core는 다음과 같은 extension 구조를 제공합니다:

1. **Service Extension**: NetureForumService extends core ForumService
2. **CPT Extension**: extendsCPT with ACF metadata
3. **UI Override**: adminRoutes to replace core UI
4. **Dependencies**: Manifest declares dependency on forum-core

---

### 4.2 Extension Example: forum-neture

**Package Path**: `/packages/forum-neture`

#### Manifest (forum-neture/src/manifest.ts)

```typescript
export const forumNetureManifest = {
  appId: 'forum-neture',
  name: 'Forum Extension – Neture Cosmetics',
  type: 'extension',
  version: '1.0.0',

  dependencies: {
    'forum-core': '>=1.0.0',  // ✅ Declares core dependency
  },

  // Extension does not own core tables
  ownsTables: [],

  // Extends forum_post CPT with cosmetics metadata
  extendsCPT: [
    {
      name: 'forum_post',
      acfGroup: 'cosmetic_meta',
    },
  ],

  // ACF group for cosmetics metadata
  acf: [
    {
      groupId: 'cosmetic_meta',
      label: '화장품 메타데이터',
      fields: [
        { key: 'skinType', type: 'select', options: ['건성', '지성', '복합성', '민감성'] },
        { key: 'concerns', type: 'multiselect', options: ['여드름', '주름', '미백', '모공', '탄력'] },
        { key: 'routine', type: 'array' },
        { key: 'productIds', type: 'array' },
      ],
    },
  ],

  // Override core admin UI
  adminRoutes: [
    {
      path: '/admin/forum',
      component: './admin-ui/pages/ForumNetureApp.js',
    },
  ],
}
```

---

#### NetureForumService (forum-neture/src/backend/services/NetureForumService.ts)

```typescript
export class NetureForumService {
  private forumPostRepository: Repository<ForumPost>;

  constructor(forumPostRepository: Repository<ForumPost>) {
    this.forumPostRepository = forumPostRepository;
  }

  // Extension-specific methods
  async listPosts(filter: PostFilter): Promise<ForumPost[]> {
    const queryBuilder = this.forumPostRepository
      .createQueryBuilder('post')
      .where("post.status = :status", { status: 'publish' });

    // ✅ Filter by skin type (Neture-specific)
    if (filter.skinType) {
      queryBuilder.andWhere(
        "post.metadata->'neture'->>'skinType' = :skinType",
        { skinType: filter.skinType }
      );
    }

    // ✅ Filter by concerns (Neture-specific)
    if (filter.concerns && filter.concerns.length > 0) {
      filter.concerns.forEach((concern, index) => {
        queryBuilder.andWhere(
          `post.metadata->'neture'->'concerns' ? :concern${index}`,
          { [`concern${index}`]: concern }
        );
      });
    }

    // ✅ Filter by product ID (Neture-specific)
    if (filter.productId) {
      queryBuilder.andWhere(
        "post.metadata->'neture'->'productIds' ? :productId",
        { productId: filter.productId }
      );
    }

    return await queryBuilder.getMany();
  }

  async createPost(data: CreatePostData): Promise<ForumPost> {
    const post = this.forumPostRepository.create({
      ...data,
      metadata: {
        neture: data.netureMeta || {},  // ✅ Neture-specific metadata
      },
    });
    return await this.forumPostRepository.save(post);
  }
}
```

**Extension Pattern:**
- ✅ Wraps ForumPost repository directly
- ✅ Adds Neture-specific filters (skinType, concerns, productIds)
- ✅ Stores extension metadata in `post.metadata.neture`
- ✅ Does NOT modify core entities or services

---

### 4.3 Extension Points Summary

| Extension Point | Type | Example (forum-neture) |
|----------------|------|------------------------|
| **Service Extension** | Wrap core entity repository | NetureForumService(ForumPost) |
| **Metadata Extension** | JSON field in core entity | `metadata.neture = {skinType, concerns, productIds}` |
| **CPT Extension** | ACF group declaration | `extendsCPT: ['forum_post']` |
| **UI Override** | Replace admin pages | `adminRoutes: ['/admin/forum']` |
| **API Extension** | New controller + routes | NetureForumController + /api/v1/neture/forum/* |
| **Dependencies** | Manifest declaration | `dependencies: {'forum-core': '>=1.0.0'}` |

---

## 5. Frontend Impact Investigation

### 5.1 Admin UI Structure

**Directory**: `packages/forum-app/src/admin-ui/`

```
admin-ui/
├── api/
│   ├── index.ts
│   └── forumClient.ts  (API client)
├── pages/
│   ├── ForumApp.tsx  (Main dashboard)
│   ├── ForumBoardList.tsx  (Post list)
│   ├── ForumPostDetail.tsx
│   ├── ForumPostForm.tsx
│   ├── ForumCategories.tsx
│   └── ForumReports.tsx
├── widgets/
│   ├── ForumStatsCard.tsx
│   └── index.ts
└── index.ts
```

---

### 5.2 UI Dependencies

#### ForumApp.tsx (Main Dashboard)
```typescript
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';  // ⚠️ Admin-dashboard shadcn/ui
import { MessageSquare, Users, FileText, Shield, Folder } from 'lucide-react';
```

**Features:**
- ✅ Stats cards (전체 게시글, 활성 사용자, 답글 수, 신고된 게시글)
- ✅ Forum categories list
- ✅ Quick actions menu
- ✅ Recent activity feed
- ❌ **CMS Issue**: Uses admin-dashboard UI components directly

---

#### ForumBoardList.tsx (Post List)
```typescript
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Button } from '@/components/ui/button';  // ⚠️ Admin-dashboard shadcn/ui
import { Input } from '@/components/ui/input';
import { DropdownMenu, Badge } from '@/components/ui/...';
```

**Features:**
- ✅ Category filter
- ✅ Status filter (published, draft, pending, reported)
- ✅ Search by title/content
- ✅ Pagination
- ❌ **API Issue**: Calls `/forum/posts` which doesn't exist

**API Calls:**
```typescript
// Fetch categories
const response = await authClient.api.get('/forum/categories');  // ❌ 404

// Fetch posts
const response = await authClient.api.get('/forum/posts?...');  // ❌ 404
```

---

### 5.3 Frontend CMS Compatibility Issues

| Component | Issue | CMS Impact |
|-----------|-------|------------|
| **ForumApp.tsx** | Uses admin-dashboard shadcn/ui | ❌ Not CMS Theme compatible |
| **ForumBoardList.tsx** | Hardcoded filters & search | ❌ No CMS Page Builder integration |
| **ForumPostForm.tsx** | Direct form rendering | ❌ No Block Editor integration |
| **ForumCategories.tsx** | Hardcoded category management | ❌ No CMS CPT UI integration |
| **forumClient.ts** | Expects /forum/* endpoints | ❌ Routes not registered |
| **All pages** | React Router routing | ❌ No CMS routing integration |

---

### 5.4 Frontend Dependencies

```json
{
  "dependencies": {
    "@o4o-apps/forum": "workspace:*"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-router-dom": "^6.0.0 || ^7.0.0"
  },
  "imports": {
    "@/components/ui/*": "admin-dashboard shadcn/ui components",
    "@o4o/auth-client": "authClient.api for API calls",
    "@tanstack/react-query": "React Query for data fetching",
    "lucide-react": "Icon library"
  }
}
```

---

## 6. API Flow Map

```
┌─────────────────────────────────────────────────────────────┐
│                      API Request Flow                        │
└─────────────────────────────────────────────────────────────┘

[Admin UI] forumClient.getPosts()
    │
    ├─► authClient.api.get('/forum/posts')  ❌ Route not registered
    │
    └─► Expected:
          GET /api/v1/forum/posts
          ├─► forumRoutes.ts
          ├─► ForumController.getPosts()
          ├─► forumService.searchPosts()
          ├─► ForumPost.repository.findAndCount()
          └─► Response: {posts, totalCount, pagination}

┌─────────────────────────────────────────────────────────────┐
│              Extension API Flow (Neture)                     │
└─────────────────────────────────────────────────────────────┘

[Neture Main Site] fetch('/api/v1/neture/forum/posts?skinType=dry')
    │
    ├─► netureForumRoutes.ts (Line 18)
    │     router.get('/posts', controller.listPosts)
    │
    ├─► NetureForumController.listPosts()
    │     const posts = await this.forumService.listPosts(filter);
    │
    ├─► NetureForumService.listPosts(filter)
    │     queryBuilder.andWhere("post.metadata->'neture'->>'skinType' = :skinType")
    │
    ├─► forumPostRepository.getMany()
    │
    └─► Response: ForumPost[] with Neture metadata

┌─────────────────────────────────────────────────────────────┐
│                    Permission Flow                           │
└─────────────────────────────────────────────────────────────┘

[User] createPost(data)
    │
    ├─► forumService.createPost(data, authorId)
    │     ├─► canCreatePost(dataSource, authorId, organizationId)
    │     │     └─► organization-core/canManageResource(userId, 'forum.write', orgId)
    │     │           └─► ✅ or ❌
    │     │
    │     ├─► ✅ Create post
    │     │     └─► postRepository.save(post)
    │     │
    │     └─► ❌ Throw error: "Permission denied"
    │
    └─► Response: ForumPost or Error

┌─────────────────────────────────────────────────────────────┐
│                    Cache Flow                                │
└─────────────────────────────────────────────────────────────┘

[User] getCategories()
    │
    ├─► forumService.getCategories(includeInactive, organizationId)
    │     ├─► Check cache: `forum_categories_${includeInactive}_${organizationId || 'all'}`
    │     │     ├─► Cache HIT: Return cached data
    │     │     └─► Cache MISS:
    │     │           ├─► Query database
    │     │           ├─► Save to cache (TTL: 10 minutes)
    │     │           └─► Return data
    │     │
    │     └─► Response: ForumCategory[]
    │
    └─► Cache invalidation:
          ├─► createCategory() → invalidateCategoryCache()
          └─► updateCategory() → invalidateCategoryCache()
```

---

## 7. Critical Issues & Recommendations

### 7.1 P0 (Critical - Must Fix)

#### Issue 1: Missing Forum API Routes
**Problem**: Admin UI expects `/forum/*` endpoints but they're not registered in routes.config.ts

**Impact**:
- ❌ All admin UI API calls return 404
- ❌ forumClient.ts completely broken
- ❌ Admin dashboard cannot manage forum

**Solution**:
```typescript
// apps/api-server/src/routes/forum.routes.ts (NEW FILE)
import { Router } from 'express';
import { ForumController } from '../controllers/forum.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
const controller = new ForumController();

// Stats
router.get('/stats', authenticate, controller.getStats);

// Posts
router.get('/posts', controller.getPosts);
router.get('/posts/:id', controller.getPost);
router.post('/posts', authenticate, controller.createPost);
router.put('/posts/:id', authenticate, controller.updatePost);
router.delete('/posts/:id', authenticate, controller.deletePost);

// Categories
router.get('/categories', controller.getCategories);
router.post('/categories', authenticate, controller.createCategory);
router.put('/categories/:id', authenticate, controller.updateCategory);
router.delete('/categories/:id', authenticate, controller.deleteCategory);

// Moderation
router.get('/moderation', authenticate, controller.getModerationQueue);
router.post('/moderation/:id', authenticate, controller.moderateContent);

export default router;

// apps/api-server/src/config/routes.config.ts
import forumRoutes from '../routes/forum.routes.js';

app.use('/api/v1/forum', standardLimiter, forumRoutes);  // ADD THIS LINE
```

---

#### Issue 2: Content Field Not Block-Based
**Problem**: `ForumPost.content` is `text` type, not `Block[]`

**Impact**:
- ❌ Cannot use CMS Block Editor
- ❌ No rich content support
- ❌ Incompatible with CMS V2 architecture

**Solution**:
```typescript
// packages/forum-app/src/backend/entities/ForumPost.ts
@Column({ type: 'jsonb' })
content!: Block[];  // Block[] from @o4o/types

interface Block {
  type: string;
  content: string;
  metadata?: Record<string, unknown>;
}
```

---

### 7.2 P1 (High Priority)

#### Issue 3: Untyped Metadata
**Problem**: `metadata: Record<string, unknown>` is not type-safe

**Solution**:
```typescript
interface ForumPostMetadata {
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  featured?: {
    imageId?: string;
    videoId?: string;
  };
  extensions?: {
    neture?: NetureMetadata;
    yaksa?: YaksaMetadata;
  };
}

@Column({ type: 'jsonb', nullable: true })
metadata?: ForumPostMetadata;
```

---

#### Issue 4: Admin UI CMS Integration
**Problem**: Admin UI uses admin-dashboard components directly

**Solution**:
- Use CMS Design Token system
- Implement CMS Theme compatibility
- Migrate to CMS UI components

---

### 7.3 P2 (Medium Priority)

#### Issue 5: No Public UI Templates
**Problem**: forum-core has no public-facing UI (only admin UI)

**Solution**:
- Create `/templates` directory in forum-app
- Implement View Templates for:
  - Forum home page
  - Category listing
  - Post detail
  - Post list
  - Comment section

---

#### Issue 6: Routing Not CMS-Compatible
**Problem**: Uses React Router, not CMS routing conventions

**Solution**:
- Implement CMS Page Builder integration
- Support `/view/:pageId` routing
- Dynamic page loading via CMS

---

## 8. Estimated Refactoring Timeline

| Phase | Work Items | Estimated Time |
|-------|-----------|----------------|
| **Phase 1: API Routes** | Create ForumController + routes.ts | 1-2 days |
| **Phase 2: Block Content** | Migrate content field to Block[] | 2-3 days |
| **Phase 3: Metadata Typing** | Define ForumPostMetadata interface | 1 day |
| **Phase 4: Public UI** | Create View Templates | 1 week |
| **Phase 5: CMS Integration** | CMS routing, Page Builder, Theme | 1-2 weeks |
| **Phase 6: Testing** | E2E tests, extension tests | 3-5 days |
| **Total** | | **4-6 weeks** |

---

## 9. Next Steps

### Immediate Actions (This Week)
1. ✅ Phase 1 investigation completed
2. Create ForumController and register routes
3. Test API endpoints with admin UI

### Short-term (Next 2 Weeks)
1. Migrate content field to Block[]
2. Define ForumPostMetadata interface
3. Create schema migration

### Medium-term (Next 4-6 Weeks)
1. Implement Public UI templates
2. CMS integration (routing, Page Builder, Theme)
3. Update extensions (forum-neture, forum-yaksa)

---

## 10. Conclusion

forum-core는 **backend 구조는 안정적**이지만, **API 라우트 누락**과 **CMS 호환성 부족**이라는 critical issue가 있습니다.

**우선순위:**
1. **P0**: API routes 등록 (1-2일) → Admin UI 즉시 사용 가능
2. **P0**: Block-based content migration (2-3일) → CMS V2 호환
3. **P1**: Public UI templates (1주) → 사용자 대면 UI
4. **P2**: CMS 통합 (1-2주) → Page Builder, Theme, Routing

**Extension 구조는 우수**하며, forum-neture가 이미 정상적으로 core를 확장하고 있습니다. 이 extension 패턴을 forum-yaksa에도 동일하게 적용 가능합니다.

---

**Report End**
Generated by: Rena (Claude Code)
Date: 2025-12-07
