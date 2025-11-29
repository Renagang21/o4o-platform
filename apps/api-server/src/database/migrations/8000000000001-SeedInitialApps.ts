import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SeedInitialApps Migration
 *
 * Seeds app_registry with initial apps that are already deployed:
 * - forum
 * - digitalsignage
 *
 * These apps are installed and active by default to maintain current functionality
 */
export class SeedInitialApps8000000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date();

    // Seed forum app
    await queryRunner.query(
      `
      INSERT INTO app_registry ("appId", "name", "version", "status", "source", "installedAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT ("appId") DO UPDATE
      SET "name" = EXCLUDED."name",
          "version" = EXCLUDED."version",
          "status" = EXCLUDED."status",
          "source" = EXCLUDED."source",
          "updatedAt" = EXCLUDED."updatedAt"
      `,
      ['forum', 'Forum', '1.0.0', 'active', 'local', now, now],
    );

    // Seed digitalsignage app
    await queryRunner.query(
      `
      INSERT INTO app_registry ("appId", "name", "version", "status", "source", "installedAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT ("appId") DO UPDATE
      SET "name" = EXCLUDED."name",
          "version" = EXCLUDED."version",
          "status" = EXCLUDED."status",
          "source" = EXCLUDED."source",
          "updatedAt" = EXCLUDED."updatedAt"
      `,
      ['digitalsignage', 'Digital Signage', '1.0.0', 'active', 'local', now, now],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove seeded apps
    await queryRunner.query(`DELETE FROM app_registry WHERE "appId" IN ('forum', 'digitalsignage')`);
  }
}
