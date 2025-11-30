# O4O Platform App Store - Phase 1 Structure Audit

**Version:** 1.0.0
**Date:** 2025-11-30
**Branch:** develop
**Audit Type:** Comprehensive Architecture Investigation
**Scope:** App Store Engine, Registered Apps, Integration Patterns, UX Analysis

---

## Executive Summary

The O4O Platform App Store is a **feature-level application management system** that enables modular installation and lifecycle management of business applications. It implements a **Core/Extension pattern** allowing vertical-specific customizations (e.g., forum-neture for cosmetics, forum-yaksa for pharmacy).

### Key Findings

✅ **Strengths:**
- Well-structured dependency resolution with topological sorting and cycle detection
- Strong ownership validation preventing data corruption
- Clean Core/Extension pattern enabling vertical customization
- Automated lifecycle hooks and permission registration (Task A-4)
- Type-safe manifest system

⚠️ **Limitations:**
- Static catalog (4 apps only) - no remote app store
- Missing digitalsignage manifest implementation
- Routes and menus not dynamically loaded from manifests
- ACF schemas registered but not consumed by Admin UI
- No app sandboxing or runtime isolation

🔴 **Critical Gaps:**
- App Store is designed for feature-level apps but has confusion with AI Service apps
- Two different "app" systems coexist: App Store (feature apps) vs App Services (AI integrations)
- Branch/chapter multi-tenancy not considered in app design

---

## 1. App Store Engine Structure

### 1.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Admin Dashboard (React)                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ AppStorePage.tsx │  │ adminAppsApi     │  │ AI Services   │ │
│  │ (Feature Apps)   │  │                  │  │ Page (AI Apps)│ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Server (Node/Express)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ apps.routes.ts                                           │  │
│  │  GET  /admin/apps/market  → APPS_CATALOG                │  │
│  │  GET  /admin/apps         → List installed              │  │
│  │  POST /admin/apps/install → Install with dependencies   │  │
│  │  POST /admin/apps/activate                              │  │
│  │  POST /admin/apps/deactivate                            │  │
│  │  POST /admin/apps/uninstall                             │  │
│  │  POST /admin/apps/update                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ AppManager (Core Orchestrator)                           │  │
│  │  - install(appId, options)                               │  │
│  │  - activate(appId)                                       │  │
│  │  - deactivate(appId)                                     │  │
│  │  - uninstall(appId, {purgeData})                         │  │
│  │  - Runs lifecycle hooks                                  │  │
│  │  - Registers permissions, CPT, ACF                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Supporting Services                                      │  │
│  │  - AppDependencyResolver (topological sort, cycles)      │  │
│  │  - AppTableOwnershipResolver (validation)                │  │
│  │  - AppDataCleaner (DROP TABLE CASCADE)                   │  │
│  │  - PermissionService (permission registry)               │  │
│  │  - ACFRegistry (field group storage)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Storage Layer                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ app_registry     │  │ permissions      │  │ acf_registry  │ │
│  │ (PostgreSQL)     │  │ (PostgreSQL)     │  │ (in-memory)   │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 File Structure

```
apps/api-server/src/
├── routes/admin/
│   └── apps.routes.ts                    # REST API endpoints
├── services/
│   ├── AppManager.ts                     # Core lifecycle orchestrator
│   ├── AppDependencyResolver.ts          # Dependency graph, topological sort
│   ├── AppTableOwnershipResolver.ts      # Ownership validation
│   ├── AppDataCleaner.ts                 # Purge operations (DROP TABLE)
│   ├── PermissionService.ts              # Permission registry (Task A-4)
│   └── ACFRegistry.ts                    # ACF field groups (Task A-4)
├── entities/
│   ├── AppRegistry.ts                    # app_registry table ORM
│   └── App.ts                            # apps table (AI Services - different!)
├── app-manifests/
│   ├── index.ts                          # Manifest loader/registry
│   ├── appsCatalog.ts                    # Available apps catalog
│   └── forum.manifest.ts                 # Re-export from @o4o-apps/forum
└── constants/
    └── coreTables.ts                     # Core table registry (presumed)

apps/admin-dashboard/src/
├── pages/apps/
│   ├── AppStorePage.tsx                  # App Store UI (Feature apps)
│   └── AppsManager.tsx                   # Old UI (deprecated?)
├── pages/settings/
│   └── AppServices.tsx                   # AI Services UI (Different!)
└── api/
    └── admin-apps.ts                     # API client for App Store

packages/
├── types/src/
│   ├── app-manifest.ts                   # AppManifest schema (Feature apps)
│   └── app-lifecycle.ts                  # Lifecycle hook contexts
├── forum-app/                            # forum-core package
│   └── src/manifest.ts
├── forum-neture/                         # forum-neture extension
│   └── src/manifest.ts
├── forum-yaksa/                          # forum-yaksa extension
│   └── src/manifest.ts
├── dropshipping-core/                    # dropshipping-core (not in catalog)
│   └── src/manifest.ts
└── dropshipping-cosmetics/               # cosmetics extension (not in catalog)
    └── src/manifest.ts
```

---

## 2. App Store Engine Components

### 2.1 AppManager (Core Orchestrator)

**Location:** `apps/api-server/src/services/AppManager.ts` (592 lines)

**Responsibilities:**
- Orchestrates installation/activation/deactivation/uninstallation workflows
- Loads manifests from npm packages (`@o4o-apps/*`)
- Runs lifecycle hooks (install/activate/deactivate/uninstall)
- Registers permissions, CPT, ACF from manifests
- Manages app_registry database state

**Key Methods:**

| Method | Description | Dependencies |
|--------|-------------|--------------|
| `install(appId, options)` | Installs app + auto-installs dependencies | AppDependencyResolver |
| `activate(appId)` | Changes status to 'active', runs activate hook | - |
| `deactivate(appId)` | Changes status to 'inactive', runs deactivate hook | - |
| `uninstall(appId, {purgeData})` | Removes app, optionally purges data | AppDataCleaner, AppDependencyResolver |
| `canUninstall(appId)` | Checks for dependent apps | AppDependencyResolver |
| `runLifecycleHook(...)` | Dynamically imports and runs hook function | - |

**Installation Flow:**

```typescript
// Example: Installing 'forum-neture'
1. AppDependencyResolver.resolveInstallOrder('forum-neture')
   → Returns: ['forum-core', 'forum-neture']

2. For each app (forum-core, then forum-neture):
   a. Load manifest from @o4o-apps/{app}/manifest.js
   b. Validate ownership (AppTableOwnershipResolver)
   c. Insert into app_registry (status='installed')
   d. Register permissions (PermissionService)
   e. Register CPT (CPTRegistry)
   f. Register ACF (ACFRegistry)
   g. Run lifecycle.install hook
   h. Activate (status='active')
   i. Run lifecycle.activate hook
```

**Uninstallation Flow:**

