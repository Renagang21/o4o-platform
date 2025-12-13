import { InstallContext } from '../types/context.js';

/**
 * Install Hook
 *
 * digital-signage-core 앱 설치 시 실행됩니다.
 * - 테이블 생성 (7 tables)
 * - 기본 설정 초기화
 */
export async function install(context: InstallContext): Promise<void> {
  const { dataSource, manifest, logger } = context;

  logger.info(`[${manifest.appId}] Installing...`);

  try {
    // 1. Create all Signage tables
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
  logger.info('Creating Digital Signage tables...');

  // MediaSource table
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS signage_media_source (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" UUID NOT NULL,
      "ownerUserId" UUID,
      name VARCHAR(255) NOT NULL,
      "sourceType" VARCHAR(100) NOT NULL,
      "sourceUrl" VARCHAR(2000),
      "mimeType" VARCHAR(100),
      "durationSeconds" INT,
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // MediaList table
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS signage_media_list (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" UUID NOT NULL,
      "ownerUserId" UUID,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255),
      description TEXT,
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // MediaListItem table
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS signage_media_list_item (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "mediaListId" UUID NOT NULL,
      "mediaSourceId" UUID NOT NULL,
      "sortOrder" INT DEFAULT 0,
      "displayDurationSeconds" INT,
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Display table
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS signage_display (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" UUID NOT NULL,
      "ownerUserId" UUID,
      name VARCHAR(255) NOT NULL,
      "deviceCode" VARCHAR(255),
      status VARCHAR(100) DEFAULT 'offline',
      "widthPx" INT,
      "heightPx" INT,
      "lastHeartbeat" TIMESTAMP,
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // DisplaySlot table
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS signage_display_slot (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "displayId" UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      "positionX" INT DEFAULT 0,
      "positionY" INT DEFAULT 0,
      "widthPx" INT,
      "heightPx" INT,
      "zIndex" INT DEFAULT 0,
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Schedule table
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS signage_schedule (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" UUID NOT NULL,
      "ownerUserId" UUID,
      name VARCHAR(255) NOT NULL,
      "displaySlotId" UUID,
      "mediaListId" UUID,
      "startTime" TIMESTAMP,
      "endTime" TIMESTAMP,
      "recurrenceRule" VARCHAR(100),
      priority INT DEFAULT 0,
      metadata JSONB DEFAULT '{}',
      "isActive" BOOLEAN DEFAULT true,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ActionExecution table
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS signage_action_execution (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" UUID NOT NULL,
      "ownerUserId" UUID,
      "actionType" VARCHAR(100) NOT NULL,
      "displayId" UUID,
      "displaySlotId" UUID,
      "scheduleId" UUID,
      status VARCHAR(100) DEFAULT 'pending',
      "executedAt" TIMESTAMP,
      "completedAt" TIMESTAMP,
      "errorMessage" TEXT,
      metadata JSONB DEFAULT '{}',
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_signage_media_source_org ON signage_media_source("organizationId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_signage_media_list_org ON signage_media_list("organizationId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_signage_media_list_item_list ON signage_media_list_item("mediaListId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_signage_media_list_item_source ON signage_media_list_item("mediaSourceId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_signage_display_org ON signage_display("organizationId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_signage_display_slot_display ON signage_display_slot("displayId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_signage_schedule_org ON signage_schedule("organizationId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_signage_schedule_slot ON signage_schedule("displaySlotId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_signage_schedule_media ON signage_schedule("mediaListId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_signage_action_org ON signage_action_execution("organizationId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_signage_action_display ON signage_action_execution("displayId")`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_signage_action_slot ON signage_action_execution("displaySlotId")`);

  logger.info('Digital Signage tables created successfully.');
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
      [manifest.appId, manifest.displayName, manifest.version, manifest.appType]
    );
  }
}
