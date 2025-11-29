# Forum App Structure Summary

**Date**: 2025-11-29
**Investigation**: Core/Extension App Structure Audit
**Purpose**: Establish standard patterns for Dropshipping Core/Derived apps

---

## Executive Summary

The Forum app ecosystem demonstrates a **Core + Extension pattern** where:
- **forum-core**: Base engine owning all forum data tables (posts, categories, comments, tags)
- **forum-neture**: Cosmetics-specific extension adding metadata via ACF
- **forum-yaksa**: Pharmacy-specific extension with custom tables + ACF metadata

### Key Metrics

| Package | Source Files | Lines of Code | Type | Dependencies |
|---------|-------------|---------------|------|--------------|
| `forum-app` | 140 files | ~6,500 LOC | Core | none |
| `forum-neture` | 107 files | ~2,000 LOC | Extension | `forum-core >=1.0.0` |
| `forum-yaksa` | 118 files | ~3,500 LOC | Extension | `forum-core >=1.0.0` |

---

## 1. Forum Core App Structure

### Directory Tree

```
/packages/forum-app/
├── package.json                    # @o4o-apps/forum v0.1.0
├── tsconfig.json
├── src/
│   ├── manifest.ts                 # Core app manifest (135 lines)
│   ├── index.ts                    # Main export
│   │
│   ├── backend/
│   │   ├── entities/              # TypeORM entities (6 files)
│   │   │   ├── ForumPost.ts       # Post entity (162 lines)
│   │   │   ├── ForumCategory.ts   # Category entity (100 lines)
│   │   │   ├── ForumComment.ts    # Comment entity
│   │   │   ├── ForumTag.ts        # Tag entity
│   │   │   └── index.ts
│   │   │
│   │   └── services/              # Business logic (1 service)
│   │       ├── forum.service.ts   # Core service (613 lines)
│   │       └── index.ts
│   │
│   ├── admin-ui/                  # Admin interface
│   │   ├── api/
│   │   │   ├── forumClient.ts     # API client
│   │   │   └── index.ts
│   │   ├── pages/                 # 6 page components
│   │   │   ├── ForumApp.tsx       # Main dashboard (285 lines)
│   │   │   ├── ForumBoardList.tsx # Post list
│   │   │   ├── ForumPostDetail.tsx
│   │   │   ├── ForumPostForm.tsx
│   │   │   ├── ForumCategories.tsx
│   │   │   └── ForumReports.tsx
│   │   └── widgets/               # Reusable components
│   │       ├── ForumStatsCard.tsx
│   │       └── index.ts
│   │
│   ├── lifecycle/                 # Installation hooks
│   │   ├── install.ts             # Install hook (169 lines)
│   │   ├── activate.ts
│   │   ├── deactivate.ts
│   │   └── uninstall.ts           # Uninstall hook (134 lines)
│   │
│   └── migrations/                # Database migrations
│       └── 001-create-forum-tables.ts  # Creates 6 tables (554 lines)
```

### Core Tables Owned

```mermaid
erDiagram
    forum_category ||--o{ forum_post : contains
    forum_post ||--o{ forum_comment : has
    forum_comment ||--o{ forum_comment : replies_to
    forum_post }o--o{ forum_tag : tagged_with
    user ||--o{ forum_post : creates
    user ||--o{ forum_comment : writes
    user ||--o{ forum_like : likes
    user ||--o{ forum_bookmark : bookmarks

    forum_category {
        uuid id PK
        varchar name
        varchar slug UK
        text description
        varchar color
        int sortOrder
        boolean isActive
        boolean requireApproval
        enum accessLevel
        int postCount
        uuid createdBy FK
        timestamp createdAt
        timestamp updatedAt
    }

    forum_post {
        uuid id PK
        varchar title
        varchar slug UK
        text content
        text excerpt
        enum type
        enum status
        uuid categoryId FK
        uuid authorId FK
        boolean isPinned
        boolean isLocked
        boolean allowComments
        int viewCount
        int commentCount
        int likeCount
        array tags
        json metadata
        timestamp publishedAt
        timestamp lastCommentAt
        uuid lastCommentBy FK
        timestamp createdAt
        timestamp updatedAt
    }

    forum_comment {
        uuid id PK
        uuid postId FK
        uuid authorId FK
        text content
        enum status
        uuid parentId FK
        int depth
        int likeCount
        int replyCount
        boolean isEdited
        timestamp editedAt
        timestamp deletedAt
        uuid deletedBy FK
        text deletionReason
        timestamp createdAt
        timestamp updatedAt
    }

    forum_tag {
        uuid id PK
        varchar name UK
        varchar slug UK
        text description
        varchar color
        int usageCount
        boolean isActive
        timestamp createdAt
        timestamp updatedAt
    }

    forum_like {
        uuid id PK
        uuid userId FK
        enum targetType
        uuid targetId
        timestamp createdAt
    }

    forum_bookmark {
        uuid id PK
        uuid userId FK
        uuid postId FK
        text notes
        array tags
        timestamp createdAt
        timestamp updatedAt
    }
```

