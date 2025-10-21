import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enable pg_trgm extension for trigram-based text search
 * Required for fast LIKE queries and fuzzy search
 */
export class EnablePgTrgmExtension1799999999999 implements MigrationInterface {
  name = 'EnablePgTrgmExtension1799999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    console.log('✅ pg_trgm extension enabled');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS pg_trgm;`);
    console.log('✅ pg_trgm extension removed');
  }
}
