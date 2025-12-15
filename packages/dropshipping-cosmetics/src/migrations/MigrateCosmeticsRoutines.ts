/**
 * Phase 7-Y Migration: CosmeticsRoutine → PartnerRoutine
 *
 * This TypeORM migration transfers routine data from the deprecated
 * cosmetics_routines table to the canonical cosmetics_partner_routines table.
 *
 * Run with: npx typeorm migration:run
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateCosmeticsRoutines1734278400000 implements MigrationInterface {
  name = 'MigrateCosmeticsRoutines1734278400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if source table exists
    const sourceExists = await queryRunner.hasTable('cosmetics_routines');
    if (!sourceExists) {
      console.log('Source table cosmetics_routines does not exist. Migration skipped.');
      return;
    }

    // Check if target table exists
    const targetExists = await queryRunner.hasTable('cosmetics_partner_routines');
    if (!targetExists) {
      throw new Error(
        'Target table cosmetics_partner_routines does not exist. ' +
          'Ensure cosmetics-partner-extension is installed first.'
      );
    }

    // Count source records
    const sourceCount = await queryRunner.query(
      'SELECT COUNT(*) as count FROM cosmetics_routines'
    );
    console.log(`Found ${sourceCount[0]?.count || 0} records to migrate`);

    // Migrate records
    await queryRunner.query(`
      INSERT INTO cosmetics_partner_routines (
        id,
        "partnerId",
        title,
        "routineType",
        description,
        steps,
        "skinTypes",
        "skinConcerns",
        "viewCount",
        "likeCount",
        "thumbnailUrl",
        metadata,
        "isPublished",
        "createdAt",
        "updatedAt",
        "publishedAt"
      )
      SELECT
        cr.id,
        cr."partnerId",
        cr.title,
        COALESCE(
          CASE
            WHEN (cr.metadata->>'timeOfUse') = 'both' THEN 'morning'
            WHEN (cr.metadata->>'timeOfUse') IN ('morning', 'evening', 'weekly', 'special') THEN cr.metadata->>'timeOfUse'
            ELSE 'morning'
          END,
          'morning'
        )::varchar(50),
        cr.description,
        CASE
          WHEN jsonb_typeof(cr.steps) = 'array' THEN
            (SELECT jsonb_agg(
              jsonb_build_object(
                'order', COALESCE((step->>'orderInRoutine')::int, (step->>'step')::int, idx),
                'productId', COALESCE(step->'product'->>'id', step->>'productId', ''),
                'description', COALESCE(step->>'description', step->>'category', ''),
                'quantity', step->>'quantity',
                'duration', step->>'duration'
              )
            ) FROM jsonb_array_elements(cr.steps) WITH ORDINALITY AS s(step, idx))
          ELSE '[]'::jsonb
        END,
        CASE
          WHEN cr.metadata->'skinType' IS NOT NULL AND jsonb_typeof(cr.metadata->'skinType') = 'array' THEN
            array(SELECT jsonb_array_elements_text(cr.metadata->'skinType'))
          ELSE ARRAY[]::text[]
        END,
        CASE
          WHEN cr.metadata->'concerns' IS NOT NULL AND jsonb_typeof(cr.metadata->'concerns') = 'array' THEN
            array(SELECT jsonb_array_elements_text(cr.metadata->'concerns'))
          ELSE ARRAY[]::text[]
        END,
        COALESCE(cr."viewCount", 0),
        COALESCE(cr."recommendCount", 0),
        NULL,
        COALESCE(cr.metadata, '{}'::jsonb) - 'skinType' - 'concerns' - 'timeOfUse',
        COALESCE(cr."isPublished", false),
        cr."createdAt",
        cr."updatedAt",
        CASE WHEN cr."isPublished" THEN cr."updatedAt" ELSE NULL END
      FROM cosmetics_routines cr
      WHERE NOT EXISTS (
        SELECT 1 FROM cosmetics_partner_routines cpr
        WHERE cpr.id = cr.id
      )
      ON CONFLICT (id) DO NOTHING
    `);

    // Count target records after migration
    const targetCount = await queryRunner.query(
      'SELECT COUNT(*) as count FROM cosmetics_partner_routines'
    );
    console.log(`Migration complete. Target table now has ${targetCount[0]?.count || 0} records`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration is data-only and not reversible
    // The old table is preserved unless manually dropped
    console.log(
      'Down migration not supported. ' +
        'cosmetics_routines table is preserved. ' +
        'Migrated data in cosmetics_partner_routines must be manually removed if needed.'
    );
  }
}
