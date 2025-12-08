import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bootstrap Core Schema Migration
 *
 * Creates minimal core tables required for AppStore to function:
 * - app_registry: Track installed apps
 * - users: Core user table
 * - settings: Core settings table
 *
 * This migration is part of the FULL CLEAN RESET MODE (v1.0)
 * After this migration, apps can be installed via AppStore API
 */
export class BootstrapCoreSchema1733750000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create app_registry table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_registry" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "appId" VARCHAR(100) NOT NULL UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "version" VARCHAR(50) NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'installed' CHECK ("status" IN ('installed', 'active', 'inactive')),
        "installedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Create indexes for app_registry
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_app_registry_appId" ON "app_registry" ("appId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_app_registry_status" ON "app_registry" ("status")`);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "name" VARCHAR(255),
        "passwordHash" VARCHAR(255),
        "role" VARCHAR(50) DEFAULT 'user',
        "status" VARCHAR(20) DEFAULT 'active',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Create index for users
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email")`);

    // Create settings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "key" VARCHAR(255) PRIMARY KEY,
        "value" TEXT,
        "type" VARCHAR(50) DEFAULT 'string',
        "description" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "settings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app_registry" CASCADE`);
  }
}
