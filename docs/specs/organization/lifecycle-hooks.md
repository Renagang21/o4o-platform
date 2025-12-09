# Organization-Core Lifecycle Hooks

**버전**: v1.0
**작성일**: 2025-11-30
**목적**: organization-core의 라이프사이클 훅 구현 가이드

---

## 📋 목차

1. [Lifecycle 개요](#1-lifecycle-개요)
2. [install Hook](#2-install-hook)
3. [activate Hook](#3-activate-hook)
4. [deactivate Hook](#4-deactivate-hook)
5. [uninstall Hook](#5-uninstall-hook)
6. [Context 인터페이스](#6-context-인터페이스)

---

## 1. Lifecycle 개요

### 1.1 라이프사이클 흐름

```
┌───────────┐
│  Pending  │  (앱 등록됨, 미설치)
└─────┬─────┘
      │
      │ install()
      ▼
┌───────────┐
│ Installed │  (설치됨, 비활성)
└─────┬─────┘
      │
      │ activate()
      ▼
┌───────────┐
│  Active   │  (활성화됨, 사용 중)
└─────┬─────┘
      │
      │ deactivate()
      ▼
┌───────────┐
│ Inactive  │  (비활성화됨)
└─────┬─────┘
      │
      │ uninstall()
      ▼
┌───────────┐
│  Removed  │  (삭제됨)
└───────────┘
```

### 1.2 훅 실행 시점

| 훅 | 실행 시점 | 주요 작업 |
|-----|-----------|-----------|
| `install` | 앱 최초 설치 시 | 테이블 생성, 권한 등록, 초기 데이터 생성 |
| `activate` | 앱 활성화 시 | 라우트 등록, 서비스 시작 |
| `deactivate` | 앱 비활성화 시 | 라우트 해제, 서비스 중지 |
| `uninstall` | 앱 삭제 시 | 테이블 삭제, 데이터 정리 |

---

## 2. install Hook

### 2.1 역할

- **테이블 생성**: `organizations`, `organization_members`
- **권한 등록**: `organization.read`, `organization.manage` 등
- **초기 데이터 생성**: 최상위 조직 (본부) 생성
- **인덱스 생성**: 성능 최적화

### 2.2 구현 코드

```typescript
// packages/organization-core/src/lifecycle/install.ts
import { InstallContext } from '@o4o/types';
import { Organization } from '../entities/Organization';
import { OrganizationMember } from '../entities/OrganizationMember';

export async function install(context: InstallContext): Promise<void> {
  const { dataSource, manifest, logger, options = {} } = context;

  logger.info(`[${manifest.appId}] Starting installation...`);

  try {
    // 1. 테이블 생성
    await createTables(dataSource, logger);

    // 2. 인덱스 생성
    await createIndexes(dataSource, logger);

    // 3. 권한 등록
    await registerPermissions(dataSource, manifest, logger);

    // 4. RoleAssignment 확장 (scopeType/scopeId 컬럼 추가)
    await extendRoleAssignment(dataSource, logger);

    // 5. 초기 조직 생성 (선택적)
    if (options.seedDefaultData) {
      await seedDefaultOrganization(dataSource, logger);
    }

    logger.info(`[${manifest.appId}] Installation completed successfully.`);
  } catch (error) {
    logger.error(`[${manifest.appId}] Installation failed:`, error);
    throw error;
  }
}

// 테이블 생성
async function createTables(dataSource: any, logger: any): Promise<void> {
  logger.info('Creating tables...');

  // organizations 테이블
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) UNIQUE NOT NULL,
      type VARCHAR(50) NOT NULL,
      parent_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
      level INTEGER NOT NULL DEFAULT 0,
      path TEXT NOT NULL,
      metadata JSONB,
      is_active BOOLEAN NOT NULL DEFAULT true,
      children_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // organization_members 테이블
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS organization_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL DEFAULT 'member',
      is_primary BOOLEAN NOT NULL DEFAULT false,
      metadata JSONB,
      joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      left_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organization_id, user_id)
    );
  `);

  logger.info('Tables created successfully.');
}

// 인덱스 생성
async function createIndexes(dataSource: any, logger: any): Promise<void> {
  logger.info('Creating indexes...');

  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations(code);
    CREATE INDEX IF NOT EXISTS idx_organizations_parent_id ON organizations(parent_id);
    CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
    CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);
    CREATE INDEX IF NOT EXISTS idx_organizations_path ON organizations USING gin(to_tsvector('simple', path));

    CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_org_user ON organization_members(organization_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
    CREATE INDEX IF NOT EXISTS idx_org_members_is_primary ON organization_members(is_primary) WHERE is_primary = true;
    CREATE INDEX IF NOT EXISTS idx_org_members_active ON organization_members(organization_id, left_at) WHERE left_at IS NULL;
  `);

  logger.info('Indexes created successfully.');
}

// 권한 등록
async function registerPermissions(dataSource: any, manifest: any, logger: any): Promise<void> {
  logger.info('Registering permissions...');

  const permissionRepo = dataSource.getRepository('Permission');

  for (const perm of manifest.permissions) {
    const exists = await permissionRepo.findOne({ where: { id: perm.id } });
    if (!exists) {
      await permissionRepo.save({
        id: perm.id,
        name: perm.name,
        description: perm.description,
        appId: manifest.appId,
        category: perm.category || 'organization'
      });
      logger.info(`Permission registered: ${perm.id}`);
    }
  }

  logger.info('Permissions registered successfully.');
}

// RoleAssignment 확장
async function extendRoleAssignment(dataSource: any, logger: any): Promise<void> {
  logger.info('Extending RoleAssignment table...');

  // scopeType 컬럼 추가
  await dataSource.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='role_assignments' AND column_name='scope_type'
      ) THEN
        ALTER TABLE role_assignments
        ADD COLUMN scope_type VARCHAR(50) NOT NULL DEFAULT 'global';
      END IF;
    END $$;
  `);

  // scopeId 컬럼 추가
  await dataSource.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='role_assignments' AND column_name='scope_id'
      ) THEN
        ALTER TABLE role_assignments
        ADD COLUMN scope_id UUID;
      END IF;
    END $$;
  `);

  // 인덱스 추가
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_role_assignments_scope
    ON role_assignments(scope_type, scope_id);
  `);

  // 제약 조건 추가
  await dataSource.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_org_scope'
      ) THEN
        ALTER TABLE role_assignments
        ADD CONSTRAINT chk_org_scope
        CHECK (
          (scope_type = 'global' AND scope_id IS NULL) OR
          (scope_type = 'organization' AND scope_id IS NOT NULL)
        );
      END IF;
    END $$;
  `);

  logger.info('RoleAssignment table extended successfully.');
}

// 초기 조직 생성
async function seedDefaultOrganization(dataSource: any, logger: any): Promise<void> {
  logger.info('Seeding default organization...');

  const orgRepo = dataSource.getRepository(Organization);

  const exists = await orgRepo.findOne({ where: { code: 'NATIONAL' } });
  if (!exists) {
    const org = new Organization();
    org.name = '본부';
    org.code = 'NATIONAL';
    org.type = 'national';
    org.level = 0;
    org.path = '/national';
    org.isActive = true;

    await orgRepo.save(org);
    logger.info('Default organization created: 본부 (NATIONAL)');
  } else {
    logger.info('Default organization already exists.');
  }
}
```

### 2.3 실행 옵션

```typescript
// 설치 시 옵션 전달
await appManager.install('organization-core', {
  seedDefaultData: true  // 초기 조직 생성
});
```

---

## 3. activate Hook

### 3.1 역할

- **라우트 등록**: API 엔드포인트 활성화
- **서비스 시작**: 백그라운드 작업 시작
- **이벤트 리스너 등록**: 도메인 이벤트 구독

### 3.2 구현 코드

```typescript
// packages/organization-core/src/lifecycle/activate.ts
import { ActivateContext } from '@o4o/types';

export async function activate(context: ActivateContext): Promise<void> {
  const { dataSource, manifest, logger } = context;

  logger.info(`[${manifest.appId}] Activating...`);

  try {
    // 1. 라우트 등록
    await registerRoutes(context);

    // 2. 이벤트 리스너 등록
    await registerEventListeners(context);

    // 3. 상태 업데이트
    await updateAppStatus(dataSource, manifest.appId, 'active');

    logger.info(`[${manifest.appId}] Activated successfully.`);
  } catch (error) {
    logger.error(`[${manifest.appId}] Activation failed:`, error);
    throw error;
  }
}

async function registerRoutes(context: ActivateContext): Promise<void> {
  const { manifest, logger } = context;

  logger.info('Registering routes...');

  // manifest.routes를 Express/Fastify 라우터에 등록
  // 실제 구현은 AppManager에서 처리

  logger.info(`${manifest.routes?.length || 0} routes registered.`);
}

async function registerEventListeners(context: ActivateContext): Promise<void> {
  const { logger } = context;

  logger.info('Registering event listeners...');

  // 예: 조직 생성 이벤트 리스너
  // eventBus.on('organization.created', handleOrganizationCreated);

  logger.info('Event listeners registered.');
}

async function updateAppStatus(dataSource: any, appId: string, status: string): Promise<void> {
  const appRepo = dataSource.getRepository('AppRegistry');
  await appRepo.update({ appId }, { status, activatedAt: new Date() });
}
```

---

## 4. deactivate Hook

### 4.1 역할

- **라우트 해제**: API 엔드포인트 비활성화
- **서비스 중지**: 백그라운드 작업 중지
- **이벤트 리스너 해제**: 구독 해제

### 4.2 구현 코드

```typescript
// packages/organization-core/src/lifecycle/deactivate.ts
import { DeactivateContext } from '@o4o/types';

export async function deactivate(context: DeactivateContext): Promise<void> {
  const { dataSource, manifest, logger } = context;

  logger.info(`[${manifest.appId}] Deactivating...`);

  try {
    // 1. 라우트 해제
    await unregisterRoutes(context);

    // 2. 이벤트 리스너 해제
    await unregisterEventListeners(context);

    // 3. 상태 업데이트
    await updateAppStatus(dataSource, manifest.appId, 'inactive');

    logger.info(`[${manifest.appId}] Deactivated successfully.`);
  } catch (error) {
    logger.error(`[${manifest.appId}] Deactivation failed:`, error);
    throw error;
  }
}

async function unregisterRoutes(context: DeactivateContext): Promise<void> {
  const { manifest, logger } = context;
  logger.info('Unregistering routes...');
  // manifest.routes 해제
  logger.info(`${manifest.routes?.length || 0} routes unregistered.`);
}

async function unregisterEventListeners(context: DeactivateContext): Promise<void> {
  const { logger } = context;
  logger.info('Unregistering event listeners...');
  // eventBus.off('organization.created', handleOrganizationCreated);
  logger.info('Event listeners unregistered.');
}

async function updateAppStatus(dataSource: any, appId: string, status: string): Promise<void> {
  const appRepo = dataSource.getRepository('AppRegistry');
  await appRepo.update({ appId }, { status, deactivatedAt: new Date() });
}
```

---

## 5. uninstall Hook

### 5.1 역할

- **데이터 정리**: 조직 데이터 삭제 (옵션)
- **테이블 삭제**: 소유 테이블 삭제 (옵션)
- **권한 삭제**: 등록된 권한 삭제
- **RoleAssignment 정리**: 조직 스코프 권한 삭제

### 5.2 구현 코드

```typescript
// packages/organization-core/src/lifecycle/uninstall.ts
import { UninstallContext } from '@o4o/types';

export async function uninstall(context: UninstallContext): Promise<void> {
  const { dataSource, manifest, logger, options = {} } = context;

  logger.info(`[${manifest.appId}] Starting uninstallation...`);

  try {
    // 1. 데이터 삭제 (선택적)
    if (options.purgeData) {
      await purgeData(dataSource, logger);
    } else {
      logger.warn('Data preserved (purgeData=false).');
    }

    // 2. RoleAssignment 정리
    await cleanupRoleAssignments(dataSource, logger);

    // 3. 권한 삭제
    await deletePermissions(dataSource, manifest, logger);

    // 4. 테이블 삭제 (선택적)
    if (options.dropTables) {
      await dropTables(dataSource, logger);
    } else {
      logger.warn('Tables preserved (dropTables=false).');
    }

    logger.info(`[${manifest.appId}] Uninstallation completed successfully.`);
  } catch (error) {
    logger.error(`[${manifest.appId}] Uninstallation failed:`, error);
    throw error;
  }
}

// 데이터 삭제
async function purgeData(dataSource: any, logger: any): Promise<void> {
  logger.info('Purging organization data...');

  await dataSource.query(`DELETE FROM organization_members`);
  await dataSource.query(`DELETE FROM organizations`);

  logger.info('Organization data purged.');
}

// RoleAssignment 정리
async function cleanupRoleAssignments(dataSource: any, logger: any): Promise<void> {
  logger.info('Cleaning up organization role assignments...');

  await dataSource.query(`
    DELETE FROM role_assignments
    WHERE scope_type = 'organization'
  `);

  logger.info('Organization role assignments cleaned up.');
}

// 권한 삭제
async function deletePermissions(dataSource: any, manifest: any, logger: any): Promise<void> {
  logger.info('Deleting permissions...');

  const permissionRepo = dataSource.getRepository('Permission');

  for (const perm of manifest.permissions) {
    await permissionRepo.delete({ id: perm.id });
    logger.info(`Permission deleted: ${perm.id}`);
  }

  logger.info('Permissions deleted successfully.');
}

// 테이블 삭제
async function dropTables(dataSource: any, logger: any): Promise<void> {
  logger.info('Dropping tables...');

  await dataSource.query(`DROP TABLE IF EXISTS organization_members CASCADE`);
  await dataSource.query(`DROP TABLE IF EXISTS organizations CASCADE`);

  logger.info('Tables dropped successfully.');
}
```

### 5.3 실행 옵션

```typescript
// 삭제 시 옵션 전달
await appManager.uninstall('organization-core', {
  purgeData: true,    // 데이터 삭제
  dropTables: true    // 테이블 삭제
});
```

### 5.4 삭제 정책

| 정책 | purgeData | dropTables | 결과 |
|------|-----------|------------|------|
| **보존** (기본) | false | false | 데이터와 테이블 모두 유지 |
| **데이터만 삭제** | true | false | 데이터 삭제, 테이블 유지 |
| **완전 삭제** | true | true | 데이터와 테이블 모두 삭제 |

---

## 6. Context 인터페이스

### 6.1 InstallContext

```typescript
interface InstallContext {
  dataSource: DataSource;        // TypeORM DataSource
  manifest: AppManifest;          // 앱 manifest
  logger: Logger;                 // 로거
  options?: {
    seedDefaultData?: boolean;    // 초기 데이터 생성 여부
    [key: string]: any;
  };
}
```

### 6.2 ActivateContext

```typescript
interface ActivateContext {
  dataSource: DataSource;
  manifest: AppManifest;
  logger: Logger;
  app?: Express | FastifyInstance;  // HTTP 서버 인스턴스
}
```

### 6.3 DeactivateContext

```typescript
interface DeactivateContext {
  dataSource: DataSource;
  manifest: AppManifest;
  logger: Logger;
}
```

### 6.4 UninstallContext

```typescript
interface UninstallContext {
  dataSource: DataSource;
  manifest: AppManifest;
  logger: Logger;
  options?: {
    purgeData?: boolean;      // 데이터 삭제 여부
    dropTables?: boolean;     // 테이블 삭제 여부
    [key: string]: any;
  };
}
```

---

**작성자**: Claude Code
**최종 업데이트**: 2025-11-30
**버전**: v1.0
**상태**: 설계 완료
