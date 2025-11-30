import { InstallContext } from '../types/context';
import { Organization } from '../entities/Organization';

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

/**
 * 초기 조직 생성
 *
 * 최상위 조직 (본부) 생성
 */
async function seedDefaultOrganization(
  dataSource: any,
  logger: any
): Promise<void> {
  logger.info('Seeding default organization...');

  const orgRepo = dataSource.getRepository(Organization);

  const existing = await orgRepo.findOne({ where: { code: 'NATIONAL' } });
  if (existing) {
    logger.info('Default organization already exists.');
    return;
  }

  const org = new Organization();
  org.name = '본부';
  org.code = 'NATIONAL';
  org.type = 'national';
  org.level = 0;
  org.path = '/national';
  org.isActive = true;
  org.childrenCount = 0;

  await orgRepo.save(org);
  logger.info('Default organization created: 본부 (NATIONAL)');
}
