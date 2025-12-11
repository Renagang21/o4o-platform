/**
 * Auth-Core Install Hook
 *
 * Creates all authentication and RBAC tables:
 * - users
 * - roles
 * - permissions
 * - role_permissions
 * - user_roles
 * - linked_accounts
 * - refresh_tokens
 * - login_attempts
 */

import type { DataSource } from 'typeorm';

export interface InstallContext {
  dataSource: DataSource;
  organizationId?: string;
  config?: Record<string, any>;
}

export async function install(context: InstallContext): Promise<void> {
  const { dataSource } = context;
  console.log('[auth-core] Installing...');

  try {
    // Create extension for UUID generation
    await dataSource.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await createTables(dataSource);
    await createIndexes(dataSource);
    await seedBaseData(dataSource);

    console.log('[auth-core] Installation complete');
    console.log('[auth-core] Tables created:');
    console.log('  - users');
    console.log('  - roles');
    console.log('  - permissions');
    console.log('  - role_permissions');
    console.log('  - user_roles');
    console.log('  - linked_accounts');
    console.log('  - refresh_tokens');
    console.log('  - login_attempts');
  } catch (error) {
    console.error('[auth-core] Installation failed:', error);
    throw error;
  }
}

/**
 * Create Auth-Core tables
 */
async function createTables(dataSource: DataSource): Promise<void> {
  // ============================================
  // 1. users table
  // ============================================
  await dataSource.query(`
    DO $$ BEGIN
      CREATE TYPE user_status AS ENUM ('pending', 'active', 'approved', 'suspended', 'rejected');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await dataSource.query(`
    DO $$ BEGIN
      CREATE TYPE user_role_enum AS ENUM ('super_admin', 'admin', 'staff', 'vendor', 'customer', 'user');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      name VARCHAR(200),
      avatar VARCHAR(500),
      phone VARCHAR(20),
      status user_status DEFAULT 'pending',
      business_info JSONB,
      role user_role_enum DEFAULT 'user',
      roles TEXT DEFAULT 'user',
      active_role_id UUID,
      permissions JSONB DEFAULT '[]',
      is_active BOOLEAN DEFAULT true,
      is_email_verified BOOLEAN DEFAULT false,
      refresh_token_family VARCHAR(255),
      last_login_at TIMESTAMP,
      last_login_ip VARCHAR(50),
      login_attempts INTEGER DEFAULT 0,
      locked_until TIMESTAMP,
      domain VARCHAR(255),
      approved_at TIMESTAMP,
      approved_by VARCHAR(255),
      provider VARCHAR(100),
      provider_id VARCHAR(255),
      reset_password_token VARCHAR(255),
      reset_password_expires TIMESTAMP,
      onboarding_completed BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('[auth-core] Created users table');

  // ============================================
  // 2. roles table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(50) NOT NULL UNIQUE,
      display_name VARCHAR(100) NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      is_system BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('[auth-core] Created roles table');

  // ============================================
  // 3. permissions table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      key VARCHAR(100) NOT NULL UNIQUE,
      description VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL,
      app_id VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('[auth-core] Created permissions table');

  // ============================================
  // 4. role_permissions table (join table)
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );
  `);
  console.log('[auth-core] Created role_permissions table');

  // ============================================
  // 5. user_roles table (join table)
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, role_id)
    );
  `);
  console.log('[auth-core] Created user_roles table');

  // ============================================
  // 6. linked_accounts table (OAuth)
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS linked_accounts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR(50) NOT NULL,
      provider_account_id VARCHAR(255) NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      expires_at TIMESTAMP,
      token_type VARCHAR(50),
      scope TEXT,
      id_token TEXT,
      session_state VARCHAR(255),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider, provider_account_id)
    );
  `);
  console.log('[auth-core] Created linked_accounts table');

  // ============================================
  // 7. refresh_tokens table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(500) NOT NULL UNIQUE,
      family VARCHAR(255),
      expires_at TIMESTAMP NOT NULL,
      is_revoked BOOLEAN DEFAULT false,
      revoked_at TIMESTAMP,
      replaced_by VARCHAR(500),
      user_agent TEXT,
      ip_address VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('[auth-core] Created refresh_tokens table');

  // ============================================
  // 8. login_attempts table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      ip_address VARCHAR(50),
      user_agent TEXT,
      success BOOLEAN DEFAULT false,
      failure_reason VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('[auth-core] Created login_attempts table');
}

/**
 * Create indexes for Auth-Core tables
 */
async function createIndexes(dataSource: DataSource): Promise<void> {
  console.log('[auth-core] Creating indexes...');

  await dataSource.query(`
    -- users indexes
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
    CREATE INDEX IF NOT EXISTS idx_users_domain ON users(domain);

    -- roles indexes
    CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
    CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);

    -- permissions indexes
    CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions(key);
    CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
    CREATE INDEX IF NOT EXISTS idx_permissions_is_active ON permissions(is_active);

    -- linked_accounts indexes
    CREATE INDEX IF NOT EXISTS idx_linked_accounts_user ON linked_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_linked_accounts_provider ON linked_accounts(provider);

    -- refresh_tokens indexes
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

    -- login_attempts indexes
    CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
    CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts(user_id);
    CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
    CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at);
  `);

  console.log('[auth-core] Indexes created successfully');
}

/**
 * Seed base roles and permissions
 */
async function seedBaseData(dataSource: DataSource): Promise<void> {
  console.log('[auth-core] Seeding base data...');

  // Insert base roles
  const baseRoles = [
    {
      name: 'super_admin',
      display_name: '최고 관리자',
      description: '시스템 전체 관리 권한',
      is_system: true,
    },
    {
      name: 'admin',
      display_name: '관리자',
      description: '일반 관리 권한',
      is_system: true,
    },
    {
      name: 'staff',
      display_name: '스태프',
      description: '제한된 관리 권한',
      is_system: true,
    },
    {
      name: 'user',
      display_name: '일반 사용자',
      description: '기본 사용자 권한',
      is_system: true,
    },
  ];

  for (const role of baseRoles) {
    await dataSource.query(`
      INSERT INTO roles (name, display_name, description, is_system)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description
    `, [role.name, role.display_name, role.description, role.is_system]);
  }
  console.log('[auth-core] Base roles created');

  // Insert base permissions
  const basePermissions = [
    // User management
    { key: 'users.view', description: '사용자 조회', category: 'users' },
    { key: 'users.create', description: '사용자 생성', category: 'users' },
    { key: 'users.edit', description: '사용자 수정', category: 'users' },
    { key: 'users.delete', description: '사용자 삭제', category: 'users' },
    { key: 'users.suspend', description: '사용자 정지', category: 'users' },
    { key: 'users.approve', description: '사용자 승인', category: 'users' },

    // Role management
    { key: 'roles.view', description: '역할 조회', category: 'roles' },
    { key: 'roles.create', description: '역할 생성', category: 'roles' },
    { key: 'roles.edit', description: '역할 수정', category: 'roles' },
    { key: 'roles.delete', description: '역할 삭제', category: 'roles' },
    { key: 'roles.assign', description: '역할 할당', category: 'roles' },

    // Admin access
    { key: 'admin.settings', description: '설정 관리', category: 'admin' },
    { key: 'admin.analytics', description: '분석 조회', category: 'admin' },
    { key: 'admin.logs', description: '로그 조회', category: 'admin' },
  ];

  for (const perm of basePermissions) {
    await dataSource.query(`
      INSERT INTO permissions (key, description, category, app_id)
      VALUES ($1, $2, $3, 'auth-core')
      ON CONFLICT (key) DO UPDATE SET
        description = EXCLUDED.description,
        category = EXCLUDED.category
    `, [perm.key, perm.description, perm.category]);
  }
  console.log('[auth-core] Base permissions created');

  // Assign all permissions to super_admin role
  await dataSource.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'super_admin'
    ON CONFLICT DO NOTHING
  `);
  console.log('[auth-core] Assigned all permissions to super_admin');

  console.log('[auth-core] Base data seeding complete');
}

export default install;
