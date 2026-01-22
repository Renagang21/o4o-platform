/**
 * Migration: SeedDefaultApps
 *
 * Seeds default apps into app_registry table.
 * These apps are installed and active by default.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

interface DefaultApp {
  appId: string;
  name: string;
  version: string;
  type: 'core' | 'extension' | 'standalone';
}

const DEFAULT_APPS: DefaultApp[] = [
  // Core Apps
  { appId: 'membership-yaksa', name: '회원 관리', version: '1.0.0', type: 'core' },
  { appId: 'annualfee-yaksa', name: '연회비 관리', version: '1.0.0', type: 'core' },
  { appId: 'reporting-yaksa', name: '신상신고 관리', version: '1.0.0', type: 'core' },

  // Signage
  { appId: 'digital-signage', name: 'Digital Signage', version: '1.0.0', type: 'standalone' },
  { appId: 'digital-signage-core', name: 'Digital Signage Core', version: '1.0.0', type: 'core' },

  // Cosmetics
  { appId: 'cosmetics-partner', name: '화장품 파트너', version: '1.0.0', type: 'extension' },

  // Partner
  { appId: 'partnerops', name: 'PartnerOps', version: '1.0.0', type: 'standalone' },
];

export class SeedDefaultApps2026012200002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const app of DEFAULT_APPS) {
      // Check if app already exists
      const exists = await queryRunner.query(
        `SELECT 1 FROM app_registry WHERE "appId" = $1`,
        [app.appId]
      );

      if (exists.length > 0) {
        console.log(`⏭️  ${app.appId} already exists, skipping`);
        continue;
      }

      await queryRunner.query(
        `INSERT INTO app_registry ("appId", "name", "version", "type", "status", "source", "installedAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'active', 'local', NOW(), NOW())`,
        [app.appId, app.name, app.version, app.type]
      );

      console.log(`✅ Installed ${app.appId} (${app.name})`);
    }

    console.log(`✅ Seeded ${DEFAULT_APPS.length} default apps`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const app of DEFAULT_APPS) {
      await queryRunner.query(
        `DELETE FROM app_registry WHERE "appId" = $1`,
        [app.appId]
      );
      console.log(`🗑️  Removed ${app.appId}`);
    }

    console.log(`✅ Removed ${DEFAULT_APPS.length} default apps`);
  }
}