---

## 2. Extension Pattern Structure

### Forum Neture (Cosmetics Extension)

```
/packages/forum-neture/
├── package.json                    # Depends on @o4o-apps/forum
├── src/
│   ├── manifest.ts                 # Extension manifest (104 lines)
│   ├── index.ts
│   │
│   ├── backend/
│   │   └── services/
│   │       └── NetureForumService.ts  # Extended service
│   │
│   └── admin-ui/
│       └── pages/
│           ├── ForumNetureApp.tsx     # Override main page
│           ├── NetureForumDashboard.tsx
│           ├── NetureForumPostDetail.tsx
│           └── NetureForumPostForm.tsx
```

**Extension Features**:
- No owned tables (pure extension)
- Extends `forum_post` via ACF metadata:
  - `skinType`: select (건성/지성/복합성/민감성)
  - `concerns`: multiselect (여드름/주름/미백/모공/탄력)
  - `routine`: array (routine steps)
  - `productIds`: array (related product IDs)
- Overrides admin UI with cosmetics-specific interface
- Provides `defaultConfig` with branded categories

### Forum Yaksa (Pharmacy Extension)

```
/packages/forum-yaksa/
├── package.json                    # Depends on @o4o-apps/forum
├── src/
│   ├── manifest.ts                 # Extension manifest (111 lines)
│   ├── index.ts
│   │
│   ├── backend/
│   │   ├── entities/              # Extension-specific tables
│   │   │   ├── YaksaCommunity.ts  # Community entity (67 lines)
│   │   │   └── YaksaCommunityMember.ts
│   │   └── services/
│   │       └── YaksaCommunityService.ts
│   │
│   ├── admin-ui/
│   │   └── pages/                 # 5 custom pages
│   │       ├── ForumYaksaApp.tsx
│   │       ├── YaksaCommunityDashboard.tsx
│   │       ├── YaksaCommunityDetail.tsx
│   │       ├── YaksaCommunityFeed.tsx
│   │       └── YaksaCommunityList.tsx
│   │
│   └── migrations/                # Extension migrations
│       ├── 001-create-yaksa-community-tables.ts
│       └── 002-add-require-approval-to-community.ts
```

**Extension Features**:
- Owns extension-specific tables:
  - `yaksa_forum_community`
  - `yaksa_forum_community_member`
- Extends `forum_post` via ACF metadata:
  - `drugName`: string
  - `drugCode`: string (EDI code)
  - `category`: select (복약지도/부작용/상호작용/조제)
  - `severity`: select (일반/주의/경고)
  - `caseStudy`: boolean
- Custom UI for community management
- Requires approval for posts (`requireApproval: true`)

---

## 3. Core vs Extension Relationship

```mermaid
graph TB
    subgraph Core["forum-core (Engine)"]
        CoreManifest[manifest.ts<br/>type: 'core']
        CoreTables[(6 Core Tables<br/>forum_post, forum_category, etc.)]
        CoreEntities[TypeORM Entities]
        CoreServices[ForumService]
        CoreUI[Admin UI Pages]
        CoreLifecycle[Lifecycle Hooks]
        CoreMigrations[Migrations]
    end

    subgraph NetureExt["forum-neture (Cosmetics)"]
        NetureManifest[manifest.ts<br/>type: 'extension'<br/>dependencies: forum-core]
        NetureACF[ACF Metadata<br/>skinType, concerns, routine]
        NetureUI[Custom UI<br/>Cosmetics Theme]
        NetureConfig[defaultConfig<br/>Categories & Branding]
    end

    subgraph YaksaExt["forum-yaksa (Pharmacy)"]
        YaksaManifest[manifest.ts<br/>type: 'extension'<br/>dependencies: forum-core]
        YaksaTables[(Extension Tables<br/>yaksa_community, etc.)]
        YaksaACF[ACF Metadata<br/>drugName, severity, etc.]
        YaksaUI[Custom UI<br/>Community Management]
        YaksaMigrations[Extension Migrations]
    end

    CoreManifest --> CoreTables
    CoreManifest --> CoreEntities
    CoreManifest --> CoreServices
    CoreManifest --> CoreUI
    CoreManifest --> CoreLifecycle
    CoreManifest --> CoreMigrations

    NetureManifest -.depends on.-> CoreManifest
    NetureACF -.extends.-> CoreTables
    NetureUI -.overrides.-> CoreUI

    YaksaManifest -.depends on.-> CoreManifest
    YaksaTables -.augments.-> CoreTables
    YaksaACF -.extends.-> CoreTables
    YaksaUI -.overrides.-> CoreUI
    YaksaMigrations -.extends.-> CoreMigrations

    style Core fill:#e1f5e1,stroke:#4caf50,stroke-width:2px
    style NetureExt fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    style YaksaExt fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
```

