#!/usr/bin/env node
/**
 * Standalone Migration Runner
 * DB 연결 후 migration SQL을 직접 실행
 */

import pg from 'pg';
const { Client } = pg;

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'o4o_user',
  password: process.env.DB_PASSWORD || 'o4o_password123!',
  database: process.env.DB_NAME || 'o4o_platform',
};

const RUN_MIGRATIONS = process.argv.includes('--run');

console.log('🔗 Connecting to database...');
console.log(`   Host: ${config.host}:${config.port}`);
console.log(`   Database: ${config.database}`);
console.log(`   User: ${config.user}`);

const client = new Client(config);

// Core migrations SQL
const MIGRATIONS = [
  {
    name: 'EnableUUID',
    sql: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
  },
  {
    name: 'CreateUsersTable1700000000000',
    sql: `
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" varchar(255) NOT NULL,
        "password" varchar(255) NOT NULL,
        "firstName" varchar(100),
        "lastName" varchar(100),
        "name" varchar(200),
        "avatar" varchar(500),
        "phone" varchar(20),
        "status" varchar NOT NULL DEFAULT 'pending',
        "businessInfo" json,
        "role" varchar NOT NULL DEFAULT 'customer',
        "roles" text NOT NULL DEFAULT 'customer',
        "active_role_id" uuid,
        "domain" varchar(255),
        "permissions" json NOT NULL DEFAULT '[]',
        "isActive" boolean NOT NULL DEFAULT true,
        "isEmailVerified" boolean NOT NULL DEFAULT false,
        "refreshTokenFamily" varchar(255),
        "lastLoginAt" timestamp,
        "lastLoginIp" varchar(50),
        "loginAttempts" integer NOT NULL DEFAULT 0,
        "lockedUntil" timestamp,
        "approvedAt" timestamp,
        "approvedBy" varchar(255),
        "provider" varchar(100),
        "provider_id" varchar(255),
        "reset_password_token" varchar(255),
        "reset_password_expires" timestamp,
        "onboarding_completed" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email");
      CREATE INDEX IF NOT EXISTS "IDX_users_role" ON "users" ("role");
      CREATE INDEX IF NOT EXISTS "IDX_users_isActive" ON "users" ("isActive");
    `
  },
  {
    name: 'AddSettingsTable1737106000000',
    sql: `
      CREATE TABLE IF NOT EXISTS "settings" (
        "key" varchar(100) NOT NULL,
        "value" jsonb,
        "type" varchar(50) NOT NULL,
        "description" text,
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_settings" PRIMARY KEY ("key")
      );

      INSERT INTO "settings" ("key", "type", "value") VALUES
        ('general', 'general', '{"siteName": "O4O Platform", "siteDescription": "Multi-tenant e-commerce platform", "siteUrl": "", "adminEmail": "", "timezone": "Asia/Seoul", "dateFormat": "YYYY-MM-DD", "timeFormat": "HH:mm", "language": "ko", "maintenanceMode": false, "maintenanceMessage": "", "allowRegistration": true, "defaultUserRole": "customer", "requireEmailVerification": true, "enableApiAccess": false, "apiRateLimit": 100}'),
        ('reading', 'reading', '{"homepageType": "latest_posts", "homepageId": null, "postsPerPage": 10, "showSummary": "excerpt", "excerptLength": 200}'),
        ('theme', 'theme', '{"theme": "default", "primaryColor": "#0066cc", "secondaryColor": "#666666", "fontFamily": "system-ui", "fontSize": "16px", "darkMode": false}'),
        ('email', 'email', '{"smtpHost": "", "smtpPort": 587, "smtpUser": "", "smtpPassword": "", "smtpSecure": false, "fromEmail": "", "fromName": ""}')
      ON CONFLICT ("key") DO NOTHING;
    `
  },
  {
    name: 'CreateAppSystemTables1840000000000',
    sql: `
      CREATE TABLE IF NOT EXISTS "apps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug" varchar(100) NOT NULL,
        "name" varchar(255) NOT NULL,
        "provider" varchar(50) NOT NULL,
        "category" varchar(50) NOT NULL,
        "type" varchar(50) NOT NULL DEFAULT 'integration',
        "description" text,
        "icon" varchar(50),
        "version" varchar(20) NOT NULL DEFAULT '1.0.0',
        "manifest" jsonb,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "isSystem" boolean NOT NULL DEFAULT false,
        "author" varchar(255),
        "repositoryUrl" varchar(255),
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_apps" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_apps_slug" UNIQUE ("slug")
      );
      CREATE INDEX IF NOT EXISTS "IDX_apps_provider_category" ON "apps" ("provider", "category");
      CREATE INDEX IF NOT EXISTS "IDX_apps_status" ON "apps" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_apps_slug" ON "apps" ("slug");

      CREATE TABLE IF NOT EXISTS "app_instances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "appId" uuid NOT NULL,
        "businessId" uuid,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "config" jsonb,
        "usageCount" integer NOT NULL DEFAULT 0,
        "installedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_app_instances" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_app_instances_app_business" ON "app_instances" ("appId", "businessId");

      CREATE TABLE IF NOT EXISTS "app_usage_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "appId" uuid NOT NULL,
        "userId" uuid,
        "businessId" uuid,
        "action" varchar(100) NOT NULL,
        "inputTokens" integer,
        "outputTokens" integer,
        "durationMs" integer,
        "status" varchar(20) NOT NULL DEFAULT 'success',
        "errorType" varchar(50),
        "errorMessage" text,
        "requestId" varchar(100),
        "model" varchar(100),
        "metadata" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_app_usage_logs" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_app_usage_logs_app_created" ON "app_usage_logs" ("appId", "createdAt");
    `
  },
  {
    name: 'CreateRolesPermissionsTables',
    sql: `
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(50) NOT NULL,
        "displayName" varchar(100) NOT NULL,
        "description" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "isSystem" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name")
      );
      CREATE INDEX IF NOT EXISTS "IDX_roles_isActive" ON "roles" ("isActive");

      CREATE TABLE IF NOT EXISTS "permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" varchar(100) NOT NULL,
        "description" varchar(255) NOT NULL,
        "category" varchar(50) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_permissions_key" UNIQUE ("key")
      );
      CREATE INDEX IF NOT EXISTS "IDX_permissions_key" ON "permissions" ("key");
      CREATE INDEX IF NOT EXISTS "IDX_permissions_category" ON "permissions" ("category");
      CREATE INDEX IF NOT EXISTS "IDX_permissions_isActive" ON "permissions" ("isActive");

      -- role_permissions join table for Role <-> Permission ManyToMany
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "role_id" uuid NOT NULL,
        "permission_id" uuid NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_role_permissions_role_id" ON "role_permissions" ("role_id");
      CREATE INDEX IF NOT EXISTS "IDX_role_permissions_permission_id" ON "role_permissions" ("permission_id");

      CREATE TABLE IF NOT EXISTS "role_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "roleId" uuid NOT NULL,
        "organizationId" uuid,
        "assignedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "assignedBy" uuid,
        CONSTRAINT "PK_role_assignments" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_role_assignments_user" ON "role_assignments" ("userId");
      CREATE INDEX IF NOT EXISTS "IDX_role_assignments_role" ON "role_assignments" ("roleId");
    `
  },
  {
    name: 'CreateRefreshTokensTable',
    sql: `
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "token" varchar(500) NOT NULL,
        "family" varchar(255),
        "expiresAt" timestamp NOT NULL,
        "isRevoked" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user" ON "refresh_tokens" ("userId");
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_token" ON "refresh_tokens" ("token");
    `
  },
  {
    name: 'CreateLoginAttemptsTable',
    sql: `
      CREATE TABLE IF NOT EXISTS "login_attempts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" varchar(255) NOT NULL,
        "ipAddress" varchar(50),
        "userAgent" text,
        "success" boolean NOT NULL DEFAULT false,
        "failureReason" varchar(255),
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_login_attempts" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_login_attempts_email" ON "login_attempts" ("email");
      CREATE INDEX IF NOT EXISTS "IDX_login_attempts_ip" ON "login_attempts" ("ipAddress");
    `
  },
  {
    name: 'CreateAISettingsTable',
    sql: `
      CREATE TABLE IF NOT EXISTS "ai_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider" varchar(50) NOT NULL,
        "apiKey" varchar(500),
        "isEnabled" boolean NOT NULL DEFAULT false,
        "config" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_ai_settings" PRIMARY KEY ("id")
      );
    `
  },
  {
    name: 'CreateUserRolesJoinTable',
    sql: `
      -- Drop old user_roles table if it has wrong schema
      DROP TABLE IF EXISTS "user_roles";

      -- Create TypeORM ManyToMany join table for User.dbRoles <-> Role
      CREATE TABLE IF NOT EXISTS "user_roles" (
        "user_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id"),
        CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_user_roles_user_id" ON "user_roles" ("user_id");
      CREATE INDEX IF NOT EXISTS "IDX_user_roles_role_id" ON "user_roles" ("role_id");
    `
  },
  {
    name: 'CreateLinkedAccountsTable',
    sql: `
      DO $$ BEGIN
        CREATE TYPE auth_provider AS ENUM ('email', 'google', 'kakao', 'naver');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      CREATE TABLE IF NOT EXISTS "linked_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" varchar NOT NULL,
        "provider" auth_provider NOT NULL,
        "providerId" varchar,
        "email" varchar NOT NULL,
        "displayName" varchar,
        "profileImage" varchar,
        "isVerified" boolean NOT NULL DEFAULT false,
        "isPrimary" boolean NOT NULL DEFAULT false,
        "providerData" json,
        "lastUsedAt" timestamp,
        "linkedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_linked_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_linked_accounts" UNIQUE ("userId", "provider", "providerId")
      );
      CREATE INDEX IF NOT EXISTS "IDX_linked_accounts_userId" ON "linked_accounts" ("userId");
      CREATE INDEX IF NOT EXISTS "IDX_linked_accounts_provider" ON "linked_accounts" ("provider", "providerId");
      CREATE INDEX IF NOT EXISTS "IDX_linked_accounts_email" ON "linked_accounts" ("email");
    `
  },
  {
    name: 'CreateAccountActivitiesTable',
    sql: `
      CREATE TABLE IF NOT EXISTS "account_activities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "type" varchar(50) NOT NULL,
        "ipAddress" varchar(50),
        "userAgent" text,
        "details" json,
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_account_activities" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_account_activities_user_created" ON "account_activities" ("userId", "createdAt");
    `
  },
  {
    name: 'InsertDefaultAdminUser',
    sql: `
      -- Insert admin role if not exists
      INSERT INTO "roles" ("id", "name", "displayName", "description", "isSystem", "isActive")
      VALUES (
        uuid_generate_v4(),
        'admin',
        'Administrator',
        'System administrator with full access',
        true,
        true
      ) ON CONFLICT ("name") DO NOTHING;

      -- Insert default admin user if not exists
      -- Password: admin123! (bcrypt hashed)
      INSERT INTO "users" ("id", "email", "password", "name", "firstName", "lastName", "role", "roles", "status", "isActive", "isEmailVerified")
      VALUES (
        uuid_generate_v4(),
        'admin@o4o.kr',
        '$2a$10$8K1p/a0dL1LXMIgoEDFrwO7VkHvLvhL4yQqpbDf5YcMo1YmwQ6LXS',
        'Admin',
        'Admin',
        'User',
        'admin',
        'admin',
        'active',
        true,
        true
      ) ON CONFLICT ("email") DO NOTHING;
    `
  }
];

