-- Migration: Seed test data for post_meta validation
-- Date: 2025-11-06
-- Purpose: Create sample posts and metadata for testing new architecture
--
-- This script creates:
-- - 5 sample posts with different statuses
-- - Sample metadata entries in post_meta table
-- - ACF-like metadata examples
-- - SEO metadata examples

-- ============================================================================
-- 1. Create sample posts
-- ============================================================================

-- Insert test posts with different statuses
INSERT INTO posts (id, title, slug, content, status, type, excerpt, "publishedAt", "createdAt", "updatedAt")
VALUES
  -- Published post
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Hello World - Testing Post Meta',
    'hello-world-post-meta',
    '{"blocks": [{"type": "paragraph", "data": {"text": "This is a test post to validate the new post_meta architecture."}}]}',
    'publish',
    'post',
    'Testing the new post_meta table structure',
    now(),
    now(),
    now()
  ),

  -- Draft post
  (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Draft Post for Testing',
    'draft-post-testing',
    '{"blocks": []}',
    'draft',
    'post',
    'This post is in draft status',
    NULL,
    now(),
    now()
  ),

  -- Published page
  (
    '00000000-0000-0000-0000-000000000003'::uuid,
    'About Us Page',
    'about-us',
    '{"blocks": [{"type": "heading", "data": {"text": "About Our Company", "level": 1}}]}',
    'publish',
    'page',
    NULL,
    now(),
    now(),
    now()
  ),

  -- Post with rich metadata
  (
    '00000000-0000-0000-0000-000000000004'::uuid,
    'Product Review - Sample ACF',
    'product-review-sample',
    '{"blocks": []}',
    'publish',
    'post',
    'A product review with ACF fields',
    now(),
    now(),
    now()
  ),

  -- SEO optimized post
  (
    '00000000-0000-0000-0000-000000000005'::uuid,
    'SEO Best Practices 2025',
    'seo-best-practices-2025',
    '{"blocks": []}',
    'publish',
    'post',
    'Learn about SEO in 2025',
    now(),
    now(),
    now()
  );

-- ============================================================================
-- 2. Create sample metadata entries
-- ============================================================================

-- SEO metadata for post 1
INSERT INTO post_meta (post_id, meta_key, meta_value)
VALUES
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'seo',
    '{"title": "Hello World - SEO Title", "description": "Meta description for testing", "keywords": ["test", "post_meta", "migration"]}'::jsonb
  ),

  -- ACF-like metadata for post 1
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'acf_author_bio',
    '{"name": "John Doe", "email": "john@example.com", "bio": "Test author"}'::jsonb
  ),

  -- Simple key-value metadata
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'views_count',
    '{"count": 0}'::jsonb
  );

-- Product review ACF fields for post 4
INSERT INTO post_meta (post_id, meta_key, meta_value)
VALUES
  (
    '00000000-0000-0000-0000-000000000004'::uuid,
    'acf_product_details',
    '{
      "product_name": "Sample Product",
      "rating": 4.5,
      "price": 99.99,
      "pros": ["Easy to use", "Good quality"],
      "cons": ["Expensive"],
      "reviewed_date": "2025-11-06"
    }'::jsonb
  ),

  (
    '00000000-0000-0000-0000-000000000004'::uuid,
    'acf_reviewer',
    '{"name": "Jane Smith", "expertise": "Tech Reviews"}'::jsonb
  );

-- SEO metadata for post 5
INSERT INTO post_meta (post_id, meta_key, meta_value)
VALUES
  (
    '00000000-0000-0000-0000-000000000005'::uuid,
    'seo',
    '{
      "title": "SEO Best Practices 2025 - Complete Guide",
      "description": "Comprehensive guide to SEO in 2025 with latest techniques",
      "keywords": ["SEO", "2025", "best practices", "search optimization"],
      "og_image": "https://example.com/seo-guide.jpg",
      "canonical_url": "https://neture.co.kr/seo-best-practices-2025"
    }'::jsonb
  ),

  (
    '00000000-0000-0000-0000-000000000005'::uuid,
    'seo_schema',
    '{
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "SEO Best Practices 2025",
      "datePublished": "2025-11-06"
    }'::jsonb
  );

-- ============================================================================
-- 3. Verification queries
-- ============================================================================

-- Show all posts with their meta count
SELECT
  p.id,
  p.title,
  p.status,
  p.type,
  COUNT(pm.id) as meta_count
FROM posts p
LEFT JOIN post_meta pm ON p.id = pm.post_id
GROUP BY p.id, p.title, p.status, p.type
ORDER BY p.title;

-- Show all metadata entries
SELECT
  p.title,
  pm.meta_key,
  pm.meta_value
FROM post_meta pm
JOIN posts p ON p.id = pm.post_id
ORDER BY p.title, pm.meta_key;

-- Test JSONB containment query
SELECT
  p.title,
  pm.meta_value
FROM posts p
JOIN post_meta pm ON p.id = pm.post_id
WHERE pm.meta_key = 'seo'
  AND pm.meta_value @> '{"keywords": ["SEO"]}'::jsonb;

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
DECLARE
  post_count INT;
  meta_count INT;
BEGIN
  SELECT count(*) INTO post_count FROM posts;
  SELECT count(*) INTO meta_count FROM post_meta;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Test data seeded successfully';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  Posts created: %', post_count;
  RAISE NOTICE '  Metadata entries: %', meta_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Test queries:';
  RAISE NOTICE '  GET /api/v1/posts';
  RAISE NOTICE '  GET /api/v1/posts/00000000-0000-0000-0000-000000000001';
  RAISE NOTICE '  GET /api/v1/posts/00000000-0000-0000-0000-000000000001/meta';
  RAISE NOTICE '  GET /api/v1/posts/00000000-0000-0000-0000-000000000001/meta?key=seo';
  RAISE NOTICE '';
END $$;