```typescript
// Example: Uninstalling 'forum-core' with purge
1. Check for dependents (e.g., forum-neture)
   → If found and no force: throw DependencyError

2. If purgeData=true:
   a. Load manifest.ownsTables
   b. Validate ownership (no core table conflict)
   c. Verify tables exist in DB
   d. AppDataCleaner.purge()
      → DROP TABLE forum_post CASCADE
      → DROP TABLE forum_category CASCADE
      → ...

3. Run lifecycle.uninstall hook

4. Unregister permissions (PermissionService.deletePermissionsByApp)

5. Unregister ACF (acfRegistry.unregisterByApp)

6. Remove from app_registry (DELETE)
```

### 2.2 AppDependencyResolver

**Location:** `apps/api-server/src/services/AppDependencyResolver.ts` (324 lines)

**Responsibilities:**
- Builds dependency graph from manifests
- Detects cyclic dependencies (DFS algorithm)
- Performs topological sort for installation order
- Validates version compatibility (semver)
- Finds dependent apps for uninstall checks

**Algorithms:**

1. **Dependency Collection (Recursive):**
   ```typescript
   collectDependencies(appId, visited)
   → Reads manifest.dependencies: { 'forum-core': '>=1.0.0' }
   → Recursively collects: Set(['forum-core', 'forum-neture'])
   ```

2. **Cycle Detection (DFS):**
   ```typescript
   detectCycle(graph)
   → Returns: ['app-a', 'app-b', 'app-c', 'app-a'] if cycle exists
   → Throws: CyclicDependencyError
   ```