async function checkTables() {
  const tablesResult = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  console.log('\n📋 Existing tables:');
  if (tablesResult.rows.length === 0) {
    console.log('   (no tables found)');
  } else {
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
  }

  const appsExists = tablesResult.rows.some(r => r.table_name === 'apps');
  const settingsExists = tablesResult.rows.some(r => r.table_name === 'settings');
  const usersExists = tablesResult.rows.some(r => r.table_name === 'users');

  console.log('\n🔍 Critical tables check:');
  console.log(`   users: ${usersExists ? '✅ exists' : '❌ missing'}`);
  console.log(`   apps: ${appsExists ? '✅ exists' : '❌ missing'}`);
  console.log(`   settings: ${settingsExists ? '✅ exists' : '❌ missing'}`);

  return { appsExists, settingsExists, usersExists, tables: tablesResult.rows };
}

async function runMigrations() {
  console.log('\n🚀 Running migrations...\n');

  for (const migration of MIGRATIONS) {
    try {
      console.log(`   Running: ${migration.name}...`);
      await client.query(migration.sql);
      console.log(`   ✅ ${migration.name} completed`);
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log(`   ⏭️  ${migration.name} skipped (already exists)`);
      } else {
        console.error(`   ❌ ${migration.name} failed:`, error.message);
      }
    }
  }

  console.log('\n✅ Migration run completed');
}

async function run() {
  try {
    await client.connect();
    console.log('✅ Database connected');

    const { appsExists, settingsExists, usersExists } = await checkTables();

    if (RUN_MIGRATIONS) {
      await runMigrations();
      await checkTables();
    } else if (!appsExists || !settingsExists || !usersExists) {
      console.log('\n⚠️  Critical tables are missing!');
      console.log('   Run with --run flag to execute migrations:');
      console.log('   node scripts/run-migration-standalone.mjs --run');
    } else {
      console.log('\n✅ All critical tables exist. Database is initialized.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔒 Connection closed');
  }
}

run();
