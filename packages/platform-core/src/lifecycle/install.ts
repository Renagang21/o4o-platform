/**
 * Platform-Core Install Hook
 *
 * Creates platform core tables:
 * - app_registry
 * - settings
 * - account_activities
 */

import type { DataSource } from 'typeorm';

export interface InstallContext {
  dataSource: DataSource;
  organizationId?: string;
  config?: Record<string, any>;
}

export async function install(context: InstallContext): Promise<void> {
  const { dataSource } = context;
  console.log('[platform-core] Installing...');

  try {
    await createTables(dataSource);
    await createIndexes(dataSource);
    await seedDefaultSettings(dataSource);

    console.log('[platform-core] Installation complete');
    console.log('[platform-core] Tables created:');
    console.log('  - app_registry');
    console.log('  - settings');
    console.log('  - account_activities');
  } catch (error) {
    console.error('[platform-core] Installation failed:', error);
    throw error;
  }
}

/**
 * Create Platform-Core tables
 */
async function createTables(dataSource: DataSource): Promise<void> {
  // ============================================
  // 1. app_registry table
  // ============================================
  await dataSource.query(`
    DO $$ BEGIN
      CREATE TYPE app_status AS ENUM ('installed', 'active', 'inactive', 'error', 'pending');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS app_registry (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      app_id VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      version VARCHAR(50) NOT NULL,
      status app_status DEFAULT 'installed',
      type VARCHAR(50) DEFAULT 'extension',
      category VARCHAR(50),
      description TEXT,
      manifest JSONB,
      config JSONB DEFAULT '{}',
      installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      activated_at TIMESTAMP,
      last_error TEXT,
      error_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('[platform-core] Created app_registry table');

  // ============================================
  // 2. settings table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      key VARCHAR(255) NOT NULL UNIQUE,
      value JSONB,
      type VARCHAR(50) DEFAULT 'string',
      category VARCHAR(100) DEFAULT 'general',
      description TEXT,
      is_public BOOLEAN DEFAULT false,
      is_system BOOLEAN DEFAULT false,
      app_id VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('[platform-core] Created settings table');

  // ============================================
  // 3. account_activities table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS account_activities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100),
      entity_id VARCHAR(255),
      details JSONB,
      ip_address VARCHAR(50),
      user_agent TEXT,
      session_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('[platform-core] Created account_activities table');
}

/**
 * Create indexes for Platform-Core tables
 */
async function createIndexes(dataSource: DataSource): Promise<void> {
  console.log('[platform-core] Creating indexes...');

  await dataSource.query(`
    -- app_registry indexes
    CREATE INDEX IF NOT EXISTS idx_app_registry_app_id ON app_registry(app_id);
    CREATE INDEX IF NOT EXISTS idx_app_registry_status ON app_registry(status);
    CREATE INDEX IF NOT EXISTS idx_app_registry_type ON app_registry(type);

    -- settings indexes
    CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
    CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
    CREATE INDEX IF NOT EXISTS idx_settings_app_id ON settings(app_id);
    CREATE INDEX IF NOT EXISTS idx_settings_is_public ON settings(is_public);

    -- account_activities indexes
    CREATE INDEX IF NOT EXISTS idx_account_activities_user ON account_activities(user_id);
    CREATE INDEX IF NOT EXISTS idx_account_activities_action ON account_activities(action);
    CREATE INDEX IF NOT EXISTS idx_account_activities_entity ON account_activities(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_account_activities_created ON account_activities(created_at);
  `);

  console.log('[platform-core] Indexes created successfully');
}

/**
 * Seed default platform settings
 */
async function seedDefaultSettings(dataSource: DataSource): Promise<void> {
  console.log('[platform-core] Seeding default settings...');

  const defaultSettings = [
    {
      key: 'platform.name',
      value: JSON.stringify('O4O Platform'),
      type: 'string',
      category: 'general',
      description: '플랫폼 이름',
      is_public: true,
      is_system: true,
    },
    {
      key: 'platform.language',
      value: JSON.stringify('ko'),
      type: 'string',
      category: 'general',
      description: '기본 언어',
      is_public: true,
      is_system: true,
    },
    {
      key: 'platform.timezone',
      value: JSON.stringify('Asia/Seoul'),
      type: 'string',
      category: 'general',
      description: '기본 시간대',
      is_public: true,
      is_system: true,
    },
    {
      key: 'platform.activityLogRetention',
      value: JSON.stringify(90),
      type: 'number',
      category: 'system',
      description: '활동 로그 보존 기간(일)',
      is_public: false,
      is_system: true,
    },
  ];

  for (const setting of defaultSettings) {
    await dataSource.query(`
      INSERT INTO settings (key, value, type, category, description, is_public, is_system, app_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'platform-core')
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        type = EXCLUDED.type,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        updated_at = CURRENT_TIMESTAMP
    `, [setting.key, setting.value, setting.type, setting.category, setting.description, setting.is_public, setting.is_system]);
  }

  console.log('[platform-core] Default settings created');
}

export default install;
