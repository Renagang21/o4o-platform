import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-GLYCOPHARM-CARE-AI-CHAT-500-FIX-V1
 *
 * Update all AI model settings from deprecated gemini-2.0-flash
 * to gemini-3.0-flash. The older model returns errors from Google API,
 * causing 500 on /api/v1/care/ai-chat and other AI endpoints.
 */
export class UpdateCareAiModelToGemini25Flash1711094400000
  implements MigrationInterface
{
  name = 'UpdateCareAiModelToGemini25Flash1711094400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update all services still on gemini-2.0-flash
    const result = await queryRunner.query(
      `UPDATE ai_model_settings SET model = 'gemini-3.0-flash' WHERE model IN ('gemini-2.0-flash', 'gemini-2.5-flash')`,
    );
    const updated = result?.[1] ?? 0;
    console.log(`[Migration] Updated AI model settings to gemini-3.0-flash: ${updated} row(s)`);

    // Also update ai_engines default if exists
    // Use PL/pgSQL EXCEPTION handler to avoid poisoning the PostgreSQL transaction
    // (JavaScript try/catch does NOT prevent PG transaction abort on unique_violation)
    await queryRunner.query(`
      DO $$ BEGIN
        UPDATE ai_engines SET slug = 'gemini-3.0-flash', name = 'Gemini 3.0 Flash'
        WHERE slug IN ('gemini-2.0-flash', 'gemini-2.5-flash');
      EXCEPTION WHEN unique_violation THEN
        DELETE FROM ai_engines WHERE slug IN ('gemini-2.0-flash', 'gemini-2.5-flash');
      WHEN undefined_table THEN NULL;
      END $$;
    `);

    // Update ai_query_policies default model
    await queryRunner.query(`
      DO $$ BEGIN
        UPDATE ai_query_policies SET default_model = 'gemini-3.0-flash'
        WHERE default_model IN ('gemini-2.0-flash', 'gemini-2.5-flash');
      EXCEPTION WHEN undefined_table THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE ai_model_settings SET model = 'gemini-2.0-flash' WHERE model = 'gemini-3.0-flash'`,
    );
  }
}
