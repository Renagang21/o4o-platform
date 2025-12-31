import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Seed Initial AI References
 *
 * Note: This migration no longer seeds data from docs folder.
 * The ai_references table should be seeded via admin UI or separate seed script.
 *
 * This migration is kept as a no-op for backwards compatibility with
 * existing migration history.
 */
export class SeedInitialAIReferences1835000000001 implements MigrationInterface {
  public async up(_queryRunner: QueryRunner): Promise<void> {
    // No-op: AI references should be seeded via admin UI or seed script
    // This migration previously tried to read from docs folder which
    // is not available in Docker/production environment
    console.log('Migration 1835000000001: AI references seeding skipped (use admin UI)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM ai_references
      WHERE name IN ('blocks-reference', 'shortcode-registry')
    `);
  }
}