3. **Topological Sort (Kahn's Algorithm):**
   ```typescript
   topologicalSort(graph)
   → Calculates in-degree for each node
   → Processes zero-degree nodes first
   → Returns: ['forum-core', 'forum-neture'] (dependencies first)
   ```

**Error Types:**

| Error | When Thrown | Example |
|-------|-------------|---------|
| `CyclicDependencyError` | A → B → C → A | `['app-a', 'app-b', 'app-c', 'app-a']` |
| `VersionMismatchError` | Installed version doesn't satisfy requirement | `forum-core@0.9.0` but `forum-neture` requires `>=1.0.0` |
| `DependencyError` | Uninstalling core with active extensions | Cannot uninstall forum-core while forum-neture is installed |

### 2.3 AppTableOwnershipResolver

**Location:** `apps/api-server/src/services/AppTableOwnershipResolver.ts`

**Purpose:** Prevents ownership conflicts (e.g., extension apps claiming core tables)

**Validation Rules:**

1. **Extension Cannot Own Core Tables:**
   ```typescript
   // ❌ INVALID: forum-neture cannot own forum_post
   {
     appId: 'forum-neture',
     type: 'extension',
     ownsTables: ['forum_post'] // ← Violation!
   }
   ```

2. **Tables Must Exist:**
   ```typescript
   // Validates against PostgreSQL schema
   validateOwnership(manifest)
   → Queries: SELECT table_name FROM information_schema.tables
   → Warns if claimed table doesn't exist
   ```

3. **Core Registry:**
   ```typescript
   CORE_TABLES_REGISTRY = {
     'forum-core': [
       'forum_post',
       'forum_category',
       'forum_comment',
       'forum_tag',
       'forum_like',
       'forum_bookmark',
     ]
   };
   ```

**Validation Flow:**

```typescript
validateOwnership(manifest)
  ├─ IF type === 'extension':
  │   └─ Check if ownsTables contains any core tables
  │      → Throw OwnershipValidationError if conflict
  │
  ├─ Verify tables exist in DB:
  │   └─ getVerifiedOwnedResources(manifest)
  │      → Returns: { tables, cpt, acf, missingTables }
  │
  └─ Log validation results
```

### 2.4 AppDataCleaner

**Location:** `apps/api-server/src/services/AppDataCleaner.ts` (192 lines)

**Purpose:** Purges app data during uninstallation

**Operations:**

1. **Drop Tables:**
   ```sql
   DROP TABLE IF EXISTS "forum_post" CASCADE;
   DROP TABLE IF EXISTS "forum_category" CASCADE;
   ```

2. **Delete CPTs:** (Not implemented)
   ```typescript
   deleteCPTs(cptNames, appId)
   // TODO: Remove from custom_post_types table
   ```

3. **Delete ACF Groups:** (Not implemented)
   ```typescript
   deleteACFs(acfGroups, appId)
   // TODO: Remove from acf_field_groups table
   ```

**Safety Checks:**

```typescript
// Extension apps cannot purge core tables
if (appType === 'extension') {
  validateExtensionPurge(ownsTables);
  // Throws error if any table is a core table
}
```

**Usage Example:**

```typescript
// Uninstalling forum-core with purge
await appDataCleaner.purge({
  appId: 'forum-core',
  appType: 'core',
  ownsTables: ['forum_post', 'forum_category', ...],
  ownsCPT: ['forum_post', 'forum_category', ...],
  ownsACF: ['forum_metadata'],
});

// Result:
// ✓ DROP TABLE forum_post CASCADE
// ✓ DROP TABLE forum_category CASCADE
// ⚠️ CPT deletion not yet implemented
// ⚠️ ACF deletion not yet implemented
```

### 2.5 PermissionService (Task A-4)

**Location:** `apps/api-server/src/services/PermissionService.ts`

**Purpose:** Manages app-level permissions

**Operations:**

1. **Register Permissions:**
   ```typescript
   registerPermissions(appId, permissions: string[])
   // Insert into permissions table with appId reference
   ```

2. **Delete Permissions:**
   ```typescript
   deletePermissionsByApp(appId)
   // DELETE FROM permissions WHERE app_id = appId
   ```

**Manifest Integration:**

```typescript
// forum-core manifest
{
  permissions: [
    'forum.read',
    'forum.write',
    'forum.comment',
    'forum.moderate',
    'forum.admin',
  ]
}

// AppManager automatically registers these during install
```

### 2.6 ACFRegistry (Task A-4)

**Location:** `apps/api-server/src/services/ACFRegistry.ts`

**Purpose:** In-memory storage of ACF field groups

**Operations:**

1. **Register Field Groups:**
   ```typescript
   registerMultiple(appId, acfGroups: ACFGroupDefinition[])
   // Stores in-memory Map<groupId, ACFGroup>
   ```

2. **Unregister by App:**
   ```typescript
   unregisterByApp(appId)
   // Removes all ACF groups registered by appId
   ```

**Example:**

```typescript
// forum-neture registers cosmetics metadata
{
  groupId: 'cosmetic_meta',
  label: '화장품 메타데이터',
  fields: [
    { key: 'skinType', type: 'select', options: ['건성', '지성', ...] },
    { key: 'concerns', type: 'multiselect', options: ['여드름', '주름', ...] },
    { key: 'routine', type: 'array', label: '루틴 단계' },
  ]
}
```

---

## 3. Registered Apps - Complete Inventory

### 3.1 Apps in Catalog (Market)

**Source:** `apps/api-server/src/app-manifests/appsCatalog.ts`

| App ID | Name | Version | Type | Category | Status | Manifest Exists | Notes |
|--------|------|---------|------|----------|--------|----------------|-------|
| `forum` | Forum | 1.0.0 | core | community | ✅ Available | ✅ Yes | Re-exports from `@o4o-apps/forum` |
| `digitalsignage` | Digital Signage | 1.1.0 | core | display | ⚠️ Listed | ❌ No | **Missing manifest implementation!** |
| `forum-neture` | Forum Extension – Neture Cosmetics | 1.0.0 | extension | community | ✅ Available | ✅ Yes | Cosmetics-specific forum |
| `forum-yaksa` | Forum Extension – Yaksa Organization | 1.0.0 | extension | community | ✅ Available | ✅ Yes | Pharmacy-specific forum |

**Total:** 4 apps in catalog (1 broken)

### 3.2 Apps with Manifests but NOT in Catalog

| App ID | Name | Type | Package Location | Why Not Listed? |
|--------|------|------|------------------|-----------------|
| `dropshipping-core` | Dropshipping Core | core | `packages/dropshipping-core/` | **Under development** |
| `dropshipping-cosmetics` | Dropshipping Cosmetics Extension | extension | `packages/dropshipping-cosmetics/` | **Under development** |

### 3.3 App Confusion: Two "Apps" Systems

**CRITICAL FINDING:** The platform has TWO different "app" concepts:

#### System 1: App Store (Feature-Level Apps)

- **Purpose:** Install feature modules (forum, dropshipping, digital signage)
- **Database:** `app_registry` table
- **Entity:** `AppRegistry` (appId, status, type, dependencies)
- **UI:** `AppStorePage.tsx` (`/apps/apps`)
- **API:** `/api/admin/apps/*`
- **Example Apps:** forum-core, forum-neture, forum-yaksa

#### System 2: AI Services (Integration Apps)

- **Purpose:** Integrate AI providers (OpenAI, Google AI, Naver Clova)
- **Database:** `apps` table
- **Entity:** `App` (slug, provider, category, manifest)
- **UI:** `AppServices.tsx` (`/settings/apps`)
- **API:** `/api/v1/apps/*` (different routes!)
- **Example Apps:** openai-gpt, google-gemini, naver-clova

**Confusion Points:**

| Aspect | App Store (Feature Apps) | AI Services |
|--------|-------------------------|-------------|
| Table | `app_registry` | `apps` |
| Entity | `AppRegistry` | `App` |
| Type field | `'core' \| 'extension' \| 'standalone'` | `'integration' \| 'block' \| 'shortcode' \| 'widget'` |
| Manifest | `AppManifest` (feature-level) | `AppManifest` (AI-level, different schema!) |
| Purpose | Business features | AI integrations |

**Recommendation:** Rename one to avoid confusion (e.g., "Extensions" vs "AI Services")

---

## 4. App Details - Registered Apps

### 4.1 Forum Core (`forum-core`)

**Manifest Location:** `packages/forum-app/src/manifest.ts`

**Type:** Core
**Dependencies:** None (standalone core)

**Data Ownership:**

```typescript
ownsTables: [
  'forum_post',
  'forum_category',
  'forum_comment',
  'forum_tag',
  'forum_like',
  'forum_bookmark',
]
```

**CPT Definitions:**

| CPT Name | Storage | Label | Supports |
|----------|---------|-------|----------|
| `forum_post` | entity | 포럼 게시글 | title, content, author, categories, tags, comments |
| `forum_category` | entity | 포럼 카테고리 | name, description, hierarchy |
| `forum_comment` | entity | 포럼 댓글 | content, author, post |
| `forum_tag` | entity | 포럼 태그 | name |

**ACF Groups:** None (core provides structure only)

**Permissions:**

```typescript
permissions: [
  'forum.read',
  'forum.write',
  'forum.comment',
  'forum.moderate',
  'forum.admin',
]
```

**Routes:**

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

**Menu:**

```typescript
menu: {
  id: 'forum',
  label: '포럼',
  icon: 'MessageSquare',
  path: '/forum',
  position: 100,
  children: [
    { id: 'forum-dashboard', label: '대시보드', path: '/forum' },
    { id: 'forum-posts', label: '게시글 관리', path: '/forum' },
    { id: 'forum-categories', label: '카테고리', path: '/forum/categories' },
    { id: 'forum-reports', label: '신고 검토', path: '/forum/reports' },
  ]
}
```

**Lifecycle Hooks:**

```typescript
lifecycle: {
  install: './lifecycle/install.js',
  activate: './lifecycle/activate.js',
  deactivate: './lifecycle/deactivate.js',
  uninstall: './lifecycle/uninstall.js',
}
```

**Uninstall Policy:**

```typescript
uninstallPolicy: {
  defaultMode: 'keep-data',
  allowPurge: true,
  autoBackup: true,
}
```

**Install Options:**

```typescript
installOptions: {
  adoptExistingTables: true,  // Adopt existing forum tables if found
  keepDataOnUninstall: true,  // Default: keep data when uninstalling
}
```

---

### 4.2 Forum Neture (`forum-neture`)

**Manifest Location:** `packages/forum-neture/src/manifest.ts`

**Type:** Extension
**Dependencies:** `{ 'forum-core': '>=1.0.0' }`

**Data Ownership:**

```typescript
ownsTables: []  // Extensions don't own core tables
```

**Extended CPTs:**

```typescript
extendsCPT: [
  {
    name: 'forum_post',
    acfGroup: 'cosmetic_meta',
  }
]
```

**ACF Groups:**

```typescript
acf: [
  {
    groupId: 'cosmetic_meta',
    label: '화장품 메타데이터',
    fields: [
      {
        key: 'skinType',
        type: 'select',
        label: '피부 타입',
        options: ['건성', '지성', '복합성', '민감성'],
      },
      {
        key: 'concerns',
        type: 'multiselect',
        label: '피부 고민',
        options: ['여드름', '주름', '미백', '모공', '탄력'],
      },
      {
        key: 'routine',
        type: 'array',
        label: '루틴 단계',
      },
      {
        key: 'productIds',
        type: 'array',
        label: '관련 제품 ID',
      },
    ],
  }
]
```

**Default Configuration:**

```typescript
defaultConfig: {
  categories: [
    { name: '공지사항', slug: 'announcements', color: '#FF6B6B' },
    { name: '사용후기', slug: 'reviews', color: '#4ECDC4' },
    { name: '질문답변', slug: 'qna', color: '#95E1D3' },
    { name: '이벤트', slug: 'events', color: '#FFD93D' },
  ],
  skin: 'neture',
  brandColor: '#8B7355',
  accentColor: '#E8B4B8',
}
```

**Admin Routes:**

```typescript
adminRoutes: [
  {
    path: '/admin/forum',
    component: './admin-ui/pages/ForumNetureApp.js',
  }
]
```

**How Extension Works:**

1. Installing `forum-neture` auto-installs `forum-core` (dependency)
2. `forum-neture` adds ACF fields to `forum_post` CPT
3. UI component overrides core forum UI with cosmetics-specific layout
4. Post data lives in `forum_post` table (core)
5. Metadata lives in `post_meta` JSONB column (ACF fields)

---

### 4.3 Forum Yaksa (`forum-yaksa`)

**Manifest Location:** `packages/forum-yaksa/src/manifest.ts`

**Type:** Extension
**Dependencies:** `{ 'forum-core': '>=1.0.0' }`

**Data Ownership:**

```typescript
ownsTables: [
  'yaksa_forum_community',
  'yaksa_forum_community_member',
]
```

**Extended CPTs:**

```typescript
extendsCPT: [
  {
    name: 'forum_post',
    acfGroup: 'pharmacy_meta',
  }
]
```

**ACF Groups:**

```typescript
acf: [
  {
    groupId: 'pharmacy_meta',
    label: '약물 메타데이터',
    fields: [
      { key: 'drugName', type: 'string', label: '약물명' },
      { key: 'drugCode', type: 'string', label: '약물 코드 (EDI)' },
      {
        key: 'category',
        type: 'select',
        label: '카테고리',
        options: ['복약지도', '부작용', '상호작용', '조제'],
      },
      {
        key: 'severity',
        type: 'select',
        label: '중요도',
        options: ['일반', '주의', '경고'],
      },
      { key: 'caseStudy', type: 'boolean', label: '케이스 스터디' },
    ],
  }
]
```

**Default Configuration:**

```typescript
defaultConfig: {
  categories: [
    { name: '지부 공지', slug: 'branch-announcements', color: '#1E40AF' },
    { name: '복약지도', slug: 'medication-guidance', color: '#3B82F6' },
    { name: '부작용 공유', slug: 'side-effects', color: '#60A5FA' },
    { name: '교육자료', slug: 'education', color: '#93C5FD' },
  ],
  skin: 'yaksa',
  brandColor: '#1E40AF',
  accentColor: '#3B82F6',
  requireApproval: true, // Yaksa-specific: require approval for posts
}
```

**Uninstall Policy:**

```typescript
uninstallPolicy: {
  defaultMode: 'keep-data',
  allowPurge: true,
  autoBackup: true, // Yaksa communities are important
}
```

**Key Difference from Neture:**

- **Owns tables:** `yaksa_forum_community`, `yaksa_forum_community_member`
- **Approval workflow:** Posts require moderator approval
- **Pharmacy-specific:** Drug codes, medication guidance categories

---

### 4.4 Digital Signage (`digitalsignage`)

**Status:** ❌ **BROKEN - No Manifest Found**

**Catalog Entry:**

```typescript
{
  appId: 'digitalsignage',
  name: 'Digital Signage',
  version: '1.1.0',
  description: '매장용 디지털 사이니지 콘텐츠 관리 및 스케줄링',
  category: 'display',
  author: 'O4O Platform',
}
```

**Issue:**

- Listed in `appsCatalog.ts`
- Referenced in `index.ts`: `import { digitalsignageManifest } from './digitalsignage.manifest.js'`
- **But `digitalsignage.manifest.ts` file does not exist!**

**Impact:**

- Installation will fail
- Server may crash on import
- Needs immediate fix or removal from catalog

**Possible Solutions:**

1. Create `digitalsignage.manifest.ts`
2. Remove from catalog until implementation is ready
3. Create stub manifest with TODO

---

### 4.5 Dropshipping Core (`dropshipping-core`)

**Status:** ⚠️ **Manifest Exists, Not in Catalog**

**Manifest Location:** `packages/dropshipping-core/src/manifest.ts`

**Type:** Core
**Dependencies:** None

**Data Ownership:**

```typescript
ownsTables: [
  'products',
  'suppliers',
  'sellers',
  'seller_products',
  'seller_authorizations',
  'partners',
  'commissions',
  'commission_policies',
  'partner_commissions',
  'settlements',
  'settlement_items',
  'partner_profiles',
  'seller_profiles',
  'supplier_profiles',
  'channel_product_links',
  'seller_channel_accounts',
  'payment_settlements',
]
```

**CPT Definitions:**

| CPT Name | Label | Storage |
|----------|-------|---------|
| `ds_product` | 드랍쉬핑 상품 | entity |
| `ds_supplier` | 공급업체 | entity |
| `ds_seller` | 판매자 | entity |
| `ds_partner` | 파트너 | entity |

**Permissions:**

```typescript
permissions: [
  'dropshipping.read',
  'dropshipping.write',
  'dropshipping.admin',
  'seller.read',
  'seller.write',
  'seller.admin',
  'supplier.read',
  'supplier.write',
  'supplier.admin',
  'partner.read',
  'partner.write',
  'partner.admin',
  'commission.view',
  'commission.calculate',
  'commission.admin',
  'settlement.view',
  'settlement.process',
  'settlement.admin',
]
```

**Routes:**

```typescript
routes: [
  '/api/v2/seller',
  '/api/v2/seller/*',
  '/api/v2/supplier',
  '/api/v2/supplier/*',
  '/api/admin/dropshipping',
  '/api/admin/dropshipping/*',
  '/api/admin/seller-authorization',
  '/api/admin/seller-authorization/*',
]
```

**Menu:**

```typescript
menu: {
  id: 'dropshipping',
  label: '드랍쉬핑',
  icon: 'Package',
  path: '/dropshipping',
  position: 200,
  children: [
    { id: 'dropshipping-dashboard', label: '대시보드', path: '/dropshipping' },
    { id: 'dropshipping-products', label: '상품 관리', path: '/dropshipping/products' },
    { id: 'dropshipping-suppliers', label: '공급업체', path: '/dropshipping/suppliers' },
    { id: 'dropshipping-sellers', label: '판매자', path: '/dropshipping/sellers' },
    { id: 'dropshipping-partners', label: '파트너', path: '/dropshipping/partners' },
    { id: 'dropshipping-commissions', label: '수수료', path: '/dropshipping/commissions' },
    { id: 'dropshipping-settlements', label: '정산', path: '/dropshipping/settlements' },
  ]
}
```

**Why Not in Catalog?**

- Likely under active development
- May need backend routes/controllers implementation
- May need admin UI components
- Tables already exist (visible in manifest ownership)

---

### 4.6 Dropshipping Cosmetics (`dropshipping-cosmetics`)

**Status:** ⚠️ **Manifest Exists, Not in Catalog**

**Manifest Location:** `packages/dropshipping-cosmetics/src/manifest.ts`

**Type:** Extension
**Dependencies:** `{ 'dropshipping-core': '^1.0.0' }`

**Extended CPTs:**

```typescript
extendsCPT: ['ds_product']
```

**Own CPTs:**

```typescript
cpt: [
  {
    name: 'cosmetics_influencer_routine',
    storage: 'entity',
    primaryKey: 'id',
    label: 'Influencer Routine',
    supports: ['title', 'metadata'],
  }
]
```

**ACF Groups:**

```typescript
acf: [
  {
    groupId: 'cosmetics_metadata',
    label: 'Cosmetics Information',
    appliesTo: 'ds_product',
    fields: [
      // skinType (multiselect): 건성, 지성, 복합성, 민감성, 중성
      // concerns (multiselect): 여드름, 미백, 주름개선, 모공, 진정, 보습, 탄력, 트러블케어
      // ingredients (array): name, description, percentage
      // certifications (multiselect): vegan, hypoallergenic, organic, etc.
      // productCategory (select): skincare, cleansing, makeup, suncare, mask, bodycare, haircare
      // routineInfo (object): timeOfUse, step, orderInRoutine
      // contraindications (text)
      // texture (select): gel, cream, lotion, serum, oil, foam, water, balm
      // volume (text)
      // expiryPeriod (text)
    ]
  },
  {
    groupId: 'influencer_routine_metadata',
    label: 'Influencer Routine Information',
    appliesTo: 'cosmetics_influencer_routine',
    fields: [
      // partnerId, title, description
      // skinType, concerns, timeOfUse
      // routine (array), tags
      // isPublished, viewCount, recommendCount
    ]
  }
]
```

**Permissions:**

```typescript
permissions: [
  'cosmetics:view',
  'cosmetics:edit',
  'cosmetics:manage_filters',
  'cosmetics:recommend_routine'
]
```

**Routes:**

```typescript
routes: [
  '/api/v1/cosmetics',
  '/api/v1/partner'
]
```

**Menu:**

```typescript
menu: {
  parent: 'dropshipping',
  items: [
    {
      id: 'cosmetics-filters',
      label: 'Cosmetics Filters',
      path: '/admin/cosmetics/filters',
      permission: 'cosmetics:manage_filters',
      icon: 'filter'
    },
    {
      id: 'cosmetics-routines',
      label: 'Routine Templates',
      path: '/admin/cosmetics/routines',
      permission: 'cosmetics:recommend_routine',
      icon: 'layers'
    }
  ]
}
```

**Use Case:**

- Adds cosmetics-specific metadata to dropshipping products
- Enables skin type filtering
- Manages influencer routine templates
- Provides certification badges (vegan, organic, etc.)

---

## 5. App Inter-Dependencies & Connection Map

### 5.1 Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                      Core Apps (Standalone)                      │
│                                                                  │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │  forum-core      │              │ dropshipping-    │        │
│  │  v1.0.0          │              │ core v1.0.0      │        │
│  │  (6 tables)      │              │ (17 tables)      │        │
│  └────────┬─────────┘              └────────┬─────────┘        │
│           │                                 │                   │
└───────────┼─────────────────────────────────┼───────────────────┘
            │                                 │
            │                                 │
┌───────────┼─────────────────────────────────┼───────────────────┐
│           │      Extension Apps             │                   │
│           │                                 │                   │
│  ┌────────▼──────────┐           ┌─────────▼────────────┐      │
│  │ forum-neture      │           │ dropshipping-        │      │
│  │ v1.0.0            │           │ cosmetics v1.0.0     │      │
│  │ (0 tables)        │           │ (0 tables)           │      │
│  │ + cosmetic_meta   │           │ + cosmetics_metadata │      │
│  │   ACF group       │           │   ACF group          │      │
│  └───────────────────┘           └──────────────────────┘      │
│                                                                 │
│  ┌───────────────────┐                                          │
│  │ forum-yaksa       │                                          │
│  │ v1.0.0            │                                          │
│  │ (2 tables)        │                                          │
│  │ + pharmacy_meta   │                                          │
│  │   ACF group       │                                          │
│  └───────────────────┘                                          │
└─────────────────────────────────────────────────────────────────┘

Dependency Rules:
• Extension apps MUST depend on a core app
• Core apps have no dependencies
• Extensions add ACF fields to core CPTs
• Extensions can own their own tables (yaksa example)
```

### 5.2 User Profile & Role Integration

**Current State:** ❌ **Not Integrated**

**Expected Integration:**

```typescript
// User Profile should connect to:
interface User {
  id: string;
  email: string;
  roles: string[];  // e.g., ['forum.moderator', 'dropshipping.seller']

  // Forum-specific profile data
  forumProfile?: {
    posts: number;
    comments: number;
    reputation: number;
  };

  // Dropshipping-specific profile data
  sellerProfile?: {
    sellerId: string;
    storeName: string;
    commissionRate: number;
  };
}
```

**Current Reality:**

- User table exists (`users`)
- Roles system exists (`user_roles`)
- **But apps don't query/update user profiles**
- **No integration between forum posts and user profiles**
- **No integration between seller authorization and user roles**

**Recommendation:**

- Apps should use `PermissionService` to check `user_roles`
- Forum posts should link to `users.id` (author)
- Dropshipping sellers should link to `users.id`

---

### 5.3 Organization Structure Integration (지부/분회)

**Current State:** ❌ **Not Considered**

**Expected for Yaksa:**

```typescript
// Yaksa forum should be multi-tenant by branch/chapter
interface ForumPost {
  id: string;
  title: string;
  content: string;

  // Missing: Multi-tenancy fields
  branchId?: string;    // 지부 ID (e.g., 'seoul-branch')
  chapterId?: string;   // 분회 ID (e.g., 'gangnam-chapter')
  visibility: 'public' | 'branch' | 'chapter';  // Visibility scope
}
```

**Current Reality:**

- `yaksa_forum_community` table exists
- `yaksa_forum_community_member` table exists
- **But no link to organization hierarchy (branches/chapters)**
- **No scoping mechanism for posts**

**Recommendation:**

- Add `tenantId` field to all multi-tenant apps
- Implement tenant-aware queries
- Add visibility scopes to forum posts

---

### 5.4 Data Sharing & Common Tables

**Shared Core Tables:**

| Table | Owned By | Used By |
|-------|----------|---------|
| `forum_post` | `forum-core` | `forum-neture`, `forum-yaksa` (via ACF) |
| `forum_category` | `forum-core` | Extensions (via foreign keys) |
| `forum_comment` | `forum-core` | Extensions |
| `ds_product` | `dropshipping-core` | `dropshipping-cosmetics` (via ACF) |

**Extension-Owned Tables:**

| Table | Owned By | Used By |
|-------|----------|---------|
| `yaksa_forum_community` | `forum-yaksa` | Yaksa-specific community features |
| `yaksa_forum_community_member` | `forum-yaksa` | Yaksa member management |

**ACF Metadata Storage:**

- All ACF fields stored in `post_meta` JSONB column (presumed)
- Each extension adds its own fields
- No schema collision because field keys are prefixed (e.g., `cosmetic_meta.skinType`)

---

### 5.5 CPT/ACF Framework Usage

**CPT Registry:**

```typescript
// apps/api-server/src/init/cpt.init.ts
import { registry as cptRegistry } from '@o4o/cpt-registry';

// Apps register CPTs during installation
cptRegistry.register({
  name: 'forum_post',
  storage: 'entity',
  fields: [],
  metadata: { label: '포럼 게시글', supports: ['title', 'content', ...], appId: 'forum-core' }
});
```

**ACF Registry:**

```typescript
// apps/api-server/src/services/ACFRegistry.ts
acfRegistry.registerMultiple('forum-neture', [
  {
    groupId: 'cosmetic_meta',
    label: '화장품 메타데이터',
    fields: [...]
  }
]);
```

**How ACF Extends CPT:**

```typescript
// forum-neture manifest
{
  extendsCPT: [
    { name: 'forum_post', acfGroup: 'cosmetic_meta' }
  ],
  acf: [
    { groupId: 'cosmetic_meta', fields: [...] }
  ]
}

// Result: forum_post CPT now has cosmetic_meta fields
// UI forms should render these fields when editing posts
```

**Current Gap:**

- ✅ ACF schemas are registered in AppManager
- ❌ Admin UI forms don't consume ACF schemas yet
- ❌ No dynamic form rendering based on ACF definitions
- ⚠️ ACF fields are likely hardcoded in UI components

---

### 5.6 Block Editor Integration

**Status:** ❌ **Not Integrated**

**Expected:**

```typescript
// Apps should be able to register custom blocks
{
  appId: 'forum-core',
  blocks: [
    {
      name: 'forum/post-list',
      title: 'Forum Post List',
      category: 'widgets',
      attributes: {
        categoryId: { type: 'string' },
        limit: { type: 'number', default: 10 }
      }
    }
  ]
}
```

**Current Reality:**

- Block Editor exists (`apps/admin-dashboard/src/blocks/`)
- **But apps don't register blocks via manifests**
- **Blocks are hardcoded in block registry**

**Recommendation:**

- Add `blocks` field to AppManifest
- Register blocks during app installation
- Unregister blocks during app uninstallation

---

## 6. App Store UX/View Structure

### 6.1 Admin Dashboard - App Store Page

**Location:** `apps/admin-dashboard/src/pages/apps/AppStorePage.tsx` (574 lines)

**URL:** `/apps/apps` (presumably)

**Features:**

1. **Two Tabs:**
   - **Market (앱 장터):** Browse available apps from catalog
   - **Installed (설치된 앱):** Manage installed apps

2. **App Card (Market View):**
   ```
   ┌─────────────────────────────────────────────────────┐
   │ Forum Extension – Neture Cosmetics                  │
   │ 화장품 매장 특화 포럼 (피부타입, 루틴, 제품 연동)  │
   │                                                     │
   │ [O4O Platform] [community]                          │
   │                                                     │
   │ Dependencies:                                       │
   │  • forum-core (>=1.0.0)                            │
   │                                                     │
   │                           [Install (설치)] ────────┤
   └─────────────────────────────────────────────────────┘
   ```

3. **App Card (Installed View):**
   ```
   ┌─────────────────────────────────────────────────────┐
   │ Forum Core                           [✓ Active]     │
   │ 커뮤니티 포럼 코어 엔진                              │
   │                                                     │
   │ Version: 1.0.0 (installed)                          │
   │ Available: 1.0.0                                    │
   │                                                     │
   │ Owned Tables (6):                                   │
   │  • forum_post • forum_category • forum_comment      │
   │  • forum_tag • forum_like • forum_bookmark          │
   │                                                     │
   │ [Deactivate] [Uninstall] [Uninstall + Purge Data] │
   └─────────────────────────────────────────────────────┘
   ```

4. **Actions:**
   - **Install:** Installs app + dependencies
   - **Activate:** Changes status to 'active'
   - **Deactivate:** Changes status to 'inactive'
   - **Uninstall:** Removes app (keeps data)
   - **Uninstall + Purge Data:** Removes app + DROP TABLES

5. **Update Detection:**
   - Shows badge if `availableVersion > installedVersion`
   - Displays "Update Available" button

**Error Handling:**

```typescript
// Ownership Violation
if (error.response?.data?.error === 'OWNERSHIP_VIOLATION') {
  alert(`소유권 충돌:\n${violations.map(v => v.reason).join('\n')}`);
}

// Dependency Error
if (error.response?.data?.error === 'DEPENDENTS_EXIST') {
  alert(`의존 앱들을 먼저 삭제해주세요:\n${dependents.join('\n')}`);
}
```

**UX Issues:**

1. **Confirmation Dialogs:** Uses `confirm()` (native browser alert)
   - Should use custom modal components
   - Poor UX for complex confirmations

2. **Error Messages:** Uses `alert()` (native browser alert)
   - Should use toast notifications
   - No retry mechanism

3. **Loading States:** Simple spinner
   - No progress indication for long operations
   - No real-time installation logs

4. **Dependency Visualization:** Text list only
   - No dependency graph visualization
   - Hard to understand complex dependencies

---

### 6.2 Admin Dashboard - AI Services Page

**Location:** `apps/admin-dashboard/src/pages/settings/AppServices.tsx` (388 lines)

**URL:** `/settings/apps`

**Purpose:** Manage AI service integrations (OpenAI, Google AI, Naver Clova)

**THIS IS A DIFFERENT "APPS" SYSTEM!**

**Features:**

1. **Three Tabs:**
   - **Apps Management (앱 관리):** Configure API keys
   - **Usage Stats (사용 통계):** View API call statistics
   - **References:** Documentation links

2. **App Card:**
   ```
   ┌─────────────────────────────────────────────────────┐
   │ OpenAI GPT                                          │
   │ Text generation with GPT-4                          │
   │                                                     │
   │ [openai] [text-generation] [✓ Installed]           │
   │                                                     │
   │ API Key: ************ [👁️]                         │
   │ Model: gpt-4-turbo                                  │
   │                                                     │
   │ Usage: 1,234 calls                                  │
   │                                                     │
   │                                   [Save Settings] │
   └─────────────────────────────────────────────────────┘
   ```

**Key Differences from App Store:**

| Aspect | App Store | AI Services |
|--------|-----------|-------------|
| Apps | Feature modules (forum, dropshipping) | AI providers (OpenAI, Google) |
| Installation | Lifecycle hooks, table creation | API key configuration |
| Dependencies | App dependencies | None |
| Uninstallation | Can purge tables | Just remove config |
| Activation | Status in registry | Always active if configured |

---

## 7. Problems & Limitations

### 7.1 Structural Issues

#### P1: Two "Apps" Concepts (Critical Confusion)

**Problem:**

- `app_registry` table (Feature apps: forum, dropshipping)
- `apps` table (AI services: openai, google)
- Both use term "app"
- Both have AppManifest types (different schemas!)
- Different UI pages, different APIs

**Impact:**

- Developer confusion
- User confusion
- Code duplication
- Risk of bugs when maintaining both systems

**Recommendation:**

```typescript
// Rename one system:
// Option 1: Keep "Apps" for feature apps, rename AI to "Services"
app_registry → apps
apps → ai_services

// Option 2: Use "Extensions" for feature apps
app_registry → extensions
apps → apps
```

---

#### P2: Missing digitalsignage Manifest (Broken Catalog Entry)

**Problem:**

```typescript
// appsCatalog.ts
{ appId: 'digitalsignage', name: 'Digital Signage', version: '1.1.0' }

// index.ts
import { digitalsignageManifest } from './digitalsignage.manifest.js';
// ❌ File does not exist!
```

**Impact:**

- Server will crash on import
- Cannot install digitalsignage app
- Catalog shows app but it's unusable

**Recommendation:**

```typescript
// Option 1: Create stub manifest
export const digitalsignageManifest = {
  appId: 'digitalsignage',
  name: 'Digital Signage',
  type: 'core',
  version: '1.1.0',
  description: 'Digital signage content management',
  ownsTables: [], // TODO
  cpt: [], // TODO
  acf: [], // TODO
  permissions: [], // TODO
};

// Option 2: Remove from catalog until ready
APPS_CATALOG = [
  { appId: 'forum', ... },
  // { appId: 'digitalsignage', ... }, // Commented out
  { appId: 'forum-neture', ... },
  { appId: 'forum-yaksa', ... },
];
```

---

#### P3: Static Catalog (Scalability)

**Problem:**

```typescript
// Hardcoded list of 4 apps
export const APPS_CATALOG: AppCatalogItem[] = [
  { appId: 'forum', ... },
  { appId: 'digitalsignage', ... },
  { appId: 'forum-neture', ... },
  { appId: 'forum-yaksa', ... },
];
```

**Limitations:**

- Cannot add apps without code changes
- No remote app marketplace
- No versioning/update mechanism
- No app discovery

**Recommendation:**

```typescript
// Phase 1: Database-backed catalog
interface AppCatalog {
  id: string;
  appId: string;
  version: string;
  manifestUrl: string;  // e.g., 'https://registry.o4o.com/forum-core/1.0.0/manifest.json'
  downloadUrl: string;  // e.g., 'https://registry.o4o.com/forum-core/1.0.0.tar.gz'
  publishedAt: Date;
}

// Phase 2: Remote registry
const catalog = await fetch('https://registry.o4o.com/catalog.json');
```

---

#### P4: No Multi-Tenancy Support

**Problem:**

- Apps don't consider branch/chapter isolation
- No `tenantId` in data models
- Yaksa needs branch-level forums
- Dropshipping needs seller isolation

**Current:**

```sql
CREATE TABLE forum_post (
  id UUID PRIMARY KEY,
  title TEXT,
  content TEXT,
  author_id UUID
  -- Missing: tenant_id!
);
```

**Recommended:**

```sql
CREATE TABLE forum_post (
  id UUID PRIMARY KEY,
  tenant_id UUID,  -- Added
  title TEXT,
  content TEXT,
  author_id UUID,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_forum_post_tenant ON forum_post(tenant_id);
```

**Impact:**

- Cannot isolate data by branch
- Cannot enforce branch-level permissions
- Yaksa cannot have branch-specific forums

---

#### P5: Routes Not Dynamically Loaded

**Problem:**

```typescript
// Manifests declare routes
routes: ['/admin/forum', '/admin/forum/posts', ...]

// But Express routes are hardcoded
// apps/api-server/src/config/routes.config.ts
app.use('/admin/forum', forumRoutes);  // Hardcoded!
```

**Impact:**

- Routes must be manually registered
- App installation doesn't activate routes
- Cannot truly "plug and play" apps

**Recommendation:**

```typescript
// AppManager should dynamically register routes
async activate(appId: string) {
  const manifest = loadLocalManifest(appId);

  if (manifest.routes) {
    for (const route of manifest.routes) {
      const routeModule = await import(`@o4o-apps/${appId}/routes/${route}.js`);
      expressApp.use(route.path, routeModule.default);
    }
  }
}
```

---

#### P6: Menus Not Dynamically Loaded

**Problem:**

```typescript
// Manifests define menus
menu: {
  id: 'forum',
  label: '포럼',
  icon: 'MessageSquare',
  children: [...]
}

// But admin menu is hardcoded
// apps/admin-dashboard/src/config/wordpressMenuFinal.tsx
const menuItems = [
  { id: 'forum', label: '포럼', ... },  // Hardcoded!
];
```

**Impact:**

- Menu items must be manually added
- App installation doesn't show new menu
- Cannot truly "plug and play" apps

**Recommendation:**

```typescript
// Fetch menu from installed apps
const installedApps = await adminAppsApi.getInstalledApps();
const menuItems = installedApps
  .filter(app => app.status === 'active' && app.manifest.menu)
  .map(app => app.manifest.menu);
```

---

#### P7: ACF Schemas Not Consumed by UI

**Problem:**

```typescript
// ACF schemas are registered in AppManager
acfRegistry.registerMultiple('forum-neture', [
  {
    groupId: 'cosmetic_meta',
    fields: [
      { key: 'skinType', type: 'select', options: [...] }
    ]
  }
]);

// But Admin UI forms are hardcoded
<select name="skinType">
  <option value="dry">건성</option>  // Hardcoded!
  <option value="oily">지성</option>
</select>
```

**Impact:**

- ACF schemas are metadata only
- Forms must be manually coded
- Cannot dynamically render extension fields

**Recommendation:**

```typescript
// Dynamic form renderer
const ForumPostForm = ({ postId }) => {
  const acfGroups = await acfRegistry.getGroupsForCPT('forum_post');

  return (
    <form>
      <input name="title" />
      <textarea name="content" />

      {acfGroups.map(group => (
        <ACFFieldGroup key={group.groupId} fields={group.fields} />
      ))}
    </form>
  );
};
```

---

### 7.2 UX/View Issues

#### U1: Poor Error UX (Native Alerts)

**Problem:**

```typescript
alert('앱 설치에 실패했습니다.');
confirm('정말 삭제하시겠습니까?');
```

**Impact:**

- Unprofessional UX
- Cannot copy error messages
- No retry mechanism
- Blocks UI interaction

**Recommendation:**

```typescript
// Use toast notifications
toast.error('앱 설치에 실패했습니다.', {
  action: {
    label: 'Retry',
    onClick: () => handleInstall(appId),
  },
});

// Use modal dialogs
<ConfirmDialog
  title="앱 삭제 확인"
  message="정말 삭제하시겠습니까?"
  onConfirm={() => handleUninstall(appId)}
/>
```

---

#### U2: No Installation Progress Indication

**Problem:**

```typescript
setActionLoading(appId);  // Simple boolean flag
// No progress indication during:
// - Dependency resolution
// - Table creation
// - Migration execution
```

**Impact:**

- User doesn't know what's happening
- Long installations seem frozen
- Cannot debug installation failures

**Recommendation:**

```typescript
// WebSocket-based progress
const InstallProgress = ({ appId }) => {
  const [progress, setProgress] = useState([]);

  useEffect(() => {
    const ws = new WebSocket(`/api/admin/apps/install/${appId}/progress`);
    ws.onmessage = (event) => {
      setProgress(prev => [...prev, JSON.parse(event.data)]);
    };
  }, [appId]);

  return (
    <div>
      {progress.map(step => (
        <div key={step.id}>
          {step.status === 'done' ? '✓' : '⏳'} {step.message}
        </div>
      ))}
    </div>
  );
};

// Backend emits progress events:
// - Resolving dependencies...
// - Installing forum-core...
// - Running migrations...
// - Registering permissions...
// - Installation complete!
```

---

#### U3: No Dependency Visualization

**Problem:**

```typescript
// Dependencies shown as text list
Dependencies:
  • forum-core (>=1.0.0)
```

**Impact:**

- Cannot visualize complex dependencies
- Hard to understand installation order
- Cannot detect circular dependencies visually

**Recommendation:**

```typescript
// Dependency graph visualization
const DependencyGraph = ({ appId }) => {
  const graph = await adminAppsApi.getDependencyGraph(appId);

  return (
    <ReactFlow
      nodes={graph.nodes}
      edges={graph.edges}
      fitView
    />
  );
};

// Example graph:
//   forum-core
//      ↓
//   forum-neture
//      ↓
//   forum-yaksa
```

---

### 7.3 Feature Gaps

#### F1: No App Sandboxing

**Problem:**

- Apps run in same Node.js process
- Apps can access any database table
- Apps can call any service
- No permission enforcement at runtime

**Impact:**

- Security risk
- Extensions can break core apps
- No isolation

**Recommendation:**

```typescript
// Permission-based middleware
app.use('/api/forum/*', requireAppPermission('forum.read'));

// Database query scoping
const posts = await db.query(`
  SELECT * FROM forum_post
  WHERE tenant_id = $1
  AND app_id = $2
`, [tenantId, appId]);
```

---

#### F2: No Rollback Mechanism

**Problem:**

```typescript
// If installation fails mid-way:
// - Some tables created
// - Some permissions registered
// - No automatic cleanup
```

**Impact:**

- Failed installations leave orphaned data
- Manual cleanup required
- Database in inconsistent state

**Recommendation:**

```typescript
// Transaction-based installation
async install(appId: string) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.startTransaction();

  try {
    // Install app
    // Register permissions
    // Create tables
    // Run migrations

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

---

#### F3: No Migrations Execution

**Problem:**

```typescript
// Manifests declare migrations
migrations: {
  scripts: ['./migrations/001_create_tables.sql']
}

// But migrations are never executed!
```

**Impact:**

- Tables must be manually created
- Schema changes must be manually applied
- App installation is incomplete

**Recommendation:**

```typescript
// Execute migrations during installation
if (manifest.migrations?.scripts) {
  for (const scriptPath of manifest.migrations.scripts) {
    const sql = await import(`@o4o-apps/${appId}/${scriptPath}`);
    await queryRunner.query(sql);
  }
}
```

---

## 8. Branch/Chapter Service Suitability Assessment

### 8.1 Current State

**App Store Design:**
- ✅ Core/Extension pattern enables vertical customization
- ✅ Ownership validation prevents data corruption
- ❌ No multi-tenancy support
- ❌ No branch/chapter isolation
- ❌ No organization hierarchy

**Branch/Chapter Requirements:**

1. **Data Isolation:**
   - Each branch should have isolated forums
   - Each chapter should have isolated data
   - No cross-branch data leakage

2. **Permission Scoping:**
   - Branch admin can manage branch forum
   - Chapter admin can manage chapter forum
   - National admin can manage all

3. **Vertical Customization:**
   - Yaksa branch may need pharmacy-specific features
   - Cosmetics branch may need product-specific features

### 8.2 Suitability Analysis

| Requirement | Current Support | Gap | Recommendation |
|-------------|----------------|-----|----------------|
| **Vertical Customization** | ✅ Excellent | None | Core/Extension pattern is perfect |
| **Data Isolation** | ❌ None | No `tenant_id` | Add multi-tenancy to all tables |
| **Permission Scoping** | ⚠️ Partial | No branch/chapter roles | Add hierarchical roles |
| **Organization Hierarchy** | ❌ None | No org structure | Add `branches`, `chapters` tables |
| **Branch-Specific Apps** | ⚠️ Possible | No installation scoping | Add `app_installations` per tenant |

### 8.3 Recommended Architecture for Branch/Chapter

```typescript
// Add tenant isolation
interface Tenant {
  id: string;
  type: 'national' | 'branch' | 'chapter';
  parentId?: string;  // For hierarchy
  name: string;
}

// Add tenant context to all data
interface ForumPost {
  id: string;
  tenantId: string;  // Added
  title: string;
  content: string;
}

// Scope app installations by tenant
interface AppInstallation {
  id: string;
  appId: string;
  tenantId: string;  // Added
  status: 'active' | 'inactive';
}

// Query with tenant scoping
const posts = await db.query(`
  SELECT * FROM forum_post
  WHERE tenant_id = $1
  AND (tenant_id IN (SELECT id FROM tenants WHERE parent_id = $1))
`, [currentTenantId]);
```

---

## 9. Recommendations

### 9.1 Immediate Fixes (P0)

1. **Fix digitalsignage Manifest:**
   - Create stub manifest or remove from catalog
   - Prevents server crashes

2. **Rename "Apps" Systems:**
   - Rename `apps` table to `ai_services`
   - Rename "AI Services" page to "Services"
   - Keep `app_registry` for feature apps

3. **Add Tenant Support:**
   - Add `tenant_id` to all data tables
   - Add `branches`, `chapters` tables
   - Add tenant-aware queries

### 9.2 Short-Term Improvements (P1)

1. **Dynamic Routes & Menus:**
   - Load routes from manifests on app activation
   - Load menus from installed active apps
   - Enable true plug-and-play

2. **ACF UI Integration:**
   - Build dynamic form renderer for ACF schemas
   - Render extension fields in post editor
   - Enable vertical customization

3. **Better UX:**
   - Replace `alert()`/`confirm()` with modals/toasts
   - Add installation progress WebSocket
   - Add dependency graph visualization

### 9.3 Long-Term Enhancements (P2)

1. **Remote App Registry:**
   - Build app marketplace backend
   - Support remote manifest downloads
   - Enable versioning/updates

2. **App Sandboxing:**
   - Add permission middleware
   - Enforce app-level data isolation
   - Add runtime permission checks

3. **Transaction-Based Installation:**
   - Add rollback on installation failure
   - Add migration execution
   - Add backup before purge

---

## 10. Conclusion

The O4O Platform App Store is a **well-architected Core/Extension system** with strong dependency management and ownership validation. However, it has critical gaps for production use:

**Strengths:**
- Clean Core/Extension pattern
- Robust dependency resolution
- Type-safe manifest system
- Automated lifecycle hooks (Task A-4)

**Critical Issues:**
- Two conflicting "Apps" concepts
- Missing digitalsignage manifest (broken catalog)
- No multi-tenancy support (critical for branches)
- Routes/menus not dynamically loaded
- ACF schemas not consumed by UI

**For Branch/Chapter Services:**
- ✅ **Core/Extension pattern is perfect for vertical customization**
- ❌ **Must add multi-tenancy support**
- ❌ **Must add hierarchical organization structure**
- ⚠️ **Consider app installation scoping per branch**

**Next Steps:**

1. Fix broken digitalsignage manifest
2. Rename AI services to avoid confusion
3. Add multi-tenancy architecture
4. Integrate ACF with Admin UI forms
5. Enable dynamic routes/menus

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-30
**Reviewed By:** AI Audit Agent
**Status:** Complete
