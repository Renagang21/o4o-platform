import { InstallContext } from '../types/context.js';

/**
 * Install Hook
 *
 * cms-core 앱 설치 시 실행됩니다.
 * - 테이블 생성 (16 tables)
 * - 기본 설정 초기화
 */
export async function install(context: InstallContext): Promise<void> {
  const { dataSource, manifest, logger } = context;

  logger.info(`[${manifest.appId}] Installing...`);

  try {
    // 1. Create all CMS tables
    await createTables(dataSource, logger);

    // 2. Register app in app_registry
    await registerApp(dataSource, manifest);

    logger.info(`[${manifest.appId}] Installed successfully.`);
  } catch (error) {
    logger.error(`[${manifest.appId}] Installation failed:`, error);
    throw error;
  }
}

async function createTables(dataSource: any, logger: any): Promise<void> {
  logger.info('Creating CMS tables...');

  // Template system tables
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS cms_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      type VARCHAR(100) DEFAULT 'page',
      description TEXT,
      content TEXT NOT NULL,
      engine VARCHAR(50) DEFAULT 'handlebars',
      variables JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "sortOrder" INT DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("organizationId", slug)
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS cms_template_parts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" UUID NOT NULL,
      "templateId" UUID,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      type VARCHAR(100) DEFAULT 'partial',
      description TEXT,
      content TEXT NOT NULL,
      variables JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "sortOrder" INT DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("organizationId", slug)
    )
  `);

  /**
   * cms_views table
   * @contract docs/contracts/cms-view-schema.md
   *
   * Schema changes require following the Contract change protocol:
   *   1. Update Contract document first
   *   2. Update this table definition
   *   3. Update api-server View Entity
   */
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS cms_views (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      type VARCHAR(100) DEFAULT 'list',
      description TEXT,
      "templateId" UUID,
      "cptType" VARCHAR(255),
      query JSONB DEFAULT '{}',
      layout JSONB DEFAULT '{}',
      filters JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "sortOrder" INT DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("organizationId", slug)
    )
  `);

  // CPT tables
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS cms_cpt_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      "singularLabel" VARCHAR(255) NOT NULL,
      "pluralLabel" VARCHAR(255) NOT NULL,
      description TEXT,
      icon VARCHAR(50),
      "isPublic" BOOLEAN DEFAULT true,
      "hasArchive" BOOLEAN DEFAULT true,
      hierarchical BOOLEAN DEFAULT true,
      supports JSONB DEFAULT '["title", "editor", "thumbnail"]',
      taxonomies JSONB DEFAULT '[]',
      "rewriteRules" JSONB DEFAULT '{}',
      capabilities JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "sortOrder" INT DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("organizationId", slug)
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS cms_cpt_fields (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "cptTypeId" UUID NOT NULL,
      key VARCHAR(255) NOT NULL,
      label VARCHAR(255) NOT NULL,
      type VARCHAR(100) NOT NULL,
      description TEXT,
      "defaultValue" TEXT,
      placeholder TEXT,
      "isRequired" BOOLEAN DEFAULT false,
      "isSearchable" BOOLEAN DEFAULT true,
      "isUnique" BOOLEAN DEFAULT false,
      validation JSONB DEFAULT '{}',
      options JSONB DEFAULT '{}',
      "conditionalLogic" JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "sortOrder" INT DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("cptTypeId", key)
    )
  `);

  // ACF tables
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS cms_acf_field_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" UUID NOT NULL,
      key VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      location JSONB DEFAULT '[]',
      position VARCHAR(50) DEFAULT 'normal',
      style VARCHAR(50) DEFAULT 'default',
      "labelPlacement" VARCHAR(50) DEFAULT 'default',
      "instructionPlacement" VARCHAR(50) DEFAULT 'default',
      "hideOnScreen" BOOLEAN DEFAULT true,
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "sortOrder" INT DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("organizationId", key)
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS cms_acf_fields (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "fieldGroupId" UUID NOT NULL,
      "parentFieldId" UUID,
      key VARCHAR(255) NOT NULL,
      label VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(100) NOT NULL,
      instructions TEXT,
      required BOOLEAN DEFAULT false,
      "defaultValue" TEXT,
      placeholder TEXT,
      prepend TEXT,
      append TEXT,
      formatting VARCHAR(50),
      "maxLength" INT,
      rows INT,
      choices JSONB DEFAULT '[]',
      "allowNull" BOOLEAN DEFAULT false,
      multiple BOOLEAN DEFAULT false,
      "conditionalLogic" JSONB DEFAULT '{}',
      wrapper JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "sortOrder" INT DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("fieldGroupId", key)
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS cms_acf_values (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" UUID NOT NULL,
      "fieldId" UUID NOT NULL,
      "entityType" VARCHAR(100) NOT NULL,
      "entityId" UUID NOT NULL,
      value TEXT,
      "valueJson" JSONB,
      "rowIndex" INT,
      "subFieldKey" VARCHAR(255),
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("entityType", "entityId", "fieldId")
    )
  `);

  // Settings table
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS cms_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" UUID NOT NULL,
      key VARCHAR(255) NOT NULL,
      value TEXT,
      "valueJson" JSONB,
      type VARCHAR(100) DEFAULT 'string',
      "group" VARCHAR(255),
      label VARCHAR(255),
      description TEXT,
      "isSystem" BOOLEAN DEFAULT false,
      "isEditable" BOOLEAN DEFAULT true,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("organizationId", key)
    )
  `);

  // Menu tables
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS cms_menus (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      description TEXT,
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("organizationId", slug)
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS cms_menu_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "menuId" UUID NOT NULL,
      "parentId" UUID,
      title VARCHAR(255) NOT NULL,
      type VARCHAR(100) NOT NULL,
      url VARCHAR(500),
      "objectId" UUID,
      "objectType" VARCHAR(100),
      target VARCHAR(100),
      "cssClasses" VARCHAR(255),
      icon VARCHAR(255),
      description TEXT,
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "sortOrder" INT DEFAULT 0,
      depth INT DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS cms_menu_locations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      description TEXT,
      "menuId" UUID,
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("organizationId", slug)
    )
  `);

  // Media tables
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS cms_media (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" UUID NOT NULL,
      "folderId" UUID,
      "uploadedBy" UUID,
      title VARCHAR(255) NOT NULL,
      "altText" VARCHAR(255),
      caption TEXT,
      description TEXT,
      type VARCHAR(100) NOT NULL,
      "mimeType" VARCHAR(255) NOT NULL,
      "originalFilename" VARCHAR(500) NOT NULL,
      "fileSize" BIGINT DEFAULT 0,
      width INT,
      height INT,
      duration INT,
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS cms_media_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "mediaId" UUID NOT NULL,
      variant VARCHAR(100) NOT NULL,
      path VARCHAR(1000) NOT NULL,
      url VARCHAR(2000),
      storage VARCHAR(100) NOT NULL,
      "mimeType" VARCHAR(255) NOT NULL,
      "fileSize" BIGINT DEFAULT 0,
      width INT,
      height INT,
      quality INT,
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS cms_media_folders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" UUID NOT NULL,
      "parentId" UUID,
      name VARCHAR(255) NOT NULL,
      path VARCHAR(1000) NOT NULL,
      description TEXT,
      icon VARCHAR(50),
      color VARCHAR(50),
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "sortOrder" INT DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("organizationId", "parentId", name)
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS cms_media_tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      description TEXT,
      color VARCHAR(50),
      "mediaIds" JSONB DEFAULT '[]',
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "sortOrder" INT DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("organizationId", slug)
    )
  `);

  // Create indexes
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_cms_templates_org ON cms_templates("organizationId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_cms_template_parts_org ON cms_template_parts("organizationId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_cms_views_org ON cms_views("organizationId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_cms_cpt_types_org ON cms_cpt_types("organizationId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_cms_acf_field_groups_org ON cms_acf_field_groups("organizationId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_cms_acf_values_org ON cms_acf_values("organizationId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_cms_acf_values_entity ON cms_acf_values("entityType", "entityId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_cms_settings_org ON cms_settings("organizationId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_cms_menus_org ON cms_menus("organizationId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_cms_menu_items_menu ON cms_menu_items("menuId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_cms_menu_locations_org ON cms_menu_locations("organizationId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_cms_media_org ON cms_media("organizationId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_cms_media_folder ON cms_media("folderId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_cms_media_files_media ON cms_media_files("mediaId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_cms_media_folders_org ON cms_media_folders("organizationId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_cms_media_tags_org ON cms_media_tags("organizationId")`);

  logger.info('CMS tables created successfully.');
}

async function registerApp(dataSource: any, manifest: any): Promise<void> {
  // Check if app_registry table exists
  const hasTable = await dataSource.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'app_registry'
    );
  `);

  if (!hasTable[0].exists) {
    return;
  }

  // Check if app already registered
  const existing = await dataSource.query(
    `SELECT id FROM app_registry WHERE "appId" = $1`,
    [manifest.appId]
  );

  if (existing.length === 0) {
    await dataSource.query(
      `
      INSERT INTO app_registry ("appId", name, version, type, status, "installedAt", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, 'installed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
      [manifest.appId, manifest.name, manifest.version, manifest.type]
    );
  }
}
