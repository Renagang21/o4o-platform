-- Phase 7-Y Migration Script
-- Migrate cosmetics_routines → cosmetics_partner_routines
--
-- This script transfers routine data from the deprecated CosmeticsRoutine entity
-- to the canonical PartnerRoutine entity in cosmetics-partner-extension.
--
-- Run this AFTER deploying Phase 7-Y code changes.
--
-- Usage:
--   psql -d your_database -f migrate-cosmetics-routines.sql
--
-- IMPORTANT: Always backup before running migrations!
-- pg_dump -t cosmetics_routines your_database > backup_cosmetics_routines.sql

-- Check if source table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cosmetics_routines') THEN
    RAISE NOTICE 'Source table cosmetics_routines does not exist. Migration not needed.';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cosmetics_partner_routines') THEN
    RAISE EXCEPTION 'Target table cosmetics_partner_routines does not exist. Ensure cosmetics-partner-extension is installed.';
  END IF;
END $$;

-- Migration: Insert records that don't already exist in target
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
  -- Map timeOfUse from metadata to routineType
  COALESCE(
    CASE
      WHEN (cr.metadata->>'timeOfUse') = 'both' THEN 'morning'
      WHEN (cr.metadata->>'timeOfUse') IN ('morning', 'evening', 'weekly', 'special') THEN cr.metadata->>'timeOfUse'
      ELSE 'morning'
    END,
    'morning'
  )::varchar(50) as "routineType",
  cr.description,
  -- Map steps array structure
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
  END as steps,
  -- Extract skinType array from metadata
  CASE
    WHEN cr.metadata->'skinType' IS NOT NULL AND jsonb_typeof(cr.metadata->'skinType') = 'array' THEN
      array(SELECT jsonb_array_elements_text(cr.metadata->'skinType'))
    ELSE ARRAY[]::text[]
  END as "skinTypes",
  -- Extract concerns array from metadata
  CASE
    WHEN cr.metadata->'concerns' IS NOT NULL AND jsonb_typeof(cr.metadata->'concerns') = 'array' THEN
      array(SELECT jsonb_array_elements_text(cr.metadata->'concerns'))
    ELSE ARRAY[]::text[]
  END as "skinConcerns",
  COALESCE(cr."viewCount", 0) as "viewCount",
  COALESCE(cr."recommendCount", 0) as "likeCount",  -- Map recommendCount to likeCount
  NULL as "thumbnailUrl",
  -- Preserve remaining metadata
  COALESCE(cr.metadata, '{}'::jsonb) - 'skinType' - 'concerns' - 'timeOfUse' as metadata,
  COALESCE(cr."isPublished", false) as "isPublished",
  cr."createdAt",
  cr."updatedAt",
  CASE WHEN cr."isPublished" THEN cr."updatedAt" ELSE NULL END as "publishedAt"
FROM cosmetics_routines cr
WHERE NOT EXISTS (
  SELECT 1 FROM cosmetics_partner_routines cpr
  WHERE cpr.id = cr.id
)
ON CONFLICT (id) DO NOTHING;

-- Report migration results
DO $$
DECLARE
  source_count INTEGER;
  target_count INTEGER;
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO source_count FROM cosmetics_routines;
  SELECT COUNT(*) INTO target_count FROM cosmetics_partner_routines;

  RAISE NOTICE '=== Migration Complete ===';
  RAISE NOTICE 'Source records (cosmetics_routines): %', source_count;
  RAISE NOTICE 'Target records (cosmetics_partner_routines): %', target_count;
  RAISE NOTICE '';
  RAISE NOTICE 'To verify, run:';
  RAISE NOTICE '  SELECT id, title, "routineType", "skinTypes", "skinConcerns" FROM cosmetics_partner_routines LIMIT 5;';
  RAISE NOTICE '';
  RAISE NOTICE 'After verification, you may optionally drop the old table:';
  RAISE NOTICE '  DROP TABLE cosmetics_routines;';
END $$;
