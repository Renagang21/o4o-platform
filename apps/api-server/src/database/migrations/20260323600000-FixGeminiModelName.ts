import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-GLYCOPHARM-CARE-AI-PROVIDER-ERROR-FIX-V1
 *
 * Fix invalid model identifier: gemini-3.0-flash → gemini-2.5-flash.
 * Google API does not recognise "gemini-3.0-flash"; the stable production
 * model is "gemini-2.5-flash".
 */
export class FixGeminiModelName1711209600000 implements MigrationInterface {
  name = 'FixGeminiModelName1711209600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ai_model_settings
    const r1 = await queryRunner.query(
      `UPDATE ai_model_settings SET model = 'gemini-2.5-flash' WHERE model = 'gemini-3.0-flash'`,
    );
    console.log(`[Migration] ai_model_settings: ${r1?.[1] ?? 0} row(s) updated`);

    // Use PL/pgSQL EXCEPTION handler to avoid poisoning the PostgreSQL transaction
    // (JavaScript try/catch does NOT prevent PG transaction abort on missing table)

    // ai_engines
    await queryRunner.query(`
      DO $$ BEGIN
        UPDATE ai_engines SET slug = 'gemini-2.5-flash', name = 'Gemini 2.5 Flash'
        WHERE slug = 'gemini-3.0-flash';
      EXCEPTION WHEN undefined_table THEN NULL;
      WHEN unique_violation THEN NULL;
      END $$;
    `);

    // ai_query_policies
    await queryRunner.query(`
      DO $$ BEGIN
        UPDATE ai_query_policies SET default_model = 'gemini-2.5-flash'
        WHERE default_model = 'gemini-3.0-flash';
      EXCEPTION WHEN undefined_table THEN NULL;
      END $$;
    `);

    // ai_llm_policies
    await queryRunner.query(`
      DO $$ BEGIN
        UPDATE ai_llm_policies SET model = 'gemini-2.5-flash'
        WHERE model = 'gemini-3.0-flash';
      EXCEPTION WHEN undefined_table THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE ai_model_settings SET model = 'gemini-3.0-flash' WHERE model = 'gemini-2.5-flash'`,
    );
  }
}
