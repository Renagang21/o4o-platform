import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enable pg_trgm extension for trigram-based text search
 * Required for fast LIKE queries and fuzzy search
 */
export class EnablePgTrgmExtension1800000000002 implements MigrationInterface {
  name = 'EnablePgTrgmExtension1800000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS pg_trgm;`);
  }
}
