# App Manifest Schema v1 설계

**작성일**: 2025-11-28
**Phase**: AM2 – App Market V1 설계
**상태**: ✅ 설계 완료
**버전**: 1.0.0

---

## 1. 개요

### 1.1 목적

App Manifest는 O4O 플랫폼에서 "앱(App)"의 메타데이터를 표현하는 JSON 스키마이다.

**주요 역할**:
- 앱의 식별 정보 (이름, 버전, 작성자 등)
- 앱의 의존성 정의 (다른 앱, 서비스)
- 앱의 리소스 정의 (Entity, 권한, 라우트)
- 앱 설치/활성화 시 필요한 정보 제공

### 1.2 설계 원칙

1. **단순함 (Simplicity)**: 필수 필드만 포함, 복잡도 최소화
2. **확장성 (Extensibility)**: 향후 필드 추가 가능
3. **검증 가능 (Validatable)**: JSON Schema로 검증 가능
4. **자기 설명적 (Self-Descriptive)**: 주석 없이도 이해 가능

---

## 2. Manifest 파일 위치 및 형식

### 2.1 파일 위치

**Option A: JSON 파일 (권장)**
```
apps/api-server/src/apps/
├── forum/
│   ├── manifest.json          ← Forum 앱 매니페스트
│   ├── routes.ts              ← Forum 라우트
│   ├── controllers.ts
│   └── ...
├── wishlist/
│   └── manifest.json          ← Wishlist 앱 매니페스트
└── ...
```

**Option B: TypeScript 상수**
```typescript
// apps/api-server/src/apps/registry.ts
export const APP_MANIFESTS: Record<string, AppManifest> = {
  forum: {
    name: 'forum',
    version: '1.0.0',
    // ...
  },
  wishlist: {
    // ...
  }
};
```

**권장**: Option A (JSON 파일)
- 이유: 코드 재배포 없이 매니페스트 수정 가능
- JSON Schema 검증 용이
- 외부 앱 지원 시 확장 가능

### 2.2 파일 명명 규칙

- 파일명: `manifest.json` (고정)
- 위치: `apps/api-server/src/apps/{appName}/manifest.json`
- 인코딩: UTF-8
- 포맷: JSON (들여쓰기 2칸)

---

## 3. Manifest 스키마 정의

