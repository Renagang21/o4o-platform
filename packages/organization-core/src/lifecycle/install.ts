import { InstallContext } from '../types/context.js';

/**
 * Install Hook
 *
 * organization-core 앱 설치 시 실행됩니다.
 * - 테이블 생성
 * - 인덱스 생성
 * - 권한 등록
 * - RoleAssignment 확장 (scopeType/scopeId)
 * - 초기 조직 생성 (옵션)
 */
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

    // Note: 초기 조직 생성은 제거됨
    // 지부/분회 조직은 Admin 대시보드에서 수동 생성하거나
    // 별도 시드 스크립트를 통해 생성합니다.

    logger.info(`[${manifest.appId}] Installation completed successfully.`);
  } catch (error) {
    logger.error(`[${manifest.appId}] Installation failed:`, error);
    throw error;
  }
}

/**
 * 테이블 생성
 */
async function createTables(dataSource: any, logger: any): Promise<void> {
  logger.info('Creating tables...');

  // organizations 테이블
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) UNIQUE NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'branch',
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
      user_id UUID NOT NULL,
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

  // organization_units 테이블 (조직 단위/부서)
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS organization_units (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100),
      parent_id UUID REFERENCES organization_units(id) ON DELETE RESTRICT,
      level INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      metadata JSONB,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // organization_roles 테이블 (조직 내 역할 정의)
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS organization_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      role_name VARCHAR(255) NOT NULL,
      display_name VARCHAR(255),
      description TEXT,
      permissions JSONB,
      is_default BOOLEAN NOT NULL DEFAULT false,
      metadata JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organization_id, role_name)
    );
  `);

  logger.info('Tables created successfully.');
}

/**
 * 인덱스 생성
 */
async function createIndexes(dataSource: any, logger: any): Promise<void> {
  logger.info('Creating indexes...');

  await dataSource.query(`
    -- organizations indexes
    CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations(code);
    CREATE INDEX IF NOT EXISTS idx_organizations_parent_id ON organizations(parent_id);
    CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
    CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);

    -- organization_members indexes
    CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_org_user
      ON organization_members(organization_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
    CREATE INDEX IF NOT EXISTS idx_org_members_is_primary
      ON organization_members(is_primary) WHERE is_primary = true;
    CREATE INDEX IF NOT EXISTS idx_org_members_active
      ON organization_members(organization_id, left_at) WHERE left_at IS NULL;

    -- organization_units indexes
    CREATE INDEX IF NOT EXISTS idx_org_units_org_id ON organization_units(organization_id);
    CREATE INDEX IF NOT EXISTS idx_org_units_parent_id ON organization_units(parent_id);
    CREATE INDEX IF NOT EXISTS idx_org_units_code ON organization_units(code);
    CREATE INDEX IF NOT EXISTS idx_org_units_active ON organization_units(is_active);

    -- organization_roles indexes
    CREATE INDEX IF NOT EXISTS idx_org_roles_org_id ON organization_roles(organization_id);
    CREATE INDEX IF NOT EXISTS idx_org_roles_role_name ON organization_roles(role_name);
    CREATE INDEX IF NOT EXISTS idx_org_roles_default ON organization_roles(is_default) WHERE is_default = true;
  `);

  logger.info('Indexes created successfully.');
}

/**
 * 권한 등록
 */
async function registerPermissions(
  dataSource: any,
  manifest: any,
  logger: any
): Promise<void> {
  logger.info('Registering permissions...');

  // permissions 테이블이 있는지 확인
  const hasPermissionsTable = await dataSource.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'permissions'
    );
  `);

  if (!hasPermissionsTable[0].exists) {
    logger.warn('permissions table does not exist. Skipping permission registration.');
    return;
  }

  for (const perm of manifest.permissions) {
    await dataSource.query(
      `
      INSERT INTO permissions (id, name, description, app_id, category, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING
    `,
      [perm.id, perm.name, perm.description, manifest.appId, perm.category || 'organization']
    );
    logger.info(`Permission registered: ${perm.id}`);
  }

  logger.info('Permissions registered successfully.');
}

/**
 * RoleAssignment 확장
 *
 * scopeType/scopeId 컬럼 추가
 */
async function extendRoleAssignment(
  dataSource: any,
  logger: any
): Promise<void> {
  logger.info('Extending RoleAssignment table...');

  // role_assignments 테이블이 있는지 확인
  const hasRoleAssignmentsTable = await dataSource.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'role_assignments'
    );
  `);

  if (!hasRoleAssignmentsTable[0].exists) {
    logger.warn('role_assignments table does not exist. Skipping RoleAssignment extension.');
    return;
  }

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

// seedDefaultOrganization 함수 제거됨
// 약사회 SaaS는 "지부 → 분회" 2단 구조를 사용하며
// 초기 조직은 Admin 대시보드에서 수동 생성합니다.
