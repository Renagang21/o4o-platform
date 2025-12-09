# Organization-Core App Store Manifest

**버전**: v1.0
**작성일**: 2025-11-30
**목적**: organization-core의 App Store manifest 정의

---

## 📋 목차

1. [Manifest 개요](#1-manifest-개요)
2. [manifest.ts 정의](#2-manifestts-정의)
3. [테이블 소유권](#3-테이블-소유권)
4. [권한 정의](#4-권한-정의)
5. [의존성 관리](#5-의존성-관리)
6. [라이프사이클 훅](#6-라이프사이클-훅)

---

## 1. Manifest 개요

### 1.1 역할

App Store manifest는 organization-core 앱의 메타데이터를 정의합니다:

- 앱 ID, 이름, 버전
- 소유 테이블 (ownsTables)
- 권한 정의 (permissions)
- 의존성 (dependencies)
- 라이프사이클 훅 (lifecycle)
- API 라우트 (routes)

### 1.2 위치

```
packages/organization-core/
└── src/
    └── manifest.ts
```

---

## 2. manifest.ts 정의

### 2.1 전체 코드

```typescript
// packages/organization-core/src/manifest.ts
import { AppManifest } from '@o4o/types';

export const manifest: AppManifest = {
  // 기본 정보
  appId: 'organization-core',
  name: 'Organization Core',
  version: '1.0.0',
  type: 'core',
  description: '전사 조직 관리 시스템 (Core Domain)',

  // 작성자 정보
  author: {
    name: 'O4O Platform',
    email: 'dev@o4o-platform.com',
    url: 'https://o4o-platform.com'
  },

  // 의존성
  dependencies: [],

  // 소유 테이블
  ownsTables: [
    'organizations',
    'organization_members'
  ],

  // 권한 정의
  permissions: [
    {
      id: 'organization.read',
      name: '조직 읽기',
      description: '조직 정보를 조회할 수 있는 권한'
    },
    {
      id: 'organization.manage',
      name: '조직 관리',
      description: '조직 생성/수정/삭제 권한'
    },
    {
      id: 'organization.member.read',
      name: '조직 멤버 읽기',
      description: '조직 멤버 목록 조회 권한'
    },
    {
      id: 'organization.member.manage',
      name: '조직 멤버 관리',
      description: '조직 멤버 추가/삭제/수정 권한'
    }
  ],

  // 라이프사이클 훅
  lifecycle: {
    install: './lifecycle/install',
    activate: './lifecycle/activate',
    deactivate: './lifecycle/deactivate',
    uninstall: './lifecycle/uninstall'
  },

  // API 라우트
  routes: [
    {
      path: '/api/organization',
      method: 'GET',
      handler: './controllers/OrganizationController.list',
      permission: 'organization.read'
    },
    {
      path: '/api/organization/:id',
      method: 'GET',
      handler: './controllers/OrganizationController.get',
      permission: 'organization.read'
    },
    {
      path: '/api/organization',
      method: 'POST',
      handler: './controllers/OrganizationController.create',
      permission: 'organization.manage'
    },
    {
      path: '/api/organization/:id',
      method: 'PUT',
      handler: './controllers/OrganizationController.update',
      permission: 'organization.manage'
    },
    {
      path: '/api/organization/:id',
      method: 'DELETE',
      handler: './controllers/OrganizationController.delete',
      permission: 'organization.manage'
    },
    {
      path: '/api/organization/:id/members',
      method: 'GET',
      handler: './controllers/OrganizationController.getMembers',
      permission: 'organization.member.read'
    },
    {
      path: '/api/organization/:id/members',
      method: 'POST',
      handler: './controllers/OrganizationController.addMember',
      permission: 'organization.member.manage'
    }
  ],

  // CPT 정의 (선택적)
  customPostTypes: [],

  // ACF 정의 (선택적)
  advancedCustomFields: [],

  // 블록 정의 (선택적)
  blocks: [],

  // 설정
  settings: {
    enableHierarchy: true,           // 계층 구조 활성화
    maxDepth: 5,                     // 최대 계층 깊이
    defaultOrganizationType: 'branch' // 기본 조직 유형
  }
};
```

### 2.2 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `appId` | string | ✅ | 앱 고유 ID (고유값) |
| `name` | string | ✅ | 앱 이름 |
| `version` | string | ✅ | 버전 (Semantic Versioning) |
| `type` | string | ✅ | 앱 타입 (`core`, `extension`) |
| `description` | string | ✅ | 앱 설명 |
| `author` | object | ❌ | 작성자 정보 |
| `dependencies` | array | ✅ | 의존성 목록 (빈 배열 가능) |
| `ownsTables` | array | ✅ | 소유 테이블 목록 |
| `permissions` | array | ✅ | 권한 정의 |
| `lifecycle` | object | ✅ | 라이프사이클 훅 경로 |
| `routes` | array | ❌ | API 라우트 정의 |
| `customPostTypes` | array | ❌ | CPT 정의 |
| `advancedCustomFields` | array | ❌ | ACF 정의 |
| `blocks` | array | ❌ | 블록 정의 |
| `settings` | object | ❌ | 앱 설정 |

---

## 3. 테이블 소유권

### 3.1 ownsTables 정의

organization-core가 소유하는 테이블:

```typescript
ownsTables: [
  'organizations',
  'organization_members'
]
```

### 3.2 소유권 검증

AppManager는 테이블 소유권을 검증합니다:

**설치 시:**
- 소유 테이블이 이미 존재하는지 확인
- 다른 앱이 소유한 테이블인지 확인
- 충돌 시 설치 중단

**삭제 시:**
- 소유 테이블만 삭제 가능
- 다른 앱이 의존하는 테이블은 삭제 불가

**예시 코드:**
```typescript
// AppManager.ts
async install(appId: string): Promise<void> {
  const manifest = await this.loadManifest(appId);

  // 테이블 소유권 검증
  for (const table of manifest.ownsTables) {
    const owner = await this.getTableOwner(table);
    if (owner && owner !== appId) {
      throw new ConflictException(
        `Table "${table}" is already owned by "${owner}"`
      );
    }
  }

  // 설치 진행...
}
```

---

## 4. 권한 정의

### 4.1 permissions 배열

```typescript
permissions: [
  {
    id: 'organization.read',
    name: '조직 읽기',
    description: '조직 정보를 조회할 수 있는 권한',
    category: 'organization'
  },
  {
    id: 'organization.manage',
    name: '조직 관리',
    description: '조직 생성/수정/삭제 권한',
    category: 'organization'
  },
  {
    id: 'organization.member.read',
    name: '조직 멤버 읽기',
    description: '조직 멤버 목록 조회 권한',
    category: 'organization'
  },
  {
    id: 'organization.member.manage',
    name: '조직 멤버 관리',
    description: '조직 멤버 추가/삭제/수정 권한',
    category: 'organization'
  }
]
```

### 4.2 권한 네이밍 규칙

```
<domain>.<resource>.<action>

예시:
- organization.read
- organization.manage
- organization.member.read
- organization.member.manage
```

### 4.3 권한 등록

앱 설치 시 자동으로 권한이 시스템에 등록됩니다:

```typescript
// install.ts
export async function install(context: InstallContext): Promise<void> {
  const { dataSource, manifest } = context;
  const permissionRepo = dataSource.getRepository(Permission);

  // 권한 등록
  for (const perm of manifest.permissions) {
    const exists = await permissionRepo.findOne({
      where: { id: perm.id }
    });

    if (!exists) {
      await permissionRepo.save({
        id: perm.id,
        name: perm.name,
        description: perm.description,
        appId: manifest.appId
      });
    }
  }
}
```

---

## 5. 의존성 관리

### 5.1 dependencies 정의

organization-core는 **의존성이 없음** (Core App):

```typescript
dependencies: []
```

### 5.2 Extension App 의존성 예시

Extension App은 organization-core를 의존:

```typescript
// organization-yaksa/src/manifest.ts
export const manifest: AppManifest = {
  appId: 'organization-yaksa',
  name: '약사회 조직 확장',
  version: '1.0.0',
  type: 'extension',

  // ✅ organization-core 의존성 명시
  dependencies: [
    {
      appId: 'organization-core',
      version: '^1.0.0',
      required: true
    }
  ]
};
```

### 5.3 의존성 검증

AppManager는 의존성을 검증합니다:

```typescript
// AppManager.ts
async validateDependencies(manifest: AppManifest): Promise<void> {
  for (const dep of manifest.dependencies) {
    const installedApp = await this.getInstalledApp(dep.appId);

    // 의존 앱이 설치되지 않음
    if (!installedApp) {
      throw new DependencyNotMetException(
        `Dependency not met: ${dep.appId}`
      );
    }

    // 버전 호환성 체크
    if (!this.isVersionCompatible(installedApp.version, dep.version)) {
      throw new VersionMismatchException(
        `Version mismatch: ${dep.appId} requires ${dep.version}, but ${installedApp.version} is installed`
      );
    }
  }
}
```

---

## 6. 라이프사이클 훅

### 6.1 lifecycle 정의

```typescript
lifecycle: {
  install: './lifecycle/install',
  activate: './lifecycle/activate',
  deactivate: './lifecycle/deactivate',
  uninstall: './lifecycle/uninstall'
}
```

### 6.2 각 훅의 역할

| 훅 | 실행 시점 | 역할 |
|-----|-----------|------|
| `install` | 앱 설치 시 | 테이블 생성, 초기 데이터 생성, 권한 등록 |
| `activate` | 앱 활성화 시 | 라우트 등록, 서비스 시작 |
| `deactivate` | 앱 비활성화 시 | 라우트 해제, 서비스 중지 |
| `uninstall` | 앱 삭제 시 | 테이블 삭제, 데이터 정리 |

### 6.3 훅 파일 구조

```
packages/organization-core/src/lifecycle/
├── install.ts          # 설치 훅
├── activate.ts         # 활성화 훅
├── deactivate.ts       # 비활성화 훅
└── uninstall.ts        # 삭제 훅
```

**install.ts 예시:**
```typescript
import { InstallContext } from '@o4o/types';

export async function install(context: InstallContext): Promise<void> {
  const { dataSource, manifest, logger, options } = context;

  logger.info(`Installing ${manifest.name}...`);

  // 1. 테이블 생성
  await createTables(dataSource);

  // 2. 권한 등록
  await registerPermissions(dataSource, manifest.permissions);

  // 3. 초기 조직 생성 (선택적)
  if (options?.seedDefaultData) {
    await seedDefaultOrganization(dataSource);
  }

  logger.info(`${manifest.name} installed successfully.`);
}
```

**uninstall.ts 예시:**
```typescript
import { UninstallContext } from '@o4o/types';

export async function uninstall(context: UninstallContext): Promise<void> {
  const { dataSource, manifest, logger, options } = context;

  logger.info(`Uninstalling ${manifest.name}...`);

  // 1. 데이터 삭제 정책 확인
  if (options?.purgeData) {
    // 모든 데이터 삭제
    await dataSource.query(`DELETE FROM organization_members`);
    await dataSource.query(`DELETE FROM organizations`);
    logger.info('All organization data purged.');
  } else {
    // 데이터 유지 (기본값)
    logger.info('Organization data preserved.');
  }

  // 2. 테이블 삭제
  if (options?.dropTables) {
    await dataSource.query(`DROP TABLE IF EXISTS organization_members CASCADE`);
    await dataSource.query(`DROP TABLE IF EXISTS organizations CASCADE`);
    logger.info('Organization tables dropped.');
  }

  logger.info(`${manifest.name} uninstalled successfully.`);
}
```

---

## 7. 앱 등록

### 7.1 App Store에 등록

```typescript
// apps/api-server/src/app.module.ts
import { manifest as organizationCoreManifest } from '@o4o/organization-core';

@Module({
  imports: [
    AppStoreModule.register({
      apps: [
        organizationCoreManifest,
        // ... other apps
      ]
    })
  ]
})
export class AppModule {}
```

### 7.2 설치 명령

```bash
# API를 통해 설치
POST /api/app-store/install
{
  "appId": "organization-core",
  "options": {
    "seedDefaultData": true
  }
}

# 또는 CLI 명령
npm run app:install organization-core
```

---

**작성자**: Claude Code
**최종 업데이트**: 2025-11-30
**버전**: v1.0
**상태**: 설계 완료