---

## 4. Manifest Field Breakdown

### Core App Manifest Fields

```typescript
// forum-core/src/manifest.ts
{
  // Identity
  appId: 'forum-core',
  name: 'Forum Core',
  type: 'core',                    // Marks as core engine
  version: '1.0.0',
  description: '커뮤니티 포럼 코어 엔진',

  // Uninstall Policy
  uninstallPolicy: {
    defaultMode: 'keep-data',      // Default: preserve data
    allowPurge: true,              // Allow purge if requested
    autoBackup: true               // Create backup before uninstall
  },

  // Data Ownership (CRITICAL)
  ownsTables: [
    'forum_post',
    'forum_category',
    'forum_comment',
    'forum_tag',
    'forum_like',
    'forum_bookmark'
  ],

  // CPT Definitions
  cpt: [
    {
      name: 'forum_post',
      storage: 'entity',           // Uses TypeORM entity
      primaryKey: 'id',
      label: '포럼 게시글',
      supports: ['title', 'content', 'author', 'categories', 'tags', 'comments']
    },
    // ... 3 more CPT definitions
  ],

  // ACF Groups (core provides base)
  acf: [],                         // Empty - extensions add ACF

  // Routes
  routes: [
    '/admin/forum',
    '/admin/forum/posts',
    '/admin/forum/posts/:id',
    '/admin/forum/posts/:id/edit',
    '/admin/forum/posts/new',
    '/admin/forum/categories',
    '/admin/forum/reports'
  ],

  // Permissions
  permissions: [
    'forum.read',
    'forum.write',
    'forum.comment',
    'forum.moderate',
    'forum.admin'
  ],

  // Lifecycle Hooks
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js'
  },

  // Installation Options
  installOptions: {
    adoptExistingTables: true,     // Adopt existing tables
    keepDataOnUninstall: true      // Default keep mode
  },

  // Menu Definition
  menu: {
    id: 'forum',
    label: '포럼',
    icon: 'MessageSquare',
    path: '/forum',
    position: 100,
    children: [ /* 4 menu items */ ]
  }
}
```

### Extension Manifest Fields

```typescript
// forum-neture/src/manifest.ts
{
  // Identity
  appId: 'forum-neture',
  name: 'Forum Extension – Neture Cosmetics',
  type: 'extension',               // Marks as extension
  version: '1.0.0',

  // Core Dependency (CRITICAL)
  dependencies: {
    'forum-core': '>=1.0.0'        // Requires forum-core
  },

  // Uninstall Policy
  uninstallPolicy: {
    defaultMode: 'keep-data',
    allowPurge: true,
    autoBackup: false              // Extension data less critical
  },

  // Extension Tables
  ownsTables: [],                  // No tables owned (pure extension)

  // Extend Core CPT
  extendsCPT: [
    {
      name: 'forum_post',          // Extend forum_post
      acfGroup: 'cosmetic_meta'    // Add ACF group
    }
  ],

  // ACF Metadata
  acf: [
    {
      groupId: 'cosmetic_meta',
      label: '화장품 메타데이터',
      fields: [
        { key: 'skinType', type: 'select', label: '피부 타입', options: [...] },
        { key: 'concerns', type: 'multiselect', label: '피부 고민', options: [...] },
        { key: 'routine', type: 'array', label: '루틴 단계' },
        { key: 'productIds', type: 'array', label: '관련 제품 ID' }
      ]
    }
  ],

  // Admin UI Override
  adminRoutes: [
    {
      path: '/admin/forum',
      component: './admin-ui/pages/ForumNetureApp.js'
    }
  ],

  // Default Configuration
  defaultConfig: {
    categories: [
      { name: '공지사항', slug: 'announcements', color: '#FF6B6B' },
      { name: '사용후기', slug: 'reviews', color: '#4ECDC4' },
      // ... 2 more categories
    ],
    skin: 'neture',
    brandColor: '#8B7355',
    accentColor: '#E8B4B8'
  },

  // Inherit Permissions
  permissions: [],                 // Inherit from core

  // Use Core Menu
  menu: null                       // Use core menu with theme
}
```

