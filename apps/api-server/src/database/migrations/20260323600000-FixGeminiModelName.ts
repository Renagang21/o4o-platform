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

    // ai_engines
    try {
      await queryRunner.query(
        `UPDATE ai_engines SET slug = 'gemini-2.5-flash', name = 'Gemini 2.5 Flash' WHERE slug = 'gemini-3.0-flash'`,
      );
    } catch { /* table may not exist */ }

    // ai_query_policies
    try {
      await queryRunner.query(
        `UPDATE ai_query_policies SET default_model = 'gemini-2.5-flash' WHERE default_model = 'gemini-3.0-flash'`,
      );
    } catch { /* table may not exist */ }

    // ai_llm_policies
    try {
      await queryRunner.query(
        `UPDATE ai_llm_policies SET model = 'gemini-2.5-flash' WHERE model = 'gemini-3.0-flash'`,
      );
    } catch { /* table may not exist */ }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE ai_model_settings SET model = 'gemini-3.0-flash' WHERE model = 'gemini-2.5-flash'`,
    );
  }
}