### 3.1 전체 스키마

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "version", "displayName", "category"],
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9-]*$",
      "description": "앱 고유 ID (소문자, 숫자, 하이픈만 허용)"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Semantic Versioning (예: 1.0.0)"
    },
    "displayName": {
      "type": "string",
      "description": "사용자에게 표시될 앱 이름"
    },
    "description": {
      "type": "string",
      "description": "앱 설명 (최대 500자)"
    },
    "icon": {
      "type": "string",
      "description": "앱 아이콘 URL 또는 경로"
    },
    "author": {
      "type": "string",
      "description": "앱 작성자 (예: O4O Team)"
    },
    "homepage": {
      "type": "string",
      "format": "uri",
      "description": "앱 홈페이지 URL"
    },
    "category": {
      "type": "string",
      "enum": ["business", "community", "analytics", "marketing", "utility", "core"],
      "description": "앱 카테고리"
    },
    "isCore": {
      "type": "boolean",
      "default": false,
      "description": "코어 앱 여부 (true이면 삭제 불가)"
    },
    "dependencies": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^[a-z][a-z0-9-]*$"
      },
      "description": "의존하는 다른 앱 목록"
    },
    "entities": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "TypeORM Entity 클래스 이름 목록"
    },
    "permissions": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$"
      },
      "description": "권한 키 목록 (패턴: {app}:{action})"
    },
    "routes": {
      "type": "object",
      "properties": {
        "api": {
          "type": "array",
          "items": { "type": "string" },
          "description": "API 라우트 경로 목록"
        },
        "admin": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Admin UI 라우트 경로 목록"
        },
        "main": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Main Site 라우트 경로 목록"
        }
      }
    },
    "featureFlags": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^[A-Z_]+$"
      },
      "description": "환경변수 목록 (예: ENABLE_FORUM)"
    },
    "config": {
      "type": "object",
      "description": "앱별 기본 설정값"
    },
    "metadata": {
      "type": "object",
      "description": "추가 메타데이터 (확장용)"
    }
  }
}
```

---

### 3.2 필드별 상세 설명

#### 3.2.1 `name` (필수)

- **타입**: `string`
- **패턴**: `^[a-z][a-z0-9-]*$` (소문자로 시작, 소문자/숫자/하이픈만 허용)
- **설명**: 앱의 고유 ID. 시스템 내에서 앱을 식별하는 데 사용.
- **예시**: `"forum"`, `"wishlist"`, `"partner-affiliate"`

**제약**:
- 중복 불가 (시스템 전체에서 유일)
- 변경 불가 (한 번 정의하면 변경 안 됨)
- 예약어 금지: `core`, `system`, `admin`, `api`

---

#### 3.2.2 `version` (필수)

- **타입**: `string`
- **패턴**: `^\\d+\\.\\d+\\.\\d+$` (Semantic Versioning)
- **설명**: 앱 버전. `MAJOR.MINOR.PATCH` 형식.
- **예시**: `"1.0.0"`, `"2.1.3"`

**버전 규칙** (Semantic Versioning):
- `MAJOR`: 호환성이 깨지는 변경
- `MINOR`: 기능 추가 (하위 호환)
- `PATCH`: 버그 수정 (하위 호환)

---

#### 3.2.3 `displayName` (필수)

- **타입**: `string`
- **설명**: 사용자에게 표시될 앱 이름. UI에서 사용.
- **예시**: `"Forum"`, `"Wishlist"`, `"Partner & Affiliate"`

---

#### 3.2.4 `description` (선택)

- **타입**: `string`
- **설명**: 앱 설명. Admin UI에서 표시.
- **최대 길이**: 500자
- **예시**: `"Community forum for discussions, Q&A, and announcements."`

---

#### 3.2.5 `icon` (선택)

- **타입**: `string`
- **설명**: 앱 아이콘 URL 또는 상대 경로.
- **예시**:
  - `"/assets/icons/forum.svg"` (상대 경로)
  - `"https://cdn.example.com/icons/forum.svg"` (절대 URL)

---

#### 3.2.6 `author` (선택)

- **타입**: `string`
- **설명**: 앱 작성자.
- **예시**: `"O4O Team"`, `"Community Contributors"`

---

#### 3.2.7 `homepage` (선택)

- **타입**: `string` (URI 형식)
- **설명**: 앱 홈페이지 또는 문서 URL.
- **예시**: `"https://docs.o4o.com/apps/forum"`

---

#### 3.2.8 `category` (필수)

- **타입**: `enum` (문자열)
- **허용값**:
  - `business`: 비즈니스 로직 (Seller, Supplier, Settlement 등)
  - `community`: 커뮤니티 기능 (Forum, Review 등)
  - `analytics`: 분석/리포팅
  - `marketing`: 마케팅 (Partner, Campaign 등)
  - `utility`: 유틸리티 (Wishlist, Notification 등)
  - `core`: 코어 시스템 (User, Auth, Product 등)
- **설명**: 앱 카테고리. Admin UI에서 필터링 시 사용.

---

#### 3.2.9 `isCore` (선택, 기본값: `false`)

- **타입**: `boolean`
- **설명**: 코어 앱 여부. `true`이면 삭제 불가.
- **예시**:
  - `true`: Seller, Supplier, Settlement, Notification (삭제 시 시스템 장애)
  - `false`: Forum, Wishlist (삭제 가능)

---

#### 3.2.10 `dependencies` (선택)

- **타입**: `array<string>`
- **설명**: 이 앱이 의존하는 다른 앱 목록. 의존 앱이 설치되지 않았거나 비활성화되면 이 앱도 작동 불가.
- **예시**:
  ```json
  "dependencies": ["notification", "cache"]
  ```

**검증 규칙**:
- 순환 참조 금지 (A → B → A)
- 의존 앱이 존재하지 않으면 설치 실패

---

#### 3.2.11 `entities` (선택)

- **타입**: `array<string>`
- **설명**: 이 앱이 사용하는 TypeORM Entity 클래스 이름 목록.
- **예시**:
  ```json
  "entities": ["ForumPost", "ForumComment", "ForumCategory", "ForumTag"]
  ```

**용도**:
- 앱 삭제 시 데이터 정리 범위 파악
- Migration 자동 생성 (선택사항)

---

#### 3.2.12 `permissions` (선택)

- **타입**: `array<string>`
- **패턴**: `^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$` (예: `forum:read`, `forum:write`)
- **설명**: 이 앱이 정의하는 권한 키 목록.
- **예시**:
  ```json
  "permissions": [
    "forum:read",
    "forum:write",
    "forum:moderate",
    "forum:admin"
  ]
  ```

**네이밍 규칙**:
- 패턴: `{appName}:{action}`
- 소문자, 숫자, 하이픈만 허용
- 예시: `forum:read`, `partner:manage-links`

---

#### 3.2.13 `routes` (선택)

- **타입**: `object`
- **설명**: 이 앱이 사용하는 라우트 경로 목록.
- **구조**:
  ```json
  "routes": {
    "api": ["/api/v1/forum/*"],
    "admin": ["/apps/forum/*", "/cpt-acf/forum_*"],
    "main": ["/forum", "/forum/:id"]
  }
  ```

**필드**:
- `api`: API 엔드포인트 경로 (백엔드)
- `admin`: Admin Dashboard 라우트 (프론트)
- `main`: Main Site 라우트 (프론트)

**용도**:
- AppGuard 적용 시 라우트 필터링
- 앱 비활성화 시 404 반환

---

#### 3.2.14 `featureFlags` (선택)

- **타입**: `array<string>`
- **패턴**: `^[A-Z_]+$` (대문자, 언더스코어만 허용)
- **설명**: 이 앱이 사용하는 환경변수 목록.
- **예시**:
  ```json
  "featureFlags": ["ENABLE_FORUM", "FORUM_POSTS_PER_PAGE"]
  ```

**용도**:
- 앱 활성화 시 Feature Flag 동기화
- 설정값 관리

---

#### 3.2.15 `config` (선택)

- **타입**: `object`
- **설명**: 앱별 기본 설정값. JSON 형태로 자유롭게 정의.
- **예시**:
  ```json
  "config": {
    "postsPerPage": 20,
    "maxPostsPerDay": 100,
    "requireApproval": false,
    "allowedFileTypes": ["image/jpeg", "image/png"]
  }
  ```

**용도**:
- `app_registry.config` JSONB 필드에 저장
- Admin UI에서 수정 가능

---

#### 3.2.16 `metadata` (선택)

- **타입**: `object`
- **설명**: 추가 메타데이터. 확장용 필드.
- **예시**:
  ```json
  "metadata": {
    "tags": ["community", "discussion"],
    "license": "MIT",
    "repository": "https://github.com/o4o/forum-app"
  }
  ```

---

## 4. Manifest 예시

### 4.1 Forum 앱 Manifest (완전한 예시)

```json
{
  "name": "forum",
  "version": "1.0.0",
  "displayName": "Forum",
  "description": "Community forum for discussions, Q&A, and announcements. Supports categories, tags, comments, likes, and bookmarks.",
  "icon": "/assets/icons/forum.svg",
  "author": "O4O Team",
  "homepage": "https://docs.o4o.com/apps/forum",
  "category": "community",
  "isCore": false,
  "dependencies": ["notification"],
  "entities": [
    "ForumPost",
    "ForumComment",
    "ForumCategory",
    "ForumTag",
    "ForumLike",
    "ForumBookmark"
  ],
  "permissions": [
    "forum:read",
    "forum:write",
    "forum:edit-own",
    "forum:delete-own",
    "forum:moderate",
    "forum:admin"
  ],
  "routes": {
    "api": ["/api/v1/forum/*"],
    "admin": ["/apps/forum/*"],
    "main": ["/forum", "/forum/:id", "/forum/create"]
  },
  "featureFlags": ["ENABLE_FORUM"],
  "config": {
    "postsPerPage": 20,
    "maxPostsPerDay": 100,
    "requireLoginToRead": false,
    "requireApproval": false,
    "allowedFileTypes": ["image/jpeg", "image/png", "application/pdf"],
    "maxFileSize": 5242880,
    "editTimeLimit": 86400
  },
  "metadata": {
    "tags": ["community", "discussion", "Q&A"],
    "license": "Proprietary",
    "repository": "https://github.com/o4o/o4o-platform"
  }
}
```

---

### 4.2 Wishlist 앱 Manifest (간단한 예시)

```json
{
  "name": "wishlist",
  "version": "1.0.0",
  "displayName": "Wishlist",
  "description": "Save favorite products for later purchase.",
  "category": "utility",
  "isCore": false,
  "dependencies": [],
  "entities": ["Wishlist"],
  "permissions": ["wishlist:manage-own"],
  "routes": {
    "api": ["/api/v1/wishlist/*"],
    "main": ["/wishlist", "/wishlist/my"]
  },
  "featureFlags": ["ENABLE_WISHLIST"],
  "config": {
    "maxItemsPerUser": 100
  }
}
```

---

### 4.3 Settlement 앱 Manifest (코어 앱 예시)

```json
{
  "name": "settlement",
  "version": "1.0.0",
  "displayName": "Settlement",
  "description": "Payment settlement and commission management for suppliers, sellers, and partners.",
  "category": "business",
  "isCore": true,
  "dependencies": ["payment"],
  "entities": ["PaymentSettlement", "Settlement"],
  "permissions": [
    "settlement:view-own",
    "settlement:admin",
    "settlement:export"
  ],
  "routes": {
    "api": ["/api/v1/settlements/*"],
    "admin": ["/dashboard/admin/settlements/*"],
    "main": [
      "/dashboard/seller/settlements",
      "/dashboard/supplier/settlements",
      "/dashboard/partner/settlements"
    ]
  },
  "featureFlags": [],
  "config": {
    "autoSettlementEnabled": true,
    "settlementCycle": "monthly",
    "minSettlementAmount": 10000
  }
}
```

---

## 5. Manifest 검증

### 5.1 검증 시점

1. **앱 등록 시** (개발 중):
   - Manifest 파일 생성 시 JSON Schema 검증
   - TypeScript 컴파일 시 타입 체크

2. **앱 설치 시** (런타임):
   - `AppManagerService.installApp()` 호출 시
   - Manifest 필드 유효성 검증
   - 의존성 체크

### 5.2 검증 규칙

#### 5.2.1 필수 필드 검증

```typescript
function validateManifest(manifest: AppManifest): ValidationResult {
  const errors: string[] = [];

  // 필수 필드 체크
  if (!manifest.name) errors.push('name is required');
  if (!manifest.version) errors.push('version is required');
  if (!manifest.displayName) errors.push('displayName is required');
  if (!manifest.category) errors.push('category is required');

  return { valid: errors.length === 0, errors };
}
```

---

#### 5.2.2 네이밍 규칙 검증

```typescript
// name 필드
const namePattern = /^[a-z][a-z0-9-]*$/;
if (!namePattern.test(manifest.name)) {
  errors.push('name must start with lowercase letter and contain only lowercase, numbers, and hyphens');
}