---

## 5. Installation Flow (Current Behavior)

```mermaid
sequenceDiagram
    participant User
    participant AppManager
    participant DependencyResolver
    participant OwnershipResolver
    participant AppRegistry
    participant DB

    User->>AppManager: install('forum-neture')

    AppManager->>DependencyResolver: resolveInstallOrder('forum-neture')
    DependencyResolver->>DependencyResolver: Load manifest<br/>Check dependencies: forum-core
    DependencyResolver->>AppRegistry: Check if forum-core installed
    DependencyResolver-->>AppManager: ['forum-core', 'forum-neture']

    loop For each app in order
        AppManager->>AppManager: installSingleApp(appId)
        AppManager->>AppManager: Load manifest from local
        AppManager->>OwnershipResolver: validateOwnership(manifest)
        OwnershipResolver->>DB: Check table ownership conflicts
        OwnershipResolver-->>AppManager: Validation passed

        AppManager->>AppRegistry: Create/Update registry entry
        AppRegistry->>DB: INSERT/UPDATE app_registry

        Note over AppManager: TODO: Run lifecycle.install()
        Note over AppManager: TODO: Run migrations
    end

    AppManager->>AppManager: activate('forum-core')
    AppManager->>AppRegistry: Update status to 'active'
    AppManager->>AppManager: activate('forum-neture')
    AppManager->>AppRegistry: Update status to 'active'

    Note over AppManager: Routes NOT registered<br/>Menu NOT created<br/>CPT NOT loaded<br/>ACF NOT loaded

    AppManager-->>User: Installation complete
```

---

## 6. What Works vs What Doesn't

### ✅ Currently Working

| Feature | Status | Evidence |
|---------|--------|----------|
| Dependency Resolution | ✅ Working | `AppDependencyResolver` resolves install order |
| Ownership Validation | ✅ Working | `AppTableOwnershipResolver` prevents conflicts |
| Registry Management | ✅ Working | `AppRegistry` tracks installed apps |
| Manifest Loading | ✅ Working | `loadLocalManifest()` loads manifests |
| Install/Uninstall | ✅ Working | Basic install/uninstall flow complete |
| Data Purge | ✅ Working | `AppDataCleaner` purges tables on uninstall |

### ❌ Not Working (Disconnected)

| Feature | Status | Issue |
|---------|--------|-------|
| Lifecycle Hooks | ❌ Not Executed | TODO comment in AppManager line 136, 321 |
| Migrations | ❌ Not Executed | TODO comment in AppManager line 137 |
| CPT Registration | ❌ Not Loaded | No CPT loader in AppManager |
| ACF System | ❌ Not Loaded | No ACF processor in AppManager |
| Route Registration | ❌ Hardcoded | Routes declared but not registered |
| Menu Creation | ❌ Not Created | Menu declared but not processed |
| Admin UI Loading | ❌ Not Dynamic | UI components not loaded from manifest |

---

## 7. Key Takeaways for Dropshipping Apps

### Core App Requirements

1. **Must declare `type: 'core'`**
2. **Must list ALL owned tables in `ownsTables`**
3. **Must define CPT schemas** (even if not loaded yet)
4. **Must provide lifecycle hooks** (install/activate/deactivate/uninstall)
5. **Must provide migrations** to create tables
6. **Should define permissions**
7. **Should define menu structure**

### Extension App Requirements

1. **Must declare `type: 'extension'`**
2. **Must declare dependency on core app** in `dependencies`
3. **Can own extension-specific tables** (list in `ownsTables`)
4. **Must use `extendsCPT` to add metadata** to core CPTs
5. **Must define ACF groups** for metadata fields
6. **Can override admin UI** via `adminRoutes`
7. **Should provide `defaultConfig`** for service-specific settings
8. **Should NOT duplicate core functionality**

### Critical Pattern: Separation of Concerns

```
CORE owns:
- Base tables (forum_post, forum_category, etc.)
- Core business logic (ForumService)
- Base admin UI
- Permissions
- Migrations

EXTENSION adds:
- Metadata to core tables (via ACF)
- Extension-specific tables (yaksa_community)
- Custom UI (override core pages)
- Service-specific configuration
- Extension migrations (if needed)

EXTENSION does NOT:
- Own core tables
- Modify core table schemas
- Delete core data
```

---

## Next Steps

See the detailed investigation report and patterns document for:
- Complete manifest field analysis
- Code-level implementation details
- Exact patterns for Dropshipping apps
- Installation testing scenarios