// version 필드
const versionPattern = /^\d+\.\d+\.\d+$/;
if (!versionPattern.test(manifest.version)) {
  errors.push('version must follow Semantic Versioning (e.g., 1.0.0)');
}

// permissions 필드
const permissionPattern = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;
for (const perm of manifest.permissions || []) {
  if (!permissionPattern.test(perm)) {
    errors.push(`permission '${perm}' must follow pattern {app}:{action}`);
  }
}
```

---

#### 5.2.3 의존성 검증

```typescript
function validateDependencies(manifest: AppManifest, installedApps: Set<string>): ValidationResult {
  const errors: string[] = [];

  for (const dep of manifest.dependencies || []) {
    if (!installedApps.has(dep)) {
      errors.push(`dependency '${dep}' is not installed`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

---

#### 5.2.4 순환 참조 검증

```typescript
function detectCircularDependency(
  appName: string,
  manifests: Map<string, AppManifest>,
  visited: Set<string> = new Set()
): boolean {
  if (visited.has(appName)) {
    return true; // 순환 참조 발견
  }

  visited.add(appName);

  const manifest = manifests.get(appName);
  if (!manifest) return false;

  for (const dep of manifest.dependencies || []) {
    if (detectCircularDependency(dep, manifests, visited)) {
      return true;
    }
  }

  visited.delete(appName);
  return false;
}
```

---

## 6. TypeScript 타입 정의

### 6.1 타입 파일 위치

- `apps/api-server/src/types/AppManifest.ts`

### 6.2 타입 정의

```typescript
export type AppCategory =
  | 'business'
  | 'community'
  | 'analytics'
  | 'marketing'
  | 'utility'
  | 'core';

export interface AppManifest {
  // 필수 필드
  name: string;
  version: string;
  displayName: string;
  category: AppCategory;

  // 선택 필드
  description?: string;
  icon?: string;
  author?: string;
  homepage?: string;
  isCore?: boolean;
  dependencies?: string[];
  entities?: string[];
  permissions?: string[];
  routes?: {
    api?: string[];
    admin?: string[];
    main?: string[];
  };
  featureFlags?: string[];
  config?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface AppStatus {
  name: string;
  isInstalled: boolean;
  isActive: boolean;
  version?: string;
}
```

---

## 7. Manifest 관리

### 7.1 Manifest 로드

```typescript
// apps/api-server/src/services/AppManifestLoader.ts
import fs from 'fs/promises';
import path from 'path';

export class AppManifestLoader {
  private manifestsDir = path.join(__dirname, '../apps');

  async loadAll(): Promise<Map<string, AppManifest>> {
    const manifests = new Map<string, AppManifest>();
    const appDirs = await fs.readdir(this.manifestsDir);

    for (const appDir of appDirs) {
      const manifestPath = path.join(this.manifestsDir, appDir, 'manifest.json');
      try {
        const manifestJson = await fs.readFile(manifestPath, 'utf-8');
        const manifest: AppManifest = JSON.parse(manifestJson);
        manifests.set(manifest.name, manifest);
      } catch (error) {
        console.error(`Failed to load manifest for ${appDir}:`, error);
      }
    }

    return manifests;
  }

  async load(appName: string): Promise<AppManifest | null> {
    const manifestPath = path.join(this.manifestsDir, appName, 'manifest.json');
    try {
      const manifestJson = await fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(manifestJson);
    } catch (error) {
      return null;
    }
  }
}
```

---

### 7.2 Manifest 캐싱

```typescript
// apps/api-server/src/services/AppManifestCache.ts
export class AppManifestCache {
  private cache: Map<string, AppManifest> = new Map();
  private lastReload: Date | null = null;

  async get(appName: string): Promise<AppManifest | null> {
    if (!this.cache.has(appName)) {
      await this.reload();
    }
    return this.cache.get(appName) || null;
  }

  async getAll(): Promise<Map<string, AppManifest>> {
    if (this.cache.size === 0) {
      await this.reload();
    }
    return new Map(this.cache);
  }

  async reload(): Promise<void> {
    const loader = new AppManifestLoader();
    this.cache = await loader.loadAll();
    this.lastReload = new Date();
  }

  invalidate(appName?: string): void {
    if (appName) {
      this.cache.delete(appName);
    } else {
      this.cache.clear();
    }
  }
}
```

---

## 8. 향후 확장 고려사항

### 8.1 버전 관리

- `manifest.json`에 `minPlatformVersion`, `maxPlatformVersion` 필드 추가
- 플랫폼 버전과 앱 버전 호환성 체크

### 8.2 앱 마켓플레이스

- 외부 앱 다운로드 지원
- `manifest.json`에 `downloadUrl`, `checksum` 필드 추가

### 8.3 멀티테넌트

- 테넌트별 앱 활성화/비활성화
- `app_registry` 테이블에 `tenant_id` 컬럼 추가

### 8.4 앱 간 통신

- Event Bus 지원
- `manifest.json`에 `events` 필드 추가
  ```json
  "events": {
    "emits": ["forum.post.created", "forum.comment.added"],
    "subscribes": ["user.deleted", "notification.sent"]
  }
  ```

---

## 9. 참고 자료

### 9.1 유사 시스템

- **WordPress Plugin System**: `plugin.php` 헤더
- **VS Code Extensions**: `package.json` manifest
- **Chrome Extensions**: `manifest.json` v3
- **npm Packages**: `package.json`

### 9.2 관련 문서

- AM1 조사 결과: `docs/dev/audit/app_market_current_apps_overview.md`
- AM2 설계 요청: `docs/dev/AM2-AppMarket-Design-Request.md`

---

**End of Document**
